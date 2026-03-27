import { SK, PK, SK_SB } from './constants';
import type { Merchant, Photos, SbConfig } from '../types';

export function loadMerchants(): Merchant[] {
  try {
    const s = localStorage.getItem(SK);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function saveMerchants(merchants: Merchant[]): void {
  localStorage.setItem(SK, JSON.stringify(merchants));
}

export function loadPhotos(): Photos {
  try {
    const p = localStorage.getItem(PK);
    return p ? JSON.parse(p) : {};
  } catch {
    return {};
  }
}

export function savePhotos(photos: Photos): void {
  try {
    localStorage.setItem(PK, JSON.stringify(photos));
  } catch {
    console.warn('⚠️ Storage foto penuh!');
  }
}

export function loadSbCfg(): SbConfig {
  // Check env vars first (hardcoded / .env approach)
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_KEY || '';
  if (envUrl && envKey) return { url: envUrl, key: envKey };

  // Fall back to localStorage (user configured via Setup modal)
  try {
    const raw = localStorage.getItem(SK_SB);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { url: '', key: '' };
}

export function saveSbCfg(cfg: SbConfig): void {
  localStorage.setItem(SK_SB, JSON.stringify(cfg));
}

export function clearSbCfg(): void {
  localStorage.removeItem(SK_SB);
}

export function loadScriptUrl(): string {
  // env var takes priority
  const envUrl = import.meta.env.VITE_SCRIPT_URL || '';
  if (envUrl) return envUrl;
  // then localStorage override
  return localStorage.getItem('gv_script_url') || '';
}

export function saveScriptUrl(url: string): void {
  localStorage.setItem('gv_script_url', url);
}
