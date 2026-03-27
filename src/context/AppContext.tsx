import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { Merchant, Photos, SbConfig, Filters, Page } from '../types';
import {
  loadMerchants, saveMerchants,
  loadPhotos, savePhotos as storageSavePhotos,
  loadSbCfg, loadScriptUrl,
} from '../lib/storage';
import { getFiltered, buildPayload } from '../lib/merchantUtils';
import { apiCall, fetchFromSheets } from '../lib/sync';
import { uploadPhotoToSupabase } from '../lib/supabase';
import { SCRIPT_URL, SB_URL, SB_KEY } from '../lib/constants';
import { exportToExcel } from '../lib/exportExcel';

interface SyncBarState {
  message: string;
  type: '' | 'loading' | 'error' | 'success';
  show: boolean;
}

interface AppContextValue {
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
  exporting: boolean;
  toast: string;
  lightboxSrc: string;
  filterPanelOpen: boolean;
  addModalOpen: boolean;
  editModalOpen: boolean;
  editingId: number | null;
  confirmModal: { open: boolean; id: number | null; nama: string };

  setFilters: (f: Partial<Filters>) => void;
  setCurrentPage: (p: Page) => void;
  setExpandedId: (id: number | null) => void;
  setFilterPanelOpen: (v: boolean) => void;
  setAddModalOpen: (v: boolean) => void;
  setEditModalOpen: (v: boolean) => void;
  setEditingId: (id: number | null) => void;
  setConfirmModal: (v: { open: boolean; id: number | null; nama: string }) => void;
  openLightbox: (src: string) => void;
  closeLightbox: () => void;
  showToast: (msg: string) => void;
  showSyncBar: (msg: string, type?: '' | 'loading' | 'error' | 'success') => void;

  addMerchant: (m: Omit<Merchant, 'id'>, pendingPhotos: string[]) => void;
  updateMerchant: (m: Merchant) => void;
  updateField: (id: number, field: keyof Merchant, value: string) => void;
  saveCard: (id: number) => void;
  deleteMerchant: (id: number) => void;
  addPhoto: (merchantId: number, base64: string) => void;
  deletePhoto: (merchantId: number, idx: number) => void;

  syncNow: () => void;
  syncAll: () => void;
  pullFromSheets: () => void;
  doExportExcel: () => void;

  getFilteredMerchants: () => Merchant[];
  getPhotos: (id: number) => string[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [merchants, setMerchantsState] = useState<Merchant[]>(() => loadMerchants());
  const [photos, setPhotosState] = useState<Photos>(() => loadPhotos());
  const nextId = useRef(Math.max(...(loadMerchants().map(m => Number(m.id) || 0)), 299) + 1);
  const dirtyIds = useRef(new Set<number>());

  // Config hardcoded from .env — no setup modal needed
  const sbCfg: SbConfig = (SB_URL && SB_KEY)
    ? { url: SB_URL, key: SB_KEY }
    : loadSbCfg();
  const scriptUrl: string = SCRIPT_URL || loadScriptUrl();

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
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
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
  const setFilters = useCallback((f: Partial<Filters>) => setFiltersState(prev => ({ ...prev, ...f })), []);
  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(''), []);

  const getFilteredMerchants = useCallback(() => getFiltered(merchants, filters), [merchants, filters]);
  const getPhotos = useCallback((id: number) => photos[id] || [], [photos]);

