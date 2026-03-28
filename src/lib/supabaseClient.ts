// ════════════════════════════════════════════════════
//  SUPABASE REST API CLIENT
//  Tidak memakai supabase-js untuk menjaga bundle kecil.
//  Semua operasi via PostgREST + Storage REST API.
// ════════════════════════════════════════════════════

const SB_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

export function isConfigured(): boolean {
  return !!(SB_URL && SB_KEY);
}

// ── Headers ──────────────────────────────────────────
function baseHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey:          SB_KEY,
    Authorization:  `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ── Generic fetch with error handling ────────────────
async function sbFetch(
  path: string,
  opts: RequestInit = {}
): Promise<Response> {
  if (!isConfigured()) throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_KEY di .env');
  const res = await fetch(`${SB_URL}${path}`, opts);
  if (!res.ok) {
    let detail = '';
    try { const j = await res.clone().json(); detail = j.message || j.error || ''; } catch { /* ignore */ }
    throw new Error(`[${res.status}] ${detail || res.statusText}`);
  }
  return res;
}

// ════════════════════════════════════════════════════
//  MERCHANT TABLE — CRUD
// ════════════════════════════════════════════════════

export interface MerchantRow {
  id: number;
  nama: string;
  business: string;
  kawasan: string;
  mandiri_rek: string;
  mandiri_edc: string;
  mandiri_qr: string;
  bank_lain_edc: string;
  bank_lain_qr: string;
  visit: string;
  hasil_visit: string;
  keterangan: string;
  photos: string;        // pipe-separated public URLs
  updated_at: string;
}

/** Ambil semua merchant, diurutkan kawasan A-F lalu nama A-Z */
export async function dbFetchAll(): Promise<MerchantRow[]> {
  const res = await sbFetch(
    '/rest/v1/merchants?select=*&order=kawasan.asc,nama.asc',
    { headers: baseHeaders() }
  );
  return res.json() as Promise<MerchantRow[]>;
}

/** Insert atau update merchant berdasarkan id (UPSERT) */
export async function dbUpsert(row: MerchantRow): Promise<void> {
  await sbFetch('/rest/v1/merchants', {
    method: 'POST',
    headers: baseHeaders({
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
  });
}

/** Batch upsert — lebih efisien untuk banyak data sekaligus */
export async function dbUpsertBatch(rows: MerchantRow[]): Promise<void> {
  if (!rows.length) return;
  await sbFetch('/rest/v1/merchants', {
    method: 'POST',
    headers: baseHeaders({
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(rows),
  });
}

/** Hapus merchant berdasarkan id */
export async function dbDelete(id: number): Promise<void> {
  await sbFetch(`/rest/v1/merchants?id=eq.${id}`, {
    method: 'DELETE',
    headers: baseHeaders(),
  });
}

// ════════════════════════════════════════════════════
//  STORAGE — PHOTO UPLOAD
// ════════════════════════════════════════════════════
const BUCKET = 'merchant-photos';

/**
 * Upload foto (base64 data URL) ke Supabase Storage.
 * Mengembalikan public URL jika berhasil, atau base64 asli jika gagal.
 */
export async function dbUploadPhoto(
  base64: string,
  merchantId: number,
  idx: number,
  onStatus: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void
): Promise<string> {
  if (!base64 || base64.startsWith('http')) return base64;
  if (!isConfigured()) return base64;

  const mm = base64.match(/data:([^;]+);base64,(.+)/s);
  if (!mm) { onStatus('⚠️ Format foto tidak valid.', 'error'); return base64; }

  const mimeType = mm[1];
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `gv/merchant_${merchantId}/foto_${idx}_${Date.now()}.${ext}`;

  let blob: Blob;
  try {
    const bytes = atob(mm[2]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    blob = new Blob([arr], { type: mimeType });
  } catch (e) {
    onStatus('⚠️ Gagal konversi foto: ' + (e as Error).message, 'error');
    return base64;
  }

  if (blob.size > 5 * 1024 * 1024) {
    onStatus('⚠️ Foto terlalu besar (maks 5MB)', 'error');
    return base64;
  }

  onStatus('☁️ Mengupload foto ke Supabase…', 'loading');

  try {
    const res = await fetch(
      `${SB_URL}/storage/v1/object/${BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SB_KEY}`,
          apikey:        SB_KEY,
          'Content-Type': mimeType,
          'x-upsert':    'true',
        },
        body: blob,
      }
    );

    if (!res.ok) {
      const errMap: Record<number, string> = {
        400: 'Bad request — cek nama bucket "merchant-photos"',
        401: 'Unauthorized — API Key salah atau expired',
        403: 'Forbidden — set bucket ke Public atau tambah RLS policy',
        404: 'Bucket "merchant-photos" tidak ditemukan — buat dulu di Storage',
        413: 'Foto terlalu besar — kompres dulu',
      };
      const msg = errMap[res.status] || `HTTP ${res.status}`;
      onStatus(`❌ Upload gagal: ${msg}`, 'error');
      return base64;
    }

    const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    onStatus('✅ Foto berhasil diupload!');
    return publicUrl;
  } catch (e) {
    const msg = (e as Error).message || '';
    onStatus(
      msg.includes('Failed to fetch')
        ? '❌ Tidak bisa konek Supabase — periksa URL dan koneksi'
        : `❌ Upload error: ${msg}`,
      'error'
    );
    return base64;
  }
}

/** Delete foto dari Storage berdasarkan path dalam URL */
export async function dbDeletePhoto(publicUrl: string): Promise<void> {
  if (!publicUrl.startsWith('http')) return;
  // Extract path dari URL: .../object/public/merchant-photos/PATH
  const marker = `/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const filePath = publicUrl.slice(idx + marker.length);
  try {
    await sbFetch(`/storage/v1/object/${BUCKET}/${filePath}`, {
      method: 'DELETE',
      headers: baseHeaders(),
    });
  } catch {
    /* foto gagal dihapus dari storage — biarkan saja (sudah tidak terhubung di DB) */
  }
}

/** Test koneksi ke Supabase (cek bucket) */
export async function dbTestConnection(
  onStatus: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void
): Promise<void> {
  onStatus('🔌 Testing koneksi Supabase…', 'loading');
  try {
    const res = await fetch(`${SB_URL}/storage/v1/bucket/${BUCKET}`, {
      headers: baseHeaders(),
    });
    if (res.status === 200)  { onStatus(`✅ Terhubung! Bucket "${BUCKET}" ditemukan.`); return; }
    if (res.status === 404)  { onStatus(`❌ Bucket "${BUCKET}" tidak ada — buat dulu di Supabase Storage.`, 'error'); return; }
    if (res.status === 401 || res.status === 403) {
      onStatus('❌ API Key salah atau tidak punya akses.', 'error'); return;
    }
    onStatus(`❌ Status ${res.status}`, 'error');
  } catch (e) {
    onStatus('❌ Tidak bisa konek: ' + (e as Error).message, 'error');
  }
}
