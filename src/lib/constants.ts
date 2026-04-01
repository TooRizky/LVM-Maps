// ════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════

export const SK     = 'gv_v4b';
export const PK     = 'gv_photos_v4b';

// Supabase env vars (semua config dari .env saja — tidak ada setup modal)
export const SB_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
export const SB_KEY: string = import.meta.env.VITE_SUPABASE_KEY || '';

export const KAW_COLOR: Record<string, string> = {
  A: 'var(--kA)', B: 'var(--kB)', C: 'var(--kC)',
  D: 'var(--kD)', E: 'var(--kE)', F: 'var(--kF)',
};

export const KAW_HEX: Record<string, string> = {
  A: '#2563EB', B: '#7C3AED', C: '#EA580C',
  D: '#16A34A', E: '#0891B2', F: '#DB2777',
};

// Nama kawasan berdasarkan alamat jalan
export const KAWASAN_LABEL: Record<string, string> = {
  A: 'Jl. Tanjung Mangga Raya',
  B: 'Jl. Tanjung Duren 1',
  C: 'Jl. Tanjung Duren Barat',
  D: 'Jl. Ratu Kemuning',
  E: 'Jl. Taman Ratu (E)',
  F: 'Jl. Taman Ratu (F)',
};

export const BIZ_EMOJI: Record<string, string> = {
  'F&B':       '🍜', PERDAGANGAN: '🛍️', JASA:       '🔧',
  HEALTHCARE:  '🏥', EDUCATION:   '📚', COMPANY:    '🏢',
  SUPERMARKET: '🏪', IBADAH:      '⛪', HEALTH:     '💊',
  OTHER:       '📌',
};

export const BIZ_CLR: Record<string, string> = {
  'F&B':       '#FEF3C7', PERDAGANGAN: '#DBEAFE', JASA:       '#FCE7F3',
  HEALTHCARE:  '#D1FAE5', EDUCATION:   '#EDE9FE', COMPANY:    '#F3F4F6',
  SUPERMARKET: '#FEE2E2', IBADAH:      '#FEF9C3', HEALTH:     '#D1FAE5',
  OTHER:       '#F1F5F9',
};

export const KAWASAN_LIST = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export const BUSINESS_TYPES = [
  'F&B', 'PERDAGANGAN', 'JASA', 'HEALTHCARE',
  'EDUCATION', 'COMPANY', 'SUPERMARKET', 'IBADAH', 'OTHER',
] as const;

// Hasil kunjungan (dropdown)
export const HASIL_VISIT_OPTIONS = ['', 'Follow Up', 'Closing', 'Tidak Berminat'] as const;

// PIC Cabang
export const PIC_CABANG_LIST = [
  'Agus', 'Budi', 'Citra', 'Dewi', 'Eko',
  'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko',
  'Kiki', 'Lina', 'Mira', 'Nani', 'Omar',
] as const;

// Bank list untuk bank lain
export const BANK_LIST = [
  'BCA', 'BNI', 'BRI', 'CIMB', 'Danamon',
  'Permata', 'BTN', 'BSI', 'Muamalat', 'Ocbc',
  'Panin', 'Mega', 'Bukopin', 'Maybank', 'Lainnya',
] as const;

