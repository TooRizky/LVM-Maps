import type { SbConfig } from '../types';

export async function uploadPhotoToSupabase(
  base64: string,
  mid: number,
  idx: number,
  sbCfg: SbConfig,
  onStatus: (msg: string, type?: string) => void
): Promise<string> {
  if (!base64 || base64.startsWith('http')) return base64;
  if (!sbCfg.url || !sbCfg.key) return base64;

  try {
    const baseUrl = sbCfg.url.replace(/\/$/, '');
    if (!baseUrl.includes('supabase.co') && !baseUrl.includes('supabase.in')) {
      onStatus('⚠️ URL Supabase tidak valid. Format: https://xxx.supabase.co', 'error');
      return base64;
    }

    const mm = base64.match(/data:([^;]+);base64,(.+)/s);
    if (!mm) {
      onStatus('⚠️ Format foto tidak valid.', 'error');
      return base64;
    }

    const mimeType = mm[1];
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const path = `gv/merchant_${mid}/foto_${idx}_${Date.now()}.${ext}`;

    let blob: Blob;
    try {
      const binaryStr = atob(mm[2]);
      const arr = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) arr[i] = binaryStr.charCodeAt(i);
      blob = new Blob([arr], { type: mimeType });
    } catch (convErr) {
      onStatus('⚠️ Gagal konversi foto: ' + (convErr as Error).message, 'error');
      return base64;
    }

    if (blob.size > 5 * 1024 * 1024) {
      onStatus('⚠️ Foto terlalu besar (maks 5MB). Kompres dulu.', 'error');
      return base64;
    }

    onStatus('☁️ Mengupload foto ke Supabase...', 'loading');

    const uploadUrl = `${baseUrl}/storage/v1/object/merchant-photos/${path}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sbCfg.key}`,
        apikey: sbCfg.key,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: blob,
    });

    if (!res.ok) {
      let errDetail = `HTTP ${res.status}`;
      try {
        if (res.status === 400) errDetail = 'Bad request — cek nama bucket (harus "merchant-photos") dan path.';
        if (res.status === 401) errDetail = 'Unauthorized — API Key salah atau sudah expired.';
        if (res.status === 403) errDetail = 'Forbidden — aktifkan RLS policy atau set bucket ke Public.';
        if (res.status === 404) errDetail = 'Bucket "merchant-photos" tidak ditemukan — buat dulu di Supabase Storage.';
        if (res.status === 413) errDetail = 'Foto terlalu besar — kompres dulu atau naikkan limit di Supabase.';
      } catch (_) { /* ignore */ }
      console.error('Supabase upload error:', res.status, errDetail);
      onStatus(`❌ Upload gagal: ${errDetail}`, 'error');
      return base64;
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/merchant-photos/${path}`;
    onStatus('✅ Foto berhasil diupload ke Supabase!');
    console.log('✅ Supabase upload OK:', publicUrl);
    return publicUrl;
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      onStatus('❌ Tidak bisa konek ke Supabase — periksa URL dan koneksi internet.', 'error');
    } else {
      onStatus('❌ Upload error: ' + msg, 'error');
    }
    return base64;
  }
}

export async function testSupabaseConnection(
  sbCfg: SbConfig,
  onStatus: (msg: string, type?: string) => void
): Promise<void> {
  const url = sbCfg.url.trim().replace(/\/$/, '');
  const key = sbCfg.key.trim();
  if (!url || !key) {
    onStatus('⚠️ Isi URL dan Key dulu sebelum test.', 'error');
    return;
  }
  onStatus('🔌 Testing koneksi Supabase...', 'loading');
  try {
    const res = await fetch(`${url}/storage/v1/bucket/merchant-photos`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (res.status === 200) { onStatus('✅ Supabase terhubung! Bucket "merchant-photos" ditemukan.'); return; }
    if (res.status === 404) { onStatus('❌ Bucket "merchant-photos" tidak ada — buat dulu di Supabase Storage.', 'error'); return; }
    if (res.status === 401 || res.status === 403) {
      onStatus('❌ API Key salah atau tidak punya akses. Gunakan anon/service_role key.', 'error');
      return;
    }
    const body = await res.text();
    onStatus(`❌ Status ${res.status}: ${body.substring(0, 80)}`, 'error');
  } catch (e) {
    onStatus('❌ Tidak bisa konek ke Supabase: ' + ((e as Error).message || 'network error'), 'error');
  }
}
