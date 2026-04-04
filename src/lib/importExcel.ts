// ════════════════════════════════════════════════════
//  IMPORT EXCEL — parser untuk format LVM Merchant
//  Kolom: NO | NAMA | BUSSINESS | REK | EDC | QR |
//         BANK_EDC | BANK_QR | KETERANGAN | VISIT |
//         HASIL_VISIT | KAWASAN
// ════════════════════════════════════════════════════
import * as XLSX from 'xlsx';
import type { Merchant } from '../types';
import { BANK_LIST, BUSINESS_TYPES, KAWASAN_LIST } from './constants';

export type ImportRow = Omit<Merchant, 'id'>;

export interface ParseResult {
  rows: ImportRow[];
  error?: string;
}

// ── Helpers ──────────────────────────────────────────

function normalizeV(val: unknown): string {
  const s = String(val ?? '').trim().toUpperCase();
  return (s === 'V' || s === '✓' || s === '✔' || s === 'Y' || s === 'YES' || s === '1') ? 'V' : '';
}

function normalizeVisit(val: unknown): string {
  return String(val ?? '').trim().toUpperCase() === 'SUDAH' ? 'SUDAH' : '';
}

/** Normalise hasil visit → one of the 3 known values or '' */
function normalizeHasil(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s) return '';
  if (s.includes('TIDAK BERMINAT') || s.includes('BELUM BERMINAT') || s.includes('TDK BERMINAT'))
    return 'Tidak Berminat';
  if (s.includes('FOLLOW UP') || s.includes('FOLLOU UP') || s.includes('FOLLOW-UP') || s === 'FU')
    return 'Follow Up';
  if (s === 'CLOSING' || s.includes('CLOSING'))
    return 'Closing';
  return ''; // tidak dikenali — kosongkan, sisakan di keterangan
}

/** Cari nama bank dari teks bebas */
function extractBanks(text: unknown): string[] {
  if (!text) return [];
  const upper = String(text).toUpperCase();
  return (BANK_LIST as readonly string[]).filter(b => upper.includes(b.toUpperCase()));
}

/** Normalisasi tipe bisnis ke salah satu BUSINESS_TYPES */
function normalizeBusiness(val: unknown): string {
  const s = String(val ?? '').trim().toUpperCase();
  if (!s) return 'OTHER';
  const match = (BUSINESS_TYPES as readonly string[]).find(b => b.toUpperCase() === s || s.includes(b.toUpperCase()));
  return match ?? 'OTHER';
}

/** Normalisasi kawasan → A-F */
function normalizeKawasan(val: unknown): string {
  const s = String(val ?? '').trim().toUpperCase();
  return (KAWASAN_LIST as readonly string[]).includes(s) ? s : 'A';
}

// ── Detect data-start row ─────────────────────────────
// Cari baris pertama di mana col[0] berupa angka dan col[1] non-empty string
function findDataStart(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const col0 = String(r[0] ?? '').trim();
    const col1 = String(r[1] ?? '').trim();
    // Skip header rows
    if (col1.toUpperCase().includes('NAMA') || col1.toUpperCase().includes('BUSSINESS')) continue;
    if (!col1 || !col0) continue;
    if (isNaN(Number(col0))) continue;
    return i;
  }
  return -1;
}

// ── Main parser ───────────────────────────────────────
export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onerror = () => resolve({ rows: [], error: 'Gagal membaca file.' });

    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target!.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });

        const start = findDataStart(raw as unknown[][]);
        if (start === -1) {
          resolve({ rows: [], error: 'Format Excel tidak dikenali. Pastikan kolom sesuai template.' });
          return;
        }

        const results: ImportRow[] = [];

        for (let i = start; i < raw.length; i++) {
          const r = raw[i] as unknown[];

          // col[1] = NAMA — mandatory
          const nama = String(r[1] ?? '').trim();
          if (!nama) continue;

          const ketRaw    = String(r[8] ?? '').trim();
          const hasilRaw  = String(r[10] ?? '').trim();
          const hasilNorm = normalizeHasil(hasilRaw);

          // Jika hasil tidak dikenali → simpan teks asli ke keterangan
          const extraKet  = hasilNorm === '' && hasilRaw ? hasilRaw : '';
          const keterangan = [ketRaw, extraKet].filter(Boolean).join('; ');

          // Bank Lain EDC: cek cell dulu, kalau cuma "V" coba parse dari keterangan konteks "EDC"
          const edcCell   = String(r[6] ?? '');
          let bankEdc     = extractBanks(edcCell);
          if (bankEdc.length === 0 && normalizeV(edcCell)) {
            // cell hanya marker V → coba keterangan yang mengandung "EDC"
            const ketUp = ketRaw.toUpperCase();
            if (ketUp.includes('EDC')) bankEdc = extractBanks(ketRaw);
          }

          // Bank Lain QR
          const qrCell    = String(r[7] ?? '');
          let bankQr      = extractBanks(qrCell);
          if (bankQr.length === 0 && normalizeV(qrCell)) {
            const ketUp = ketRaw.toUpperCase();
            if (ketUp.includes('QR') || ketUp.includes('QRIS')) bankQr = extractBanks(ketRaw);
          }

          results.push({
            nama,
            business:      normalizeBusiness(r[2]),
            kawasan:       normalizeKawasan(r[11]),
            mandiri_rek:   normalizeV(r[3]),
            mandiri_edc:   normalizeV(r[4]),
            mandiri_qr:    normalizeV(r[5]),
            bank_lain_edc: bankEdc.join(','),
            bank_lain_qr:  bankQr.join(','),
            visit:         normalizeVisit(r[9]),
            hasil_visit:   hasilNorm,
            pic_cabang:    '',
            keterangan,
            visit_history: '[]',
          });
        }

        resolve({ rows: results });
      } catch (err) {
        resolve({ rows: [], error: 'Gagal parse file: ' + (err as Error).message });
      }
    };

    reader.readAsBinaryString(file);
  });
}
