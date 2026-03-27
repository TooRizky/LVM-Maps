import type { Merchant, MerchantStatus, Filters } from '../types';

export function getStatus(m: Merchant): MerchantStatus {
  const h = (m.hasil_visit || '').toUpperCase();
  const v = (m.visit || '').toUpperCase();
  if (h.includes('SUDAH') || h === 'DONE AKUSISI')
    return { color: '#16a34a', bg: '#dcfce7', label: 'Done',      dot: '#22c55e' };
  if (h.includes('FOLLOW UP') || h.includes('FOLLOU UP'))
    return { color: '#ca8a04', bg: '#fef9c3', label: 'Follow Up', dot: '#eab308' };
  if (h.includes('TIDAK BERMINAT') || h.includes('BELUM BERMINAT'))
    return { color: '#dc2626', bg: '#fee2e2', label: 'Ditolak',   dot: '#ef4444' };
  if (v === 'SUDAH' || v === 'V')
    return { color: '#0369a1', bg: '#dbeafe', label: 'Visited',   dot: '#3b82f6' };
  return { color: '#94a3b8', bg: '#f1f5f9', label: 'Belum',       dot: '#cbd5e1' };
}

export function kwStats(merchants: Merchant[], k: string) {
  const m = merchants.filter(x => x.kawasan === k);
  return {
    total:   m.length,
    visited: m.filter(x => (x.visit || '').toUpperCase() === 'SUDAH').length,
    done:    m.filter(x => {
      const h = (x.hasil_visit || '').toUpperCase();
      return h.includes('SUDAH') || h === 'DONE AKUSISI';
    }).length,
    mandiri: m.filter(x => x.mandiri_rek || x.mandiri_edc || x.mandiri_qr).length,
  };
}

export function computeStats(merchants: Merchant[]) {
  return {
    total:   merchants.length,
    visited: merchants.filter(m => (m.visit || '').toUpperCase() === 'SUDAH').length,
    mandiri: merchants.filter(m => m.mandiri_rek || m.mandiri_edc || m.mandiri_qr).length,
    done:    merchants.filter(m => {
      const h = (m.hasil_visit || '').toUpperCase();
      return h.includes('SUDAH') || h === 'DONE AKUSISI';
    }).length,
  };
}

export function getFiltered(merchants: Merchant[], filters: Filters): Merchant[] {
  return merchants.filter(m => {
    // Kawasan tab
    if (filters.activeKawasan !== 'ALL' && m.kawasan !== filters.activeKawasan) return false;

    // Header search bar (nama)
    if (filters.searchQ && !(m.nama || '').toLowerCase().includes(filters.searchQ.toLowerCase())) return false;

    // NEW: Filter by nama merchant (dropdown, exact match from list)
    if (filters.filterNama && m.nama !== filters.filterNama) return false;

    // Biz type chip
    if (filters.filterBiz && m.business !== filters.filterBiz) return false;

    // Visit status chip
    if (filters.filterVisit === 'SUDAH' && (m.visit || '').toUpperCase() !== 'SUDAH') return false;
    if (filters.filterVisit === 'BELUM' && (m.visit || '').toUpperCase() === 'SUDAH') return false;

    // Hasil visit select
    if (filters.filterHasil) {
      const h = (m.hasil_visit || '').toUpperCase();
      if (filters.filterHasil === 'SUDAH'          && !h.includes('SUDAH') && h !== 'DONE AKUSISI') return false;
      if (filters.filterHasil === 'FOLLOW UP'      && !h.includes('FOLLOW UP') && !h.includes('FOLLOU UP')) return false;
      if (filters.filterHasil === 'TIDAK BERMINAT' && !h.includes('TIDAK BERMINAT')) return false;
      if (filters.filterHasil === 'BELUM BERMINAT' && !h.includes('BELUM BERMINAT')) return false;
    }

    // Mandiri select
    if (filters.filterMandiri === 'rekening' && !m.mandiri_rek) return false;
    if (filters.filterMandiri === 'edc'      && !m.mandiri_edc) return false;
    if (filters.filterMandiri === 'qr'       && !m.mandiri_qr)  return false;
    if (filters.filterMandiri === 'none' && (m.mandiri_rek || m.mandiri_edc || m.mandiri_qr)) return false;

    return true;
  });
}

export function buildPayload(merchants: Merchant[], photos: Record<number, string[]>) {
  return merchants.map(m => ({
    id:            String(m.id),
    nama:          m.nama          || '',
    business:      m.business      || '',
    kawasan:       m.kawasan       || '',
    mandiri_rek:   m.mandiri_rek   || '',
    mandiri_edc:   m.mandiri_edc   || '',
    mandiri_qr:    m.mandiri_qr    || '',
    bank_lain_edc: m.bank_lain_edc || '',
    bank_lain_qr:  m.bank_lain_qr  || '',
    visit:         m.visit         || '',
    hasil_visit:   m.hasil_visit   || '',
    keterangan:    m.keterangan    || '',
    photos:        (photos[m.id] || photos[m.id] || [])
                     .filter(p => typeof p === 'string' && p.startsWith('http'))
                     .join('|'),
    updated_at:    new Date().toISOString(),
  }));
}