  // ── CRUD ─────────────────────────────────────────────────────
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
    if (pendingPhotos.length) {
      (async () => {
        const uploaded: string[] = [];
        for (let i = 0; i < pendingPhotos.length; i++) {
          const url = await uploadPhotoToSupabase(pendingPhotos[i], id, i, sbCfg, showSyncBar);
          uploaded.push(url);
        }
        setPhotosState(prev => { const u = { ...prev, [id]: uploaded }; storageSavePhotos(u); return u; });
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
    if (scriptUrl) {
      try {
        setSyncState('syncing');
        showSyncBar('🔄 Menghapus dari Sheets...', 'loading');
        await apiCall(scriptUrl, { action: 'delete', id });
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
      uploadPhotoToSupabase(base64, merchantId, idx, sbCfg, showSyncBar).then(url => {
        if (url?.startsWith('http')) {
          setPhotosState(p2 => {
            const arr = [...(p2[merchantId] || [])];
            arr[idx] = url;
            const p3 = { ...p2, [merchantId]: arr };
            storageSavePhotos(p3);
            return p3;
          });
          dirtyIds.current.add(merchantId);
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

  // ── Sync internals ────────────────────────────────────────────
  const autoSyncInternal = useCallback((m: Merchant[], p: Photos) => {
    if (!scriptUrl) return;
    if (syncingRef.current) { pendingSync.current = true; return; }
    syncNowInternal(m, p, scriptUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl]);

  const syncNowInternal = useCallback(async (m: Merchant[], p: Photos, url: string) => {
    if (syncingRef.current) return;
    syncingRef.current = true; setSyncing(true); setSyncState('syncing');
    const hasDirty = dirtyIds.current.size > 0;
    showSyncBar(`🔄 Menyinkronkan${hasDirty ? ` ${dirtyIds.current.size} data` : ''}...`, 'loading');
    try {
      if (hasDirty) {
        const snap = new Set([...dirtyIds.current].map(String));
        const toSync = m.filter(x => snap.has(String(x.id)));
        let res: Record<string, unknown>;
        try {
          res = await apiCall(url, { action: 'upsert', merchants: buildPayload(toSync, p) });
        } catch (upsertErr) {
          const msg = ((upsertErr as Error).message || '').toLowerCase();
          if (msg.includes('unknown') || msg.includes('invalid') || msg.includes('respons tidak valid')) {
            showSyncBar('🔄 Fallback: sync penuh...', 'loading');
            res = await apiCall(url, { action: 'save', merchants: buildPayload(m, p) });
          } else throw upsertErr;
        }
        snap.forEach(id => dirtyIds.current.delete(Number(id)));
        showSyncBar(`🔄 Pushed ${(res['saved'] as number) ?? toSync.length} data...`, 'loading');
      }
      const json = await fetchFromSheets(url);
      if (json['merchants'] && (json['merchants'] as Merchant[]).length) {
        const pulled = (json['merchants'] as Merchant[]).map(x => ({ ...x, id: Number(x.id) || x.id as unknown as number }));
        const np = { ...p };
        (json['merchants'] as (Merchant & { photos?: string })[]).forEach(x => {
          const nid = Number(x.id) || x.id as unknown as number;
          if (x.photos) {
            const urls = x.photos.split('|').filter(Boolean);
            const local = (np[nid] || []).filter((s: string) => s.startsWith('data:'));
            if (urls.length || local.length) np[nid] = [...urls, ...local];
          }
        });
        dirtyIds.current.clear();
        setMerchants(pulled); setPhotos(np);
        setSyncState('online');
        showSyncBar(`✅ Sync lengkap! ${pulled.length} merchant.`);
      } else {
        setSyncState('online'); showSyncBar('✅ Sync selesai!', 'success');
      }
    } catch (e) {
      setSyncState('offline');
      showSyncBar('❌ ' + ((e as Error).message || 'Gagal sync'), 'error');
    } finally {
      syncingRef.current = false; setSyncing(false);
      if (pendingSync.current && dirtyIds.current.size > 0) {
        pendingSync.current = false;
        setTimeout(() => syncNowInternal(merchants, photos, scriptUrl), 400);
      } else pendingSync.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncNow = useCallback(() => {
    if (!scriptUrl) { showSyncBar('❌ VITE_SCRIPT_URL belum diisi di .env', 'error'); return; }
    syncNowInternal(merchants, photos, scriptUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, scriptUrl]);

  const syncAll = useCallback(async () => {
    if (syncingRef.current) return;
    if (!scriptUrl) { showSyncBar('❌ VITE_SCRIPT_URL belum diisi di .env', 'error'); return; }
    syncingRef.current = true; setSyncing(true); setSyncState('syncing');
    showSyncBar('🔄 Full sync ke Sheets...', 'loading');
    try {
      const res = await apiCall(scriptUrl, { action: 'save', merchants: buildPayload(merchants, photos) });
      dirtyIds.current.clear(); setSyncState('online');
      showSyncBar(`✅ Full sync selesai! ${(res['saved'] as number) ?? merchants.length} merchant.`);
    } catch (e) {
      setSyncState('offline');
      showSyncBar('❌ ' + ((e as Error).message || String(e)), 'error');
    } finally { syncingRef.current = false; setSyncing(false); pendingSync.current = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, scriptUrl]);

  const pullFromSheets = useCallback(async () => {
    if (!scriptUrl) { showSyncBar('❌ VITE_SCRIPT_URL belum diisi di .env', 'error'); return; }
    setSyncState('syncing'); showSyncBar('⬇️ Mengambil data dari Sheets...', 'loading');
    try {
      const json = await fetchFromSheets(scriptUrl);
      if (json['merchants'] && (json['merchants'] as Merchant[]).length) {
        const pulled = (json['merchants'] as Merchant[]).map(m => ({ ...m, id: Number(m.id) || m.id as unknown as number }));
        const np = { ...photos };
        (json['merchants'] as (Merchant & { photos?: string })[]).forEach(m => {
          const nid = Number(m.id) || m.id as unknown as number;
          if (m.photos) {
            const urls = m.photos.split('|').filter(Boolean);
            const local = (np[nid] || []).filter((s: string) => s.startsWith('data:'));
            if (urls.length || local.length) np[nid] = [...urls, ...local];
          }
        });
        dirtyIds.current.clear(); setMerchants(pulled); setPhotos(np);
        setSyncState('online'); showSyncBar(`✅ ${pulled.length} merchant dipull dari Sheets.`);
      } else { setSyncState('offline'); showSyncBar('ℹ️ Sheets kosong.', 'error'); }
    } catch (e) { setSyncState('offline'); showSyncBar('❌ ' + ((e as Error).message || String(e)), 'error'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl, photos]);

  // ── Export Excel ──────────────────────────────────────────────
  const doExportExcel = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    await exportToExcel(scriptUrl, merchants, showSyncBar);
    setExporting(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptUrl, merchants, exporting]);

  const value: AppContextValue = {
    merchants, photos, filters, currentPage, expandedId,
    syncDot, syncBar, sbCfg, scriptUrl, syncing, exporting,
    toast, lightboxSrc, filterPanelOpen,
    addModalOpen, editModalOpen, editingId, confirmModal,
    setFilters, setCurrentPage, setExpandedId,
    setFilterPanelOpen, setAddModalOpen, setEditModalOpen,
    setEditingId, setConfirmModal,
    openLightbox, closeLightbox, showToast, showSyncBar,
    addMerchant, updateMerchant, updateField, saveCard, deleteMerchant,
    addPhoto, deletePhoto,
    syncNow, syncAll, pullFromSheets, doExportExcel,
    getFilteredMerchants, getPhotos,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
