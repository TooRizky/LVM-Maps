import * as XLSX from 'xlsx';
import type { Merchant, Photos } from '../types';
import { dbFetchAll } from './supabaseClient';

const KAWASAN_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
const KAWASAN_LABEL: Record<string, string> = {
  A: 'Jl. Tanjung Mangga Raya',
  B: 'Jl. Tanjung Duren 1',
  C: 'Jl. Tanjung Duren Barat',
  D: 'Jl. Ratu Kemuning',
  E: 'Jl. Taman Ratu (E)',
  F: 'Jl. Taman Ratu (F)',
};

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

// Format bank list comma-separated string to readable
function bankLabel(val: string | undefined) {
  if (!val?.trim()) return '-';
  return val.split(',').filter(Boolean).join(', ');
}

// Get last visit record info
function getLastVisit(visitHistoryJson: string | undefined): { date: string; pic: string; hasil: string } {
  try {
    const arr = JSON.parse(visitHistoryJson || '[]');
    if (Array.isArray(arr) && arr.length > 0) {
      const last = arr[arr.length - 1];
      const d = new Date(last.date);
      return {
        date: d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        pic: last.pic || '-',
        hasil: last.hasil || '-',
      };
    }
  } catch { /* ignore */ }
  return { date: '-', pic: '-', hasil: '-' };
}

interface ExcelRow {
  'No': number;
  'Kawasan': string;
  'Alamat Kawasan': string;
  'Nama Merchant': string;
  'Tipe Bisnis': string;
  'Rek. Mandiri': string;
  'EDC Mandiri': string;
  'QR Mandiri': string;
  'EDC Bank Lain': string;
  'QR Bank Lain': string;
  'Status Visit': string;
  'Hasil Visit': string;
  'PIC Cabang': string;
  'Tgl Kunjungan Terakhir': string;
  'PIC Terakhir': string;
  'Keterangan': string;
  'Jml Kunjungan': number;
  'Link Foto': string;
}

function buildRows(merchants: Merchant[], photos: Photos): ExcelRow[] {
  return sortMerchants(merchants).map((m, i) => {
    const lastVisit = getLastVisit(m.visit_history);
    let visitCount = 0;
    try {
      const arr = JSON.parse(m.visit_history || '[]');
      visitCount = Array.isArray(arr) ? arr.length : 0;
    } catch { /* ignore */ }

    return {
      'No': i + 1,
      'Kawasan':               m.kawasan     || '-',
      'Alamat Kawasan':        KAWASAN_LABEL[m.kawasan] || '-',
      'Nama Merchant':         m.nama        || '-',
      'Tipe Bisnis':           m.business    || '-',
      'Rek. Mandiri':          boolLabel(m.mandiri_rek),
      'EDC Mandiri':           boolLabel(m.mandiri_edc),
      'QR Mandiri':            boolLabel(m.mandiri_qr),
      'EDC Bank Lain':         bankLabel(m.bank_lain_edc),
      'QR Bank Lain':          bankLabel(m.bank_lain_qr),
      'Status Visit':          visitLabel(m.visit),
      'Hasil Visit':           m.hasil_visit || '-',
      'PIC Cabang':            m.pic_cabang  || '-',
      'Tgl Kunjungan Terakhir': lastVisit.date,
      'PIC Terakhir':          lastVisit.pic,
      'Keterangan':            m.keterangan  || '-',
      'Jml Kunjungan':         visitCount,
      'Link Foto':             (photos[m.id] || []).filter(u => u?.startsWith('http')).join(', ') || '-',
    };
  });
}

function generateXlsx(rows: ExcelRow[], total: number): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    {wch:5},{wch:10},{wch:26},{wch:30},{wch:16},
    {wch:12},{wch:12},{wch:12},{wch:22},{wch:22},
    {wch:14},{wch:16},{wch:14},{wch:22},{wch:14},
    {wch:28},{wch:12},{wch:60},
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
  const hasilColors: Record<string,string> = {
    'Closing':        'D1FAE5',
    'Follow Up':      'FEF3C7',
    'Tidak Berminat': 'FEE2E2',
  };

  for (let R = 1; R <= rows.length; R++) {
    const row     = rows[R - 1];
    const kwFill  = kawColors[row['Kawasan']] || 'F9FAFB';
    const hasilFill = hasilColors[row['Hasil Visit']] || kwFill;

    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      // Column 11 = 'Hasil Visit' — color by hasil
      const useFill = C === 11 ? hasilFill : kwFill;
      ws[addr].s = {
        fill: { fgColor: { rgb: useFill } },
        alignment: { vertical: 'center', wrapText: C === 3 || C === 15 || C === 17 },
        border: {
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
        },
      };
    }
  }

  // Summary sheet
  const followUpCount     = rows.filter(r => r['Hasil Visit'] === 'Follow Up').length;
  const closingCount      = rows.filter(r => r['Hasil Visit'] === 'Closing').length;
  const tidakBerminat     = rows.filter(r => r['Hasil Visit'] === 'Tidak Berminat').length;
  const sudahVisit        = rows.filter(r => r['Status Visit'] === 'Sudah Visit').length;

  const summary = XLSX.utils.aoa_to_sheet([
    ['LVM-Maps — Laporan Merchant'],
    ['Tanggal Export', new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'})],
    ['Total Merchant (DB)', total],
    ['Total Export', rows.length],
    [''],
    ['RINGKASAN VISIT', ''],
    ['Sudah Visit',    sudahVisit],
    ['Belum Visit',    rows.length - sudahVisit],
    [''],
    ['HASIL VISIT', ''],
    ['Follow Up',       followUpCount],
    ['Closing',         closingCount],
    ['Tidak Berminat',  tidakBerminat],
    ['Belum ada hasil', rows.length - followUpCount - closingCount - tidakBerminat],
    [''],
    ['STATISTIK PER KAWASAN', ''],
    ['Kawasan','Alamat','Total','Sudah Visit','Follow Up','Closing','Tidak Berminat'],
    ...['A','B','C','D','E','F'].map(k => {
      const kr = rows.filter(r => r['Kawasan'] === k);
      const v  = kr.filter(r => r['Status Visit'] === 'Sudah Visit').length;
      const fu = kr.filter(r => r['Hasil Visit'] === 'Follow Up').length;
      const cl = kr.filter(r => r['Hasil Visit'] === 'Closing').length;
      const tb = kr.filter(r => r['Hasil Visit'] === 'Tidak Berminat').length;
      return [k, KAWASAN_LABEL[k] || '', kr.length, v, fu, cl, tb];
    }),
  ]);
  summary['!cols'] = [{wch:22},{wch:28},{wch:8},{wch:12},{wch:12},{wch:10},{wch:16}];

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
