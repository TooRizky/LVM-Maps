// ════════════════════════════════════════════════════
//  LOCALSTORAGE — offline cache saja
//  Supabase adalah source of truth.
// ════════════════════════════════════════════════════
import { SK, PK } from './constants';
import type { Merchant, Photos } from '../types';

export function loadMerchants(): Merchant[] {
  try { const s = localStorage.getItem(SK); return s ? JSON.parse(s) : []; }
  catch { return []; }
}

export function saveMerchants(merchants: Merchant[]): void {
  try { localStorage.setItem(SK, JSON.stringify(merchants)); }
  catch { console.warn('localStorage saveMerchants failed'); }
}

export function loadPhotos(): Photos {
  try { const p = localStorage.getItem(PK); return p ? JSON.parse(p) : {}; }
  catch { return {}; }
}

export function savePhotos(photos: Photos): void {
  try { localStorage.setItem(PK, JSON.stringify(photos)); }
  catch { console.warn('⚠️ Storage foto penuh!'); }
}
