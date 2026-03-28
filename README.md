# 🗺️ LVM-Maps — Mapping Merchant (Full Supabase Edition)

Aplikasi mapping merchant internal **Bank Mandiri Cab. Green Ville 16500**.
Dibangun dengan **React + Vite + TypeScript**, menggunakan **Supabase** sebagai
database dan storage satu-satunya (tidak lagi memakai Google Apps Script).

---

## 📁 Struktur Proyek

```
lvm-maps/
├── public/
│   └── mandiri-icon.png       ← Taruh logo Mandiri di sini (lihat bagian Favicon)
├── src/
│   ├── components/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   ← Denah kawasan + statistik
│   │   │   └── ListPage.tsx        ← Daftar merchant + filter
│   │   ├── modals/
│   │   │   ├── AddModal.tsx        ← Form tambah merchant
│   │   │   └── EditModal.tsx       ← Form edit merchant (bug fix: visit/keterangan)
│   │   ├── BottomNav.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FilterPanel.tsx         ← Filter by nama merchant (fitur baru)
│   │   ├── Header.tsx              ← Tombol Sync + Export Excel
│   │   ├── Lightbox.tsx
│   │   ├── MerchantCard.tsx        ← Card read-only, edit via modal
│   │   ├── StatsStrip.tsx
│   │   ├── SyncBar.tsx
│   │   └── Toast.tsx
│   ├── context/
│   │   └── AppContext.tsx          ← Global state, semua operasi Supabase
│   ├── lib/
│   │   ├── constants.ts            ← Warna kawasan, emoji, tipe bisnis
│   │   ├── exportExcel.ts          ← Export xlsx dari Supabase + link foto
│   │   ├── merchantUtils.ts        ← Filter, stats, sort
│   │   ├── storage.ts              ← localStorage (offline cache saja)
│   │   └── supabaseClient.ts       ← REST API client (CRUD + Storage)
│   ├── types/index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env                    ← Buat dari .env.example (JANGAN di-commit)
├── .env.example
├── .gitignore
├── index.html
└── package.json
```

---

## 🚀 Quick Start

```bash
# 1. Clone repo
gh repo clone TooRizky/lvm-maps
cd lvm-maps

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# → Edit .env, isi VITE_SUPABASE_URL dan VITE_SUPABASE_KEY

# 4. Jalankan
npm run dev
# Buka http://localhost:5173
```

---

## 🗄️ Setup Supabase — Langkah Lengkap

### Step 1 — Buat Project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Pilih nama project, password database, dan region **Southeast Asia (Singapore)**
3. Tunggu project selesai dibuat (~2 menit)

---

### Step 2 — Buat Tabel `merchants`

Buka **SQL Editor** di Supabase Dashboard, lalu jalankan SQL berikut:

```sql
-- ═══════════════════════════════════════════════════════════
--  LVM-MAPS — Tabel merchants
--  Jalankan di Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.merchants (
  id            BIGINT          PRIMARY KEY,
  nama          TEXT            NOT NULL DEFAULT '',
  business      TEXT            NOT NULL DEFAULT '',
  kawasan       TEXT            NOT NULL DEFAULT '',
  mandiri_rek   TEXT            NOT NULL DEFAULT '',
  mandiri_edc   TEXT            NOT NULL DEFAULT '',
  mandiri_qr    TEXT            NOT NULL DEFAULT '',
  bank_lain_edc TEXT            NOT NULL DEFAULT '',
  bank_lain_qr  TEXT            NOT NULL DEFAULT '',
  visit         TEXT            NOT NULL DEFAULT '',
  hasil_visit   TEXT            NOT NULL DEFAULT '',
  keterangan    TEXT            NOT NULL DEFAULT '',
  photos        TEXT            NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Index untuk sorting (kawasan A-F, lalu nama A-Z)
CREATE INDEX IF NOT EXISTS merchants_kawasan_nama_idx
  ON public.merchants (kawasan ASC, nama ASC);

-- Index untuk lookup cepat per kawasan
CREATE INDEX IF NOT EXISTS merchants_kawasan_idx
  ON public.merchants (kawasan);

-- Trigger auto-update kolom updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### Step 3 — Aktifkan Row Level Security (RLS)

```sql
-- Aktifkan RLS pada tabel merchants
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Policy: izinkan semua operasi dari anon key
-- (Cocok untuk aplikasi internal tim, tidak perlu login)
CREATE POLICY "Allow all for anon"
  ON public.merchants
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
```

> **Catatan keamanan:** Policy di atas cocok untuk aplikasi internal tim.
> Jika butuh autentikasi per-user, ganti `TO anon` dengan `TO authenticated`
> dan tambahkan kolom `user_id` pada tabel.

---

### Step 4 — Buat Storage Bucket untuk Foto

1. Di Supabase Dashboard, buka **Storage**
2. Klik **New Bucket**
3. Isi:
   - Name: `merchant-photos`
   - Public bucket: **✅ AKTIFKAN** (agar URL foto bisa diakses langsung)
4. Klik **Create bucket**

Lalu set policy Storage agar bisa upload:

```sql
-- Policy Storage: izinkan upload dari anon
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES
  ('Allow anon upload',  'merchant-photos', 'INSERT', 'true'),
  ('Allow anon read',    'merchant-photos', 'SELECT', 'true'),
  ('Allow anon delete',  'merchant-photos', 'DELETE', 'true');
