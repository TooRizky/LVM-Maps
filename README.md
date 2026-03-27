# 🗺️ LVM-Maps — Mapping Merchant React App

Aplikasi mapping merchant internal **Bank Mandiri Cab. Green Ville 16500**, dibangun ulang dari HTML single-file ke **React + Vite + TypeScript** dengan fitur tambahan **Filter by Nama Merchant**.

---

## 📁 Struktur Proyek

```
lvm-maps/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   ← Halaman denah & statistik kawasan
│   │   │   └── ListPage.tsx        ← Halaman daftar merchant
│   │   ├── modals/
│   │   │   ├── AddModal.tsx        ← Modal tambah merchant baru
│   │   │   ├── EditModal.tsx       ← Modal edit merchant
│   │   │   └── SetupModal.tsx      ← Modal konfigurasi URL & Supabase
│   │   ├── BottomNav.tsx           ← Navigasi bawah (mobile) / sidebar (desktop)
│   │   ├── ConfirmDialog.tsx       ← Dialog konfirmasi hapus
│   │   ├── FilterPanel.tsx         ← Panel filter (incl. filter by nama) ⭐NEW
│   │   ├── Header.tsx              ← Header + search bar + kawasan tabs
│   │   ├── Lightbox.tsx            ← Lightbox preview foto
│   │   ├── MerchantCard.tsx        ← Card merchant dengan expand detail
│   │   ├── StatsStrip.tsx          ← Strip statistik (Total/Visit/Mandiri/Done)
│   │   ├── SyncBar.tsx             ← Bar status sinkronisasi
│   │   └── Toast.tsx               ← Toast notification
│   ├── context/
│   │   └── AppContext.tsx          ← Global state (React Context + hooks)
│   ├── lib/
│   │   ├── constants.ts            ← Konstanta (warna kawasan, emoji, dsb)
│   │   ├── merchantUtils.ts        ← Fungsi filter, stats, status, payload
│   │   ├── storage.ts              ← localStorage read/write helpers
│   │   ├── supabase.ts             ← Upload foto ke Supabase Storage
│   │   └── sync.ts                 ← Komunikasi Google Apps Script API
│   ├── types/
│   │   └── index.ts                ← TypeScript types & interfaces
│   ├── App.tsx
│   ├── App.css
│   ├── index.css                   ← Semua design tokens & CSS global
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env                            ← ❌ JANGAN di-commit (buat dari .env.example)
├── .env.example                    ← ✅ Template env vars
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Clone repo
gh repo clone TooRizky/lvm-maps
cd lvm-maps

# Install dependencies
npm install
```

### 2. Konfigurasi Environment

```bash
# Salin template
cp .env.example .env
```

Buka `.env` dan isi nilai berikut:

```env
VITE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_KEY=your_supabase_anon_key_here
```

> **Catatan:** Jika `.env` tidak diisi, konfigurasi tetap bisa dilakukan secara manual melalui menu **⚙️ Setup** di dalam aplikasi. Data disimpan ke `localStorage`.

### 3. Jalankan Development Server

```bash
npm run dev
```

Buka browser di `http://localhost:5173`

### 4. Build untuk Production

```bash
npm run build
npm run preview   # preview hasil build
```

---

## 🔧 Setup Google Apps Script (Wajib untuk Sync ke Sheets)

### Langkah-langkah:

1. **Buka Google Sheets** → buat spreadsheet baru (beri nama misal `LVM-Merchants`)

2. Klik **Extensions → Apps Script**

3. **Hapus** semua kode default, lalu **tempel** kode berikut:

