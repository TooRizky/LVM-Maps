// ════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════

export interface Merchant {
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
}

export interface Photos {
  [merchantId: number]: string[];
}

export interface SyncState {
  status: 'online' | 'offline' | 'syncing';
  message: string;
  type: '' | 'loading' | 'error' | 'success';
  show: boolean;
}

export interface SbConfig {
  url: string;
  key: string;
}

export interface Filters {
  searchQ: string;
  filterBiz: string;
  filterVisit: string;
  filterHasil: string;
  filterMandiri: string;
  filterNama: string; // NEW: filter by merchant name (dropdown/autocomplete)
  activeKawasan: string;
}

export type Page = 'dashboard' | 'list';

export interface MerchantStatus {
  color: string;
  bg: string;
  label: string;
  dot: string;
}
