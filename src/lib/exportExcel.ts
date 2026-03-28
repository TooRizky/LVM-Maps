import * as XLSX from 'xlsx';
import type { Merchant, Photos } from '../types';
import { dbFetchAll } from './supabaseClient';

const KAWASAN_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];

function sortMerchants(list: Merchant[]): Merchant[] {
  return [...list].sort((a, b) => {
    const ki = (k: string) => { const i = KAWASAN_ORDER.indexOf(k?.toUpperCase() || ''); return i === -1 ? 99 : i; };
    const kd = ki(a.kawasan) - ki(b.kawasan);
    return kd !== 0 ? kd : (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' });
  });
}

function boolLabel(val: string | undefined) { return val?.trim() ? '✓' : '-'; }
function visitLabel(val: string | undefined) {
  return ['SUDAH','V'].includes((val||'').toUpperCase()) ? 'Sudah Visit' : 'Belum Visit';
}

interface ExcelRow {
  'No': number; 'Kawasan': string; 'Nama Merchant': string; 'Tipe Bisnis': string;
  'Rek. Mandiri': string; 'EDC Mandiri': string; 'QR Mandiri': string;
  'EDC Bank Lain': string; 'QR Bank Lain': string;
  'Status Visit': string; 'Hasil Visit': string; 'Keterangan': string; 'Link Foto': string;
}

function buildRows(merchants: Merchant[], photos: Photos): ExcelRow[] {
  return sortMerchants(merchants).map((m, i) => ({
    'No': i + 1,
    'Kawasan':       m.kawasan     || '-',
    'Nama Merchant': m.nama        || '-',
    'Tipe Bisnis':   m.business    || '-',
    'Rek. Mandiri':  boolLabel(m.mandiri_rek),
    'EDC Mandiri':   boolLabel(m.mandiri_edc),
    'QR Mandiri':    boolLabel(m.mandiri_qr),
    'EDC Bank Lain': boolLabel(m.bank_lain_edc),
    'QR Bank Lain':  boolLabel(m.bank_lain_qr),
    'Status Visit':  visitLabel(m.visit),
    'Hasil Visit':   m.hasil_visit || '-',
    'Keterangan':    m.keterangan  || '-',
    'Link Foto':     (photos[m.id] || []).filter(u => u?.startsWith('http')).join(', ') || '-',
  }));
}

function generateXlsx(rows: ExcelRow[], total: number): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:5},{wch:10},{wch:30},{wch:16},{wch:12},{wch:12},{wch:12},
    {wch:13},{wch:12},{wch:14},{wch:20},{wch:28},{wch:60},
  ];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
    if (cell) cell.s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '002654' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: { rgb: 'F5A623' } } },
    };
  }

  const kawColors: Record<string,string> = {
    A:'DBEAFE', B:'EDE9FE', C:'FFEDD5', D:'DCFCE7', E:'CFFAFE', F:'FCE7F3',
  };
  for (let R = 1; R <= rows.length; R++) {
    const fill = kawColors[rows[R-1]['Kawasan']] || 'F9FAFB';
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = {
        fill: { fgColor: { rgb: fill } },
        alignment: { vertical: 'center', wrapText: C === 2 || C === 12 },
        border: {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        },
      };
    }
  }

  // Summary sheet
  const summary = XLSX.utils.aoa_to_sheet([
    ['LVM-Maps — Laporan Merchant'],
    ['Tanggal Export', new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})],
    ['Total Merchant (DB)', total],
    ['Total Export', rows.length],
    [''],
    ['Kawasan','Total','Sudah Visit','Belum Visit'],
    ...['A','B','C','D','E','F'].map(k => {
      const kr = rows.filter(r => r['Kawasan'] === k);
      const v  = kr.filter(r => r['Status Visit'] === 'Sudah Visit').length;
      return [k, kr.length, v, kr.length - v];
    }),
  ]);
  summary['!cols'] = [{wch:22},{wch:22},{wch:14},{wch:14}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Merchant');
  XLSX.utils.book_append_sheet(wb, summary, 'Ringkasan');
  return wb;
}

export async function exportToExcel(
  localMerchants: Merchant[],
  localPhotos: Photos,
  onStatus: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void
): Promise<void> {
  let merchants = localMerchants;
  let photos    = localPhotos;
  let tag       = 'lokal';

  onStatus('📥 Mengambil data dari Supabase…', 'loading');
  try {
    const rows = await dbFetchAll();
    if (rows.length) {
      const parsedPhotos: Photos = {};
      merchants = rows.map(row => {
        const urls = (row.photos || '').split('|').filter(Boolean);
        if (urls.length) parsedPhotos[row.id] = urls;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { photos: _p, updated_at: _u, ...m } = row;
        return m as unknown as Merchant;
      });
      photos = parsedPhotos;
      tag    = 'Supabase';
      onStatus(`✅ ${rows.length} data dimuat dari Supabase`);
    } else {
      onStatus('⚠️ Supabase kosong, menggunakan data lokal…');
    }
  } catch (e) {
    onStatus(`⚠️ Supabase gagal: ${(e as Error).message} — pakai data lokal`);
  }

  if (!merchants.length) { onStatus('❌ Tidak ada data.', 'error'); return; }
  onStatus(`📊 Membuat Excel dari ${tag}…`, 'loading');
  try {
    const rows = buildRows(merchants, photos);
    const wb   = generateXlsx(rows, merchants.length);
    const d    = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
    XLSX.writeFile(wb, `LVM-Merchant-${d}.xlsx`, { bookType:'xlsx', type:'binary', cellStyles:true });
    onStatus(`✅ Export berhasil! ${rows.length} merchant`);
  } catch (e) {
    onStatus('❌ Gagal buat Excel: ' + (e as Error).message, 'error');
  }
}