```

Atau via Dashboard: **Storage → merchant-photos → Policies → New Policy → Full access → Save**

---

### Step 5 — Ambil API Keys

1. Buka **Settings → API**
2. Copy:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### Step 6 — Isi File `.env`

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **JANGAN commit file `.env`!** File ini sudah ada di `.gitignore`.

---

## 🔑 Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Project URL dari Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_KEY` | ✅ | `anon public` key dari Supabase Dashboard → Settings → API |

> Semua variabel harus diawali `VITE_` agar dapat diakses oleh Vite/React di sisi client.

---

## 🗃️ Skema Database — Detail Kolom

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `BIGINT` PK | ID unik merchant (auto dari app, mulai 300) |
| `nama` | `TEXT` | Nama toko / merchant |
| `business` | `TEXT` | Tipe bisnis: `F&B`, `PERDAGANGAN`, `JASA`, `HEALTHCARE`, `EDUCATION`, `COMPANY`, `SUPERMARKET`, `IBADAH`, `OTHER` |
| `kawasan` | `TEXT` | Kawasan: `A`, `B`, `C`, `D`, `E`, `F` |
| `mandiri_rek` | `TEXT` | Rekening Mandiri: `'V'` atau `''` |
| `mandiri_edc` | `TEXT` | EDC Mandiri: `'V'` atau `''` |
| `mandiri_qr` | `TEXT` | QR/QRIS Mandiri: `'V'` atau `''` |
| `bank_lain_edc` | `TEXT` | EDC Bank Lain: `'V'` atau `''` |
| `bank_lain_qr` | `TEXT` | QR Bank Lain: `'V'` atau `''` |
| `visit` | `TEXT` | Status visit: `'SUDAH'` atau `''` |
| `hasil_visit` | `TEXT` | Catatan hasil kunjungan: `FOLLOW UP`, `SUDAH`, `TIDAK BERMINAT`, dsb |
| `keterangan` | `TEXT` | Catatan bebas: EDC BCA, ANCHOR, dsb |
| `photos` | `TEXT` | Public URL foto, dipisah pipe `\|`. Contoh: `https://...jpg\|https://...jpg` |
| `updated_at` | `TIMESTAMPTZ` | Auto-update via trigger |

---

## 🔄 Arsitektur & Alur Data

```
Supabase PostgreSQL (source of truth)
       ↕  REST API (PostgREST)
AppContext.tsx
  ├── Saat mount: dbFetchAll() → setMerchants() + setPhotos()
  ├── Add merchant: optimistic update lokal → upload foto Storage → dbUpsert()
  ├── Edit merchant: optimistic update lokal → dbUpsert()
  ├── Delete: optimistic update lokal → dbDelete()
  ├── Add foto: preview lokal → dbUploadPhoto() Storage → dbUpsert() (update photos field)
  └── Sync button: dbFetchAll() → setMerchants() + setPhotos()
       ↕
localStorage (offline cache — bukan source of truth)
  • saveMerchants() / loadMerchants() → gv_v4b
  • savePhotos() / loadPhotos() → gv_photos_v4b
  • Dipakai saat offline atau Supabase tidak terkonfigurasi
```

**Optimistic Updates:** Setiap operasi CRUD langsung update UI lokal terlebih dahulu,
kemudian sync ke Supabase di background. Jika Supabase gagal, tampil error di SyncBar
tanpa mengganggu tampilan.

---

## 📥 Fitur Export Excel

Tombol **`📥 Excel`** di header menghasilkan file `LVM-Merchant-DD-MM-YYYY.xlsx` dengan:

- **Sheet 1 — Data Merchant:** Semua merchant diurutkan Kawasan A→F, lalu Nama A→Z
- **Sheet 2 — Ringkasan:** Total per kawasan, sudah/belum visit

**Kolom yang diexport:**

| Kolom | Keterangan |
|---|---|
| No | Nomor urut |
| Kawasan | A–F |
| Nama Merchant | Nama toko |
| Tipe Bisnis | F&B, PERDAGANGAN, dsb |
| Rek. Mandiri | ✓ atau - |
| EDC Mandiri | ✓ atau - |
| QR Mandiri | ✓ atau - |
| EDC Bank Lain | ✓ atau - |
| QR Bank Lain | ✓ atau - |
| Status Visit | Sudah Visit / Belum Visit |
| Hasil Visit | Teks hasil kunjungan |
| Keterangan | Catatan bebas |
| **Link Foto** | **URL publik foto dari Supabase Storage** |