```javascript
const SHEET_NAME = 'Merchants';

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); initHeaders(sheet); }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ merchants: [] });
  const headers = data[0];
  const merchants = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] !== undefined ? String(row[i]) : '');
    return obj;
  });
  return jsonResponse({ merchants });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); initHeaders(sheet); }

  if (body.action === 'save') {
    sheet.clearContents(); initHeaders(sheet);
    const rows = body.merchants.map(m => headerOrder().map(h => m[h] || ''));
    if (rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    return jsonResponse({ ok: true, saved: rows.length });
  }
  if (body.action === 'upsert') {
    const headers = headerOrder();
    const existing = sheet.getDataRange().getValues();
    const idCol = headers.indexOf('id');
    body.merchants.forEach(m => {
      const rowIdx = existing.findIndex((r, i) => i > 0 && String(r[idCol]) === String(m.id));
      const rowData = headers.map(h => m[h] || '');
      if (rowIdx > 0) {
        sheet.getRange(rowIdx + 1, 1, 1, rowData.length).setValues([rowData]);
        existing[rowIdx] = rowData;
      } else { sheet.appendRow(rowData); existing.push(rowData); }
    });
    return jsonResponse({ ok: true, saved: body.merchants.length });
  }
  if (body.action === 'delete') {
    const headers = headerOrder();
    const idCol = headers.indexOf('id');
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idCol]) === String(body.id)) { sheet.deleteRow(i + 1); break; }
    }
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ error: 'Unknown action: ' + body.action });
}

function headerOrder() {
  return ['id','nama','business','kawasan','mandiri_rek','mandiri_edc','mandiri_qr',
          'bank_lain_edc','bank_lain_qr','visit','hasil_visit','keterangan','photos','updated_at'];
}
function initHeaders(sheet) { sheet.appendRow(headerOrder()); }
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Klik **Deploy → New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy** → **Authorize** → **Deploy**

5. **Copy URL** yang dihasilkan (format: `https://script.google.com/macros/s/XXXXX/exec`)

6. Paste URL ke `.env`:
   ```env
   VITE_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
   ```
   Atau buka aplikasi → ⚙️ Setup → masukkan URL → klik **Simpan URL**

> ⚠️ **Setiap kali kode Apps Script diubah**, harus **Deploy ulang** (bukan edit deployment lama — buat New Deployment baru).

---

## ☁️ Setup Supabase (Untuk Penyimpanan Foto)

### Langkah-langkah:

1. Buka [supabase.com](https://supabase.com) → buat akun / login

2. **Create New Project** → pilih region terdekat (Singapore)

3. Setelah project siap, buka **Storage → Create Bucket**:
   - Name: `merchant-photos`
   - Public bucket: **✅ YES** (agar URL foto bisa diakses publik)

4. Buka **Settings → API**:
   - Copy **Project URL** → `https://xxx.supabase.co`
   - Copy **anon public** key

5. Paste ke `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

6. (Opsional) Atur **RLS Policy** untuk bucket agar upload bisa dilakukan:
   - Storage → `merchant-photos` → Policies
   - Tambahkan policy: **Allow insert for anon users** atau disable RLS

> 💡 Jika Supabase tidak dikonfigurasi, foto tetap tersimpan lokal di `localStorage` browser (base64). Foto tidak akan sync ke Sheets sampai diupload ke Supabase.

---

## ⭐ Fitur Baru: Filter by Nama Merchant

Filter ini ada di panel **Filter** (tombol `⊟ Filter` di header, hanya muncul di halaman **Daftar**).

**Cara kerja:**
- Ketik nama merchant untuk mencari (live search)
- Pilih dari dropdown yang muncul untuk exact match
- Klik `✕` untuk clear filter nama
- Filter nama **bisa dikombinasikan** dengan filter lain (Kawasan, Tipe Bisnis, Status Visit, dll)

**Contoh use case:**
- Cari semua transaksi untuk "Warung Makan Padang" di semua kawasan
- Filter merchant "Indomaret" kawasan A yang belum di-visit

---

## 🔑 Environment Variables — Referensi Lengkap

| Variable | Wajib | Keterangan |
|---|---|---|
| `VITE_SCRIPT_URL` | ✅ Untuk sync | URL Google Apps Script Web App deployment |
| `VITE_SUPABASE_URL` | ⚠️ Untuk foto | Project URL dari Supabase dashboard |
| `VITE_SUPABASE_KEY` | ⚠️ Untuk foto | Anon/service_role key dari Supabase |

> Semua variabel harus diawali `VITE_` agar dapat diakses oleh Vite/React di sisi client.

> ⚠️ **JANGAN** commit file `.env` ke repository karena mengandung credentials. File `.env` sudah terdaftar di `.gitignore`.

---

## 🏗️ Arsitektur State Management

```
AppContext (React Context)
├── merchants[]          ← Data merchant (sync ke localStorage)
├── photos{}             ← Foto per merchant (localStorage, upgrade ke Supabase URL)
├── filters              ← Active filters (searchQ, filterBiz, filterVisit, filterNama, ...)
├── syncDot              ← Status sync: online | offline | syncing
├── dirtyIds (ref)       ← Set ID merchant yang berubah, belum di-sync
└── Actions
    ├── addMerchant()    → tambah, upload foto bg, autoSync
    ├── updateMerchant() → edit, autoSync
    ├── deleteMerchant() → hapus lokal + call delete ke Sheets
    ├── saveCard()       → mark dirty, simpan, autoSync
    ├── syncNow()        → push dirty → pull latest
    ├── syncAll()        → push semua data
    └── pullFromSheets() → ambil semua dari Sheets
```

---

## 🛠️ Scripts NPM

| Script | Keterangan |
|---|---|
| `npm run dev` | Jalankan development server (port 5173) |
| `npm run build` | Build production ke folder `dist/` |
| `npm run preview` | Preview hasil build |
| `npm run lint` | Lint dengan ESLint |

---

## 📦 Dependencies

| Package | Versi | Keterangan |
|---|---|---|
| react | ^18.3.1 | UI library |
| react-dom | ^18.3.1 | DOM renderer |
| vite | ^6.0.1 | Build tool & dev server |
| typescript | ~5.6.2 | Type safety |
| @vitejs/plugin-react | ^4.3.3 | Vite React plugin (SWC) |

Tidak ada dependency UI library tambahan — semua styling murni CSS custom sesuai design original.

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
# Ikuti prompt, set environment variables di Vercel dashboard
```

### Netlify

```bash
npm run build
# Upload folder dist/ ke Netlify
# Set env vars di Netlify → Site Settings → Environment Variables
```

### Self-hosted (Nginx)

```bash
npm run build
# Salin folder dist/ ke server
# Nginx config: try_files $uri $uri/ /index.html
```

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---|---|
| Sync gagal: "Apps Script mengembalikan HTML" | Re-deploy Apps Script dengan Who has access: **Anyone** (bukan pribadi) |
| Sync gagal: "Respons kosong" | Re-deploy Apps Script, pastikan URL `/exec` bukan `/dev` |
| Upload foto gagal: "Bucket tidak ditemukan" | Buat bucket bernama `merchant-photos` di Supabase Storage |
| Upload foto gagal: "Forbidden" | Set bucket ke **Public** atau tambahkan RLS policy untuk insert |
| Data hilang setelah refresh | Pastikan tidak incognito mode; `localStorage` harus aktif |
| `VITE_` env vars tidak terbaca | Restart `npm run dev` setelah mengubah `.env` |

---

## 📝 Catatan Developer

- **Logic sync tidak diubah** dari versi HTML asli — hanya direfactor ke TypeScript/React
- **Filter by Nama** menggunakan exact match dari dropdown; search bar header menggunakan partial match
- Foto disimpan sebagai `base64` di localStorage, lalu **diupgrade** ke Supabase URL secara background setelah upload berhasil
- `dirtyIds` digunakan untuk **incremental sync** — hanya data yang berubah yang di-push ke Sheets
- App bekerja **offline-first**: semua data tersimpan lokal, sync ke Sheets hanya jika URL dikonfigurasi
