import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { Merchant, Photos, SbConfig, Filters, Page } from '../types';
import {
  loadMerchants, saveMerchants,
  loadPhotos, savePhotos as storageSavePhotos,
  loadSbCfg, saveSbCfg, clearSbCfg as storageClearSbCfg,
  loadScriptUrl, saveScriptUrl as storageSaveScriptUrl,
} from '../lib/storage';
import { getFiltered, buildPayload } from '../lib/merchantUtils';
import { apiCall, fetchFromSheets, testConnection } from '../lib/sync';
import { uploadPhotoToSupabase, testSupabaseConnection } from '../lib/supabase';
import { SCRIPT_URL, SB_URL, SB_KEY } from '../lib/constants';

// ── Sync state ──────────────────────────────────────────────
interface SyncBarState {
  message: string;
  type: '' | 'loading' | 'error' | 'success';
  show: boolean;
}

// ── Context shape ────────────────────────────────────────────
interface AppContextValue {
  // State
  merchants: Merchant[];
  photos: Photos;
  filters: Filters;
  currentPage: Page;
  expandedId: number | null;
  syncDot: 'online' | 'offline' | 'syncing';
  syncBar: SyncBarState;
  sbCfg: SbConfig;
  scriptUrl: string;
  syncing: boolean;
  toast: string;
  lightboxSrc: string;
  filterPanelOpen: boolean;
  setupModalOpen: boolean;
  addModalOpen: boolean;
  editModalOpen: boolean;
  editingId: number | null;
  confirmModal: { open: boolean; id: number | null; nama: string };

  // Actions
  setFilters: (f: Partial<Filters>) => void;
  setCurrentPage: (p: Page) => void;
  setExpandedId: (id: number | null) => void;
  setSbCfg: (cfg: SbConfig) => void;
  setScriptUrl: (url: string) => void;
  setFilterPanelOpen: (v: boolean) => void;
  setSetupModalOpen: (v: boolean) => void;
  setAddModalOpen: (v: boolean) => void;
  setEditModalOpen: (v: boolean) => void;
  setEditingId: (id: number | null) => void;
  setConfirmModal: (v: { open: boolean; id: number | null; nama: string }) => void;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;
  showToast: (msg: string) => void;
  showSyncBar: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void;

  // Data actions
  addMerchant: (m: Omit<Merchant, 'id'>, pendingPhotos: string[]) => void;
  updateMerchant: (m: Merchant) => void;
  updateField: (id: number, field: keyof Merchant, value: string) => void;
  saveCard: (id: number) => void;
  deleteMerchant: (id: number) => void;
  addPhoto: (merchantId: number, base64: string) => void;
  deletePhoto: (merchantId: number, idx: number) => void;

  // Sync
  syncNow: () => void;
  syncAll: () => void;
  pullFromSheets: () => void;
  testConn: () => void;
  saveSupabase: (url: string, key: string) => void;
  clearSupabase: () => void;
  testSupabase: (url: string, key: string) => void;
  saveScriptUrlAction: (url: string) => void;

  // Helpers
  getFilteredMerchants: () => Merchant[];
  getPhotos: (id: number) => string[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Data state ───────────────────────────────────────────────
  const [merchants, setMerchantsState] = useState<Merchant[]>(() => loadMerchants());
  const [photos, setPhotosState] = useState<Photos>(() => loadPhotos());
  const nextId = useRef(Math.max(...(loadMerchants().map(m => Number(m.id) || 0)), 299) + 1);
  const dirtyIds = useRef(new Set<number>());

  // ── Config state ─────────────────────────────────────────────
  const [sbCfg, setSbCfgState] = useState<SbConfig>(() => {
    const envCfg = { url: SB_URL, key: SB_KEY };
    if (envCfg.url && envCfg.key) return envCfg;
    return loadSbCfg();
  });
  const [scriptUrl, setScriptUrlState] = useState<string>(() => {
    if (SCRIPT_URL) return SCRIPT_URL;
    return loadScriptUrl();
  });

  // ── UI state ─────────────────────────────────────────────────
  const [filters, setFiltersState] = useState<Filters>({
    searchQ: '', filterBiz: '', filterVisit: '',
    filterHasil: '', filterMandiri: '', filterNama: '',
    activeKawasan: 'ALL',
  });
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [syncDot, setSyncDot] = useState<'online' | 'offline' | 'syncing'>('online');
  const [syncBar, setSyncBarState] = useState<SyncBarState>({ message: '', type: '', show: false });
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; id: number | null; nama: string }>({
    open: false, id: null, nama: '',
  });