> Export selalu mencoba fetch data terbaru dari Supabase terlebih dahulu.
> Jika Supabase tidak tersedia, fallback ke data lokal (tanpa link foto Supabase).

---

## 🐛 Bug Fixes (dari versi sebelumnya)

### Bug 1 — Status Visit berubah jadi "Belum" setelah Edit

**Root cause:** `useEffect` di `EditModal.tsx` menggunakan `[m?.id]` sebagai dependency.
Ketika modal dibuka dua kali untuk merchant yang sama, `m?.id` tidak berubah → `useEffect` tidak re-run → state visit yang sudah diubah user (tapi belum disimpan) masih tertinggal.

**Fix:**
```tsx
// SEBELUM (buggy)
useEffect(() => { if(m) { setVisit(m.visit || ''); } }, [m?.id]);

// SESUDAH (fixed)
useEffect(() => {
  if (!editModalOpen || !m) return;
  setVisit(m.visit || '');           // m.visit → status visit
  setHasilVisit(m.hasil_visit || ''); // m.hasil_visit → hasil kunjungan
  setKeterangan(m.keterangan || ''); // m.keterangan → catatan bebas
}, [editingId, editModalOpen]);      // re-run setiap modal dibuka
```

### Bug 2 — Keterangan masuk ke Hasil Visit

**Root cause:** Urutan field di form tidak konsisten dengan label — user salah mengisi
karena label tidak cukup jelas membedakan "Hasil Visit" dan "Keterangan".

**Fix:** Label dipertegas dengan emoji + deskripsi placeholder yang berbeda:
- `🚶 Status Visit` → dropdown Belum/Sudah
- `📋 Hasil Visit` → teks singkat: FOLLOW UP, SUDAH, TIDAK BERMINAT
- `📝 Keterangan` → catatan bebas: EDC BCA, ANCHOR, dsb

---

## 🖼️ Favicon / Logo Mandiri

Letakkan file logo Mandiri di folder `public/`, lalu aktifkan di `index.html`:

```html
<!-- index.html — uncomment baris ini: -->
<link rel="icon" type="image/png" href="/mandiri-icon.png" />
```

Format yang didukung: `.png` (disarankan 32×32 atau 64×64), `.ico`, `.svg`.

---

## 🛠️ Scripts NPM

| Script | Keterangan |
|---|---|
| `npm run dev` | Development server (`http://localhost:5173`) |
| `npm run build` | Build production ke folder `dist/` |
| `npm run preview` | Preview hasil build |
| `npm run lint` | ESLint check |

---

## 📦 Dependencies

| Package | Keterangan |
|---|---|
| `react` + `react-dom` | UI library |
| `xlsx` | Generate file `.xlsx` untuk export |
| `vite` + `@vitejs/plugin-react` | Build tool & dev server |
| `typescript` | Type safety |

> **Tidak** menggunakan `@supabase/supabase-js` — semua komunikasi Supabase
> melalui REST API langsung (`fetch`) untuk menjaga bundle sekecil mungkin.

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars di Vercel Dashboard:
# Settings → Environment Variables → Add:
#   VITE_SUPABASE_URL = https://xxx.supabase.co
#   VITE_SUPABASE_KEY = eyJ...
```

### Netlify

```bash
npm run build
# Upload folder dist/ ke Netlify
# Atau hubungkan repo GitHub → Auto deploy
# Set env vars di: Site Settings → Environment Variables
```

### Self-hosted (Nginx)

```bash
npm run build
# Copy dist/ ke server
# Nginx config (SPA routing):
# location / { try_files $uri $uri/ /index.html; }
```

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---|---|
| `Supabase belum dikonfigurasi` saat app dibuka | Pastikan `.env` sudah diisi dan dev server di-restart (`npm run dev`) |
| Upload foto gagal: `Bucket tidak ditemukan` | Buat bucket bernama `merchant-photos` di Supabase Storage |
| Upload foto gagal: `Forbidden 403` | Set bucket ke **Public** atau tambah Storage Policy insert untuk anon |
| Data tidak tersimpan: `RLS violation` | Pastikan RLS policy sudah dibuat (lihat Step 3) |
| Export Excel: `Link Foto` kosong semua | Foto tersimpan sebagai base64 lokal, belum diupload ke Supabase Storage |
| `VITE_` env vars tidak terbaca | Restart `npm run dev` setelah ubah `.env` |
| Status Visit berubah jadi Belum setelah Edit | Bug sudah diperbaiki di versi ini (`EditModal.tsx` — fix `useEffect` deps) |
