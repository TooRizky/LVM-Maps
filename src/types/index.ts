export interface Merchant {
  id: number;
  nama: string;
  business: string;
  kawasan: string;
  mandiri_rek: string;
  mandiri_edc: string;
  mandiri_qr: string;
  bank_lain_edc: string;   // comma-separated bank names, e.g. "BCA,BNI"
  bank_lain_qr: string;    // comma-separated bank names, e.g. "BRI,CIMB"
  visit: string;
  hasil_visit: string;     // 'Follow Up' | 'Closing' | 'Tidak Berminat' | ''
  pic_cabang: string;      // PIC yang melakukan visit
  keterangan: string;
  visit_history: string;   // JSON array of VisitRecord
}

export interface VisitRecord {
  date: string;      // ISO date string
  pic: string;
  hasil: string;
  keterangan: string;
}

export interface Photos {
  [merchantId: number]: string[];
}

export interface Filters {
  searchQ: string;
  filterBiz: string;
  filterVisit: string;
  filterHasil: string;
  filterMandiri: string;
  filterNama: string;
  activeKawasan: string;
}

export type Page = 'dashboard' | 'list';

export interface MerchantStatus {
  color: string;
  bg: string;
  label: string;
  dot: string;
}
