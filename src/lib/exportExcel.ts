import * as XLSX from 'xlsx';
import type { Merchant } from '../types';
import { fetchFromSheets } from './sync';

// ════════════════════════════════════════════════════
//  EXPORT EXCEL — urut Kawasan A-F, lalu Nama A-Z
// ════════════════════════════════════════════════════

const KAWASAN_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

function sortMerchants(list: Merchant[]): Merchant[] {
  return [...list].sort((a, b) => {
    const kawA = KAWASAN_ORDER.indexOf(a.kawasan?.toUpperCase() || '');
    const kawB = KAWASAN_ORDER.indexOf(b.kawasan?.toUpperCase() || '');
    const kDiff = (kawA === -1 ? 99 : kawA) - (kawB === -1 ? 99 : kawB);
    if (kDiff !== 0) return kDiff;
    return (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
  });
}

function boolLabel(val: string | undefined): string {
  return val && val.trim() ? '✓' : '-';
}

function buildRows(merchants: Merchant[]) {
  const sorted = sortMerchants(merchants);
  return sorted.map((m, i) => ({
    'No':            i + 1,
    'Kawasan':       m.kawasan || '-',
    'Nama Merchant': m.nama    || '-',
    'Tipe Bisnis':   m.business || '-',
    'Rek. Mandiri':  boolLabel(m.mandiri_rek),
    'EDC Mandiri':   boolLabel(m.mandiri_edc),
    'QR Mandiri':    boolLabel(m.mandiri_qr),
    'EDC Bank Lain': boolLabel(m.bank_lain_edc),
    'QR Bank Lain':  boolLabel(m.bank_lain_qr),
    'Status Visit':  m.visit ? 'Sudah' : 'Belum',
    'Hasil Visit':   m.hasil_visit  || '-',
    'Keterangan':    m.keterangan   || '-',
  }));
}

function generateXlsx(merchants: Merchant[], sheetTitle = 'Data Merchant') {
  const rows   = buildRows(merchants);
  const ws     = XLSX.utils.json_to_sheet(rows);

  // ── Column widths ────────────────────────────────────
  ws['!cols'] = [
    { wch: 5  },  // No
    { wch: 10 },  // Kawasan
    { wch: 30 },  // Nama
    { wch: 16 },  // Tipe
    { wch: 13 },  // Rek
    { wch: 13 },  // EDC Mandiri
    { wch: 13 },  // QR Mandiri
    { wch: 14 },  // EDC BL
    { wch: 13 },  // QR BL
    { wch: 13 },  // Status
    { wch: 20 },  // Hasil
    { wch: 28 },  // Ket
  ];

  // ── Header row bold style (xlsx-style) ──────────────
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) {
      cell.s = {
        font:      { bold: true, color: { rgb: 'FFFFFF' } },
        fill:      { fgColor: { rgb: '002654' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'medium', color: { rgb: 'F5A623' } },
        },
      };
    }
  }

  // ── Alternating row fill per kawasan ─────────────────
  const kawColors: Record<string, string> = {
    A: 'DBEAFE', B: 'EDE9FE', C: 'FFEDD5',
    D: 'DCFCE7', E: 'CFFAFE', F: 'FCE7F3',
  };
  for (let R = 1; R <= rows.length; R++) {
    const kaw = rows[R - 1]['Kawasan'];
    const fillRgb = kawColors[kaw] || 'F9FAFB';
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill:      { fgColor: { rgb: fillRgb } },
        alignment: { vertical: 'center', wrapText: C === 2 },
        border: {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  return wb;
}

// ── Main export: fetch from Sheets first, fallback to local ──
export async function exportToExcel(
  scriptUrl: string,
  localMerchants: Merchant[],
  onStatus: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void
): Promise<void> {
  let merchants = localMerchants;

  // Try to get fresh data from Sheets
  if (scriptUrl) {
    onStatus('📥 Mengambil data terbaru dari Sheets...', 'loading');
    try {
      const json = await fetchFromSheets(scriptUrl);
      if (json['merchants'] && (json['merchants'] as Merchant[]).length) {
        merchants = (json['merchants'] as Merchant[]).map(m => ({
          ...m,
          id: Number(m.id) || (m.id as unknown as number),
        }));
        onStatus(`✅ Data Sheets berhasil dimuat (${merchants.length} merchant)`);
      } else {
        onStatus('⚠️ Sheets kosong, menggunakan data lokal...', '');
      }
    } catch (e) {
      onStatus('⚠️ Gagal fetch Sheets, menggunakan data lokal: ' + (e as Error).message, '');
    }
  } else {
    onStatus('ℹ️ Script URL belum diatur, menggunakan data lokal');
  }

  if (!merchants.length) {
    onStatus('❌ Tidak ada data untuk di-export.', 'error');
    return;
  }

  onStatus('📊 Membuat file Excel...', 'loading');

  try {
    const wb       = generateXlsx(merchants);
    const today    = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const filename = `LVM-Merchant-${today}.xlsx`;

    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary', cellStyles: true });
    onStatus(`✅ Export berhasil! File: ${filename}`);
  } catch (e) {
    onStatus('❌ Gagal membuat file Excel: ' + (e as Error).message, 'error');
  }
}