  const pendingSync = useRef(false);
  const syncingRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────
  const setMerchants = useCallback((m: Merchant[]) => {
    setMerchantsState(m);
    saveMerchants(m);
    nextId.current = Math.max(...m.map(x => Number(x.id) || 0), 299) + 1;
  }, []);

  const setPhotos = useCallback((p: Photos) => {
    setPhotosState(p);
    storageSavePhotos(p);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const showSyncBar = useCallback((msg: string, type: '' | 'loading' | 'error' | 'success' = '') => {
    setSyncBarState({ message: msg, type, show: true });
    if (syncBarTimer.current) clearTimeout(syncBarTimer.current);
    if (type !== 'loading') {
      syncBarTimer.current = setTimeout(() => setSyncBarState(prev => ({ ...prev, show: false })), 4000);
    }
  }, []);

  const setSyncState = useCallback((s: 'online' | 'offline' | 'syncing') => setSyncDot(s), []);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState(prev => ({ ...prev, ...f }));
  }, []);

  const setSbCfg = useCallback((cfg: SbConfig) => setSbCfgState(cfg), []);
  const setScriptUrl = useCallback((url: string) => setScriptUrlState(url), []);

  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(''), []);

  // ── Filtered merchants ────────────────────────────────────────
  const getFilteredMerchants = useCallback(() =>
    getFiltered(merchants, filters), [merchants, filters]);

  const getPhotos = useCallback((id: number) => photos[id] || [], [photos]);

  // ── Data mutations ────────────────────────────────────────────
  const addMerchant = useCallback((m: Omit<Merchant, 'id'>, pendingPhotos: string[]) => {
    const id = nextId.current++;
    const newMerchant: Merchant = { ...m, id };
    const newMerchants = [newMerchant, ...merchants];
    const newPhotos = { ...photos };
    if (pendingPhotos.length) newPhotos[id] = [...pendingPhotos];

    setMerchants(newMerchants);
    setPhotos(newPhotos);
    dirtyIds.current.add(id);
    showToast('✅ Merchant ditambahkan!');

    // Upload photos to Supabase in background, then auto-sync
    if (pendingPhotos.length) {
      (async () => {
        const uploaded: string[] = [];
        for (let i = 0; i < pendingPhotos.length; i++) {
          const url = await uploadPhotoToSupabase(pendingPhotos[i], id, i, sbCfg, showSyncBar);
          uploaded.push(url);
        }
        setPhotosState(prev => {
          const updated = { ...prev, [id]: uploaded };
          storageSavePhotos(updated);
          return updated;
        });
        dirtyIds.current.add(id);
        autoSyncInternal(newMerchants, { ...photos, [id]: uploaded });
      })();
    }
    autoSyncInternal(newMerchants, newPhotos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, sbCfg]);

  const updateMerchant = useCallback((updated: Merchant) => {
    const newMerchants = merchants.map(m => m.id === updated.id ? updated : m);
    setMerchants(newMerchants);
    dirtyIds.current.add(updated.id);
    showToast('✅ Merchant diperbarui!');
    autoSyncInternal(newMerchants, photos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  const updateField = useCallback((id: number, field: keyof Merchant, value: string) => {
    setMerchantsState(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, [field]: value } : m);
      saveMerchants(updated);
      return updated;
    });
  }, []);

  const saveCard = useCallback((id: number) => {
    dirtyIds.current.add(id);
    saveMerchants(merchants);
    showToast('💾 Tersimpan!');
    autoSyncInternal(merchants, photos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  const deleteMerchant = useCallback(async (id: number) => {
    const newMerchants = merchants.filter(m => Number(m.id) !== id);
    const newPhotos = { ...photos };
    delete newPhotos[id];
    dirtyIds.current.delete(id);
    setMerchants(newMerchants);
    setPhotos(newPhotos);
    setExpandedId(null);
    showToast('🗑️ Merchant dihapus');

    const url = scriptUrl;
    if (url) {
      try {
        setSyncState('syncing');
        showSyncBar('🔄 Menghapus dari Sheets...', 'loading');
        await apiCall(url, { action: 'delete', id });
        setSyncState('online');
        showSyncBar('✅ Berhasil dihapus dari Sheets!');
      } catch (e) {
        setSyncState('offline');
        showSyncBar('❌ Gagal hapus dari Sheets: ' + ((e as Error).message || String(e)), 'error');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, scriptUrl]);

  const addPhoto = useCallback((merchantId: number, base64: string) => {
    setPhotosState(prev => {
      const current = prev[merchantId] || [];
      const idx = current.length;
      const updated = { ...prev, [merchantId]: [...current, base64] };
      storageSavePhotos(updated);

      // Upload to Supabase in background
      uploadPhotoToSupabase(base64, merchantId, idx, sbCfg, showSyncBar).then(uploadedUrl => {
        if (uploadedUrl && uploadedUrl.startsWith('http')) {
          setPhotosState(p2 => {
            const arr = [...(p2[merchantId] || [])];
            arr[idx] = uploadedUrl;
            const p3 = { ...p2, [merchantId]: arr };
            storageSavePhotos(p3);
            return p3;
          });
          dirtyIds.current.add(merchantId);
          autoSyncInternal(merchants, { ...photos, [merchantId]: (() => { const a=[...(photos[merchantId]||[])]; a[idx]=uploadedUrl; return a; })() });
        }
      }).catch(() => {});

      return updated;
    });
    dirtyIds.current.add(merchantId);
    autoSyncInternal(merchants, photos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sbCfg, merchants, photos]);

  const deletePhoto = useCallback((merchantId: number, idx: number) => {
    setPhotosState(prev => {
      const arr = [...(prev[merchantId] || [])];
      arr.splice(idx, 1);
      const updated = { ...prev, [merchantId]: arr };
      storageSavePhotos(updated);
      return updated;
    });
    dirtyIds.current.add(merchantId);
  }, []);

  // ── Internal auto-sync (uses passed state to avoid stale closure) ──
  const autoSyncInternal = useCallback((currentMerchants: Merchant[], currentPhotos: Photos) => {
    if (!scriptUrl) return;
    if (syncingRef.current) { pendingSync.current = true; return; }
    syncNowInternal(currentMerchants, currentPhotos, scriptUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl]);

  const syncNowInternal = useCallback(async (
    currentMerchants: Merchant[],
    currentPhotos: Photos,
    url: string
  ) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncState('syncing');
    const hasDirty = dirtyIds.current.size > 0;
    showSyncBar(`🔄 Menyinkronkan${hasDirty ? ` ${dirtyIds.current.size} data` : ' semua data'}...`, 'loading');

    try {
      // STEP 1: PUSH dirty
      if (hasDirty) {
        const snapshotDirty = new Set([...dirtyIds.current].map(String));
        const toSync = currentMerchants.filter(m => snapshotDirty.has(String(m.id)));
        let res: Record<string, unknown>;
        try {
          res = await apiCall(url, { action: 'upsert', merchants: buildPayload(toSync, currentPhotos) });
        } catch (upsertErr) {
          const msg = ((upsertErr as Error).message || '').toLowerCase();
          if (msg.includes('unknown') || msg.includes('invalid') || msg.includes('respons tidak valid')) {
            console.warn('⚠️ upsert tidak didukung Apps Script, fallback ke save penuh...');
            showSyncBar('🔄 Kompatibilitas: sync penuh...', 'loading');
            res = await apiCall(url, { action: 'save', merchants: buildPayload(currentMerchants, currentPhotos) });
          } else { throw upsertErr; }
        }
        snapshotDirty.forEach(id => dirtyIds.current.delete(Number(id)));
        showSyncBar(`🔄 Pushed ${(res['saved'] as number) ?? toSync.length} data, pulling updates...`, 'loading');
      }

      // STEP 2: PULL latest
      const json = await fetchFromSheets(url);

      if (json['merchants'] && (json['merchants'] as Merchant[]).length) {
        const pulled = (json['merchants'] as Merchant[]).map(m => ({
          ...m,
          id: Number(m.id) || m.id,
        }));
        // Merge photos (keep local base64)
        const newPhotos = { ...currentPhotos };
        (json['merchants'] as (Merchant & { photos?: string })[]).forEach(m => {
          const numId = Number(m.id) || m.id as unknown as number;
          if (m.photos) {
            const urls = m.photos.split('|').filter(Boolean);
            const local = (newPhotos[numId] || []).filter((p: string) => p.startsWith('data:'));
            if (urls.length || local.length) newPhotos[numId] = [...urls, ...local];
          }
        });

        dirtyIds.current.clear();
        setMerchants(pulled);
        setPhotos(newPhotos);
        setSyncState('online');
        showSyncBar(`✅ Sync lengkap! ${pulled.length} merchant tersinkron.`);
      } else {
        setSyncState('online');
        showSyncBar('✅ Sync selesai!', 'success');
      }
    } catch (e) {
      setSyncState('offline');
      let msg = (e as Error).message || String(e);
      if (!msg || msg === 'undefined') msg = 'Gagal terhubung ke Apps Script. Periksa URL dan koneksi.';
      showSyncBar('❌ ' + msg, 'error');
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      if (pendingSync.current && dirtyIds.current.size > 0) {
        pendingSync.current = false;
        setTimeout(() => syncNowInternal(merchants, photos, scriptUrl), 400);
      } else {
        pendingSync.current = false;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Public sync actions ────────────────────────────────────────
  const syncNow = useCallback(() => {
    if (!scriptUrl) { showSyncBar('❌ Script URL belum diatur. Buka Setup.', 'error'); return; }
    syncNowInternal(merchants, photos, scriptUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, scriptUrl]);

  const syncAll = useCallback(async () => {
    if (syncingRef.current) return;
    if (!scriptUrl) { showSyncBar('❌ Script URL belum diatur.', 'error'); return; }
    syncingRef.current = true; setSyncing(true); setSyncState('syncing');
    showSyncBar('🔄 Full sync semua data ke Sheets...', 'loading');
    try {
      const res = await apiCall(scriptUrl, { action: 'save', merchants: buildPayload(merchants, photos) });
      dirtyIds.current.clear(); setSyncState('online');
      showSyncBar(`✅ Full sync selesai! ${(res['saved'] as number) ?? merchants.length} merchant tersimpan.`);
    } catch (e) {
      setSyncState('offline');
      showSyncBar('❌ Sync gagal: ' + ((e as Error).message || String(e)), 'error');
    } finally { syncingRef.current = false; setSyncing(false); pendingSync.current = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, scriptUrl]);

  const pullFromSheets = useCallback(async () => {
    if (!scriptUrl) { showSyncBar('❌ Script URL belum diatur.', 'error'); return; }
    setSyncState('syncing'); showSyncBar('⬇️ Mengambil data dari Sheets...', 'loading');
    try {
      const json = await fetchFromSheets(scriptUrl);
      if (json['merchants'] && (json['merchants'] as Merchant[]).length) {
        const pulled = (json['merchants'] as Merchant[]).map(m => ({ ...m, id: Number(m.id) || m.id as unknown as number }));
        const newPhotos = { ...photos };
        (json['merchants'] as (Merchant & { photos?: string })[]).forEach(m => {
          const numId = Number(m.id) || m.id as unknown as number;
          if (m.photos) {
            const urls = m.photos.split('|').filter(Boolean);
            const local = (newPhotos[numId] || []).filter((p: string) => p.startsWith('data:'));
            if (urls.length || local.length) newPhotos[numId] = [...urls, ...local];
          }
        });
        dirtyIds.current.clear();
        setMerchants(pulled); setPhotos(newPhotos);
        setSyncState('online'); showSyncBar(`✅ Berhasil! ${pulled.length} merchant dipull dari Sheets.`);
        setSetupModalOpen(false);
      } else { setSyncState('offline'); showSyncBar('ℹ️ Sheets kosong atau belum ada data.', 'error'); }
    } catch (e) { setSyncState('offline'); showSyncBar('❌ Pull gagal: ' + ((e as Error).message || String(e)), 'error'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl, photos]);

  const testConn = useCallback(async () => {
    if (!scriptUrl) { showSyncBar('❌ Script URL belum diatur.', 'error'); return; }
    showSyncBar('🔌 Testing koneksi...', 'loading');
    try {
      await testConnection(scriptUrl);
      showSyncBar('✅ Koneksi berhasil! Apps Script aktif.'); setSyncState('online');
    } catch (e) { showSyncBar('❌ Gagal: ' + (e as Error).message, 'error'); setSyncState('offline'); }
  }, [scriptUrl]);

  const saveSupabase = useCallback((url: string, key: string) => {
    if (!url || !key) { showToast('⚠️ URL dan Key wajib diisi!'); return; }
    const cfg = { url: url.trim().replace(/\/$/, ''), key: key.trim() };
    setSbCfgState(cfg); saveSbCfg(cfg);
    showToast('✅ Supabase tersimpan!');
  }, []);

  const clearSupabase = useCallback(() => {
    setSbCfgState({ url: '', key: '' }); storageClearSbCfg();
    showToast('🗑️ Config Supabase dihapus');
  }, []);

  const testSupabase = useCallback(async (url: string, key: string) => {
    await testSupabaseConnection({ url, key }, showSyncBar);
  }, [showSyncBar]);

  const saveScriptUrlAction = useCallback((url: string) => {
    if (!url) { showToast('⚠️ Script URL wajib diisi!'); return; }
    if (!url.includes('script.google.com')) { showToast('⚠️ URL harus dari Google Apps Script'); return; }
    setScriptUrlState(url); storageSaveScriptUrl(url);
    showToast('✅ Script URL tersimpan! Siap untuk sync.');
  }, []);

  const value: AppContextValue = {
    merchants, photos, filters, currentPage, expandedId,
    syncDot, syncBar, sbCfg, scriptUrl, syncing,
    toast, lightboxSrc, filterPanelOpen, setupModalOpen,
    addModalOpen, editModalOpen, editingId, confirmModal,
    setFilters, setCurrentPage, setExpandedId, setSbCfg, setScriptUrl,
    setFilterPanelOpen, setSetupModalOpen, setAddModalOpen, setEditModalOpen,
    setEditingId, setConfirmModal,
    openLightbox, closeLightbox, showToast, showSyncBar,
    addMerchant, updateMerchant, updateField, saveCard, deleteMerchant,
    addPhoto, deletePhoto,
    syncNow, syncAll, pullFromSheets, testConn,
    saveSupabase, clearSupabase, testSupabase, saveScriptUrlAction,
    getFilteredMerchants, getPhotos,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
