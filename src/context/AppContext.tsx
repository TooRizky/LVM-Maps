import React, {
  createContext, useContext, useState,
  useCallback, useRef, useEffect,
} from 'react';
import type { Merchant, Photos, Filters, Page } from '../types';
import { loadMerchants, saveMerchants, loadPhotos, savePhotos } from '../lib/storage';
import { getFiltered } from '../lib/merchantUtils';
import {
  dbFetchAll, dbUpsert, dbUpsertBatch, dbDelete,
  dbUploadPhoto, dbTestConnection, isConfigured,
  type MerchantRow,
} from '../lib/supabaseClient';
import { exportToExcel } from '../lib/exportExcel';

// ── Sync bar state ────────────────────────────────────
interface SyncBarState { message: string; type: '' | 'loading' | 'error' | 'success'; show: boolean; }

// ── Context shape ─────────────────────────────────────
interface AppContextValue {
  merchants: Merchant[];
  photos: Photos;
  filters: Filters;
  currentPage: Page;
  expandedId: number | null;
  syncDot: 'online' | 'offline' | 'syncing';
  syncBar: SyncBarState;
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

  addMerchant: (m: Omit<Merchant, 'id'>, pendingPhotos: string[]) => Promise<void>;
  updateMerchant: (m: Merchant) => Promise<void>;
  deleteMerchant: (id: number) => Promise<void>;
  addPhoto: (merchantId: number, base64: string) => Promise<void>;
  deletePhoto: (merchantId: number, idx: number) => Promise<void>;

  syncNow: () => Promise<void>;
  pushAllToSupabase: () => Promise<void>;
  testSupabase: () => Promise<void>;
  doExportExcel: () => Promise<void>;

  getFilteredMerchants: () => Merchant[];
  getPhotos: (id: number) => string[];
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Helper: Merchant → MerchantRow (for Supabase) ────
function toRow(m: Merchant, photos: Photos): MerchantRow {
  return {
    id:            m.id,
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
    photos:        (photos[m.id]   || []).filter(u => u?.startsWith('http')).join('|'),
    updated_at:    new Date().toISOString(),
  };
}

// ── Helper: MerchantRow → Merchant + Photos ───────────
function fromRows(rows: MerchantRow[]): { merchants: Merchant[]; photos: Photos } {
  const photos: Photos = {};
  const merchants = rows.map(row => {
    const urls = (row.photos || '').split('|').filter(Boolean);
    if (urls.length) photos[row.id] = urls;
    return {
      id:            row.id,
      nama:          row.nama,
      business:      row.business,
      kawasan:       row.kawasan,
      mandiri_rek:   row.mandiri_rek,
      mandiri_edc:   row.mandiri_edc,
      mandiri_qr:    row.mandiri_qr,
      bank_lain_edc: row.bank_lain_edc,
      bank_lain_qr:  row.bank_lain_qr,
      visit:         row.visit,
      hasil_visit:   row.hasil_visit,
      keterangan:    row.keterangan,
    } as Merchant;
  });
  return { merchants, photos };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Data state ──────────────────────────────────────
  const [merchants, setMerchantsRaw] = useState<Merchant[]>(() => loadMerchants());
  const [photos,    setPhotosRaw]    = useState<Photos>(() => loadPhotos());
  const nextId = useRef(Math.max(...(loadMerchants().map(m => Number(m.id) || 0)), 299) + 1);

  // ── UI state ────────────────────────────────────────
  const [filters, setFiltersRaw] = useState<Filters>({
    searchQ: '', filterBiz: '', filterVisit: '',
    filterHasil: '', filterMandiri: '', filterNama: '',
    activeKawasan: 'ALL',
  });
  const [currentPage,   setCurrentPage]   = useState<Page>('dashboard');
  const [expandedId,    setExpandedId]    = useState<number | null>(null);
  const [syncDot,       setSyncDot]       = useState<'online'|'offline'|'syncing'>('online');
  const [syncBar,       setSyncBarState]  = useState<SyncBarState>({ message:'', type:'', show:false });
  const [syncing,       setSyncing]       = useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [toast,         setToast]         = useState('');
  const [lightboxSrc,   setLightboxSrc]   = useState('');
  const [filterPanelOpen,  setFilterPanelOpen]  = useState(false);
  const [addModalOpen,     setAddModalOpen]     = useState(false);
  const [editModalOpen,    setEditModalOpen]    = useState(false);
  const [editingId,        setEditingId]        = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{open:boolean;id:number|null;nama:string}>({
    open:false, id:null, nama:'',
  });

  const syncingRef     = useRef(false);
  const toastTimer     = useRef<ReturnType<typeof setTimeout>|null>(null);
  const syncBarTimer   = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── State setters with side effects ─────────────────
  const setMerchants = useCallback((m: Merchant[]) => {
    setMerchantsRaw(m);
    saveMerchants(m);
    nextId.current = Math.max(...m.map(x => Number(x.id)||0), 299) + 1;
  }, []);

  const setPhotos = useCallback((p: Photos) => {
    setPhotosRaw(p);
    savePhotos(p);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const showSyncBar = useCallback((msg: string, type: ''|'loading'|'error'|'success' = '') => {
    setSyncBarState({ message: msg, type, show: true });
    if (syncBarTimer.current) clearTimeout(syncBarTimer.current);
    if (type !== 'loading') {
      syncBarTimer.current = setTimeout(() => setSyncBarState(p => ({ ...p, show: false })), 4500);
    }
  }, []);

  const setFilters   = useCallback((f: Partial<Filters>) => setFiltersRaw(prev => ({ ...prev, ...f })), []);
  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(''), []);

  const getFilteredMerchants = useCallback(() => getFiltered(merchants, filters), [merchants, filters]);
  const getPhotos = useCallback((id: number) => photos[id] || [], [photos]);

  // ── On mount: fetch fresh data from Supabase ─────────
  useEffect(() => {
    if (!isConfigured()) {
      showSyncBar('⚠️ Supabase belum dikonfigurasi — data lokal dipakai. Isi .env', 'error');
      return;
    }
    (async () => {
      setSyncDot('syncing');
      try {
        const rows = await dbFetchAll();
        const { merchants: m, photos: p } = fromRows(rows);
        setMerchants(m);
        setPhotos(p);
        setSyncDot('online');
        showSyncBar(`✅ ${m.length} merchant dimuat dari Supabase`);
      } catch (e) {
        setSyncDot('offline');
        showSyncBar('❌ Gagal konek Supabase — pakai data lokal: ' + (e as Error).message, 'error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── CRUD — Add ───────────────────────────────────────
  const addMerchant = useCallback(async (
    m: Omit<Merchant, 'id'>,
    pendingPhotos: string[]
  ) => {
    const id = nextId.current++;
    const newM: Merchant = { ...m, id };

    // Optimistic update lokal
    const newMerchants = [newM, ...merchants];
    const newPhotos    = { ...photos };
    if (pendingPhotos.length) newPhotos[id] = [...pendingPhotos];
    setMerchants(newMerchants);
    setPhotosRaw(newPhotos);
    showToast('✅ Merchant ditambahkan!');

    // Upload foto ke Storage dulu (background), lalu save ke DB
    (async () => {
      let finalPhotos = [...(newPhotos[id] || [])];
      if (pendingPhotos.length) {
        const uploaded: string[] = [];
        for (let i = 0; i < pendingPhotos.length; i++) {
          const url = await dbUploadPhoto(pendingPhotos[i], id, i, showSyncBar);
          uploaded.push(url);
        }
        finalPhotos = uploaded;
        const updatedPhotos = { ...newPhotos, [id]: uploaded };
        setPhotos(updatedPhotos);
      }

      // Save merchant ke Supabase dengan photo URLs final
      const finalPhotoMap = { ...photos, [id]: finalPhotos };
      try {
        setSyncDot('syncing');
        await dbUpsert(toRow(newM, finalPhotoMap));
        setSyncDot('online');
        showSyncBar('✅ Merchant tersimpan ke Supabase!');
      } catch (e) {
        setSyncDot('offline');
        showSyncBar('❌ Gagal simpan ke Supabase: ' + (e as Error).message, 'error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  // ── CRUD — Update ────────────────────────────────────
  const updateMerchant = useCallback(async (updated: Merchant) => {
    // Optimistic update
    const newMerchants = merchants.map(m => m.id === updated.id ? updated : m);
    setMerchants(newMerchants);
    showToast('✅ Perubahan disimpan!');

    try {
      setSyncDot('syncing');
      await dbUpsert(toRow(updated, photos));
      setSyncDot('online');
    } catch (e) {
      setSyncDot('offline');
      showSyncBar('❌ Gagal update ke Supabase: ' + (e as Error).message, 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  // ── CRUD — Delete ─────────────────────────────────────
  const deleteMerchant = useCallback(async (id: number) => {
    const newMerchants = merchants.filter(m => Number(m.id) !== id);
    const newPhotos    = { ...photos };
    delete newPhotos[id];
    setMerchants(newMerchants);
    setPhotos(newPhotos);
    setExpandedId(null);
    showToast('🗑️ Merchant dihapus');

    try {
      setSyncDot('syncing');
      await dbDelete(id);
      setSyncDot('online');
      showSyncBar('✅ Berhasil dihapus dari Supabase!');
    } catch (e) {
      setSyncDot('offline');
      showSyncBar('❌ Gagal hapus dari Supabase: ' + (e as Error).message, 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  // ── Photo — Add ──────────────────────────────────────
  const addPhoto = useCallback(async (merchantId: number, base64: string) => {
    // Tambah base64 lokal dulu (preview instan)
    const currentUrls = photos[merchantId] || [];
    const localIdx    = currentUrls.length;
    const withLocal   = { ...photos, [merchantId]: [...currentUrls, base64] };
    setPhotos(withLocal);

    // Upload ke Supabase Storage
    const uploadedUrl = await dbUploadPhoto(base64, merchantId, localIdx, showSyncBar);

    // Ganti base64 dengan public URL
    setPhotosRaw(prev => {
      const arr = [...(prev[merchantId] || [])];
      arr[localIdx] = uploadedUrl;
      const updated = { ...prev, [merchantId]: arr };
      savePhotos(updated);

      // Update merchant record di Supabase dengan URL baru
      const merchant = merchants.find(m => m.id === merchantId);
      if (merchant) {
        dbUpsert(toRow(merchant, updated))
          .then(() => setSyncDot('online'))
          .catch(e => { setSyncDot('offline'); showSyncBar('❌ Gagal simpan foto: ' + (e as Error).message, 'error'); });
      }
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, merchants]);

  // ── Photo — Delete ───────────────────────────────────
  const deletePhoto = useCallback(async (merchantId: number, idx: number) => {
    const arr     = [...(photos[merchantId] || [])];
    arr.splice(idx, 1);
    const updated = { ...photos, [merchantId]: arr };
    setPhotos(updated);

    // Update merchant record di Supabase
    const merchant = merchants.find(m => m.id === merchantId);
    if (merchant) {
      try {
        setSyncDot('syncing');
        await dbUpsert(toRow(merchant, updated));
        setSyncDot('online');
      } catch (e) {
        setSyncDot('offline');
        showSyncBar('❌ Gagal update foto: ' + (e as Error).message, 'error');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, merchants]);

  // ── Sync Now — fetch fresh dari Supabase ─────────────
  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (!isConfigured()) { showSyncBar('❌ VITE_SUPABASE_URL / KEY belum diisi di .env', 'error'); return; }
    syncingRef.current = true; setSyncing(true); setSyncDot('syncing');
    showSyncBar('🔄 Mengambil data terbaru dari Supabase…', 'loading');
    try {
      const rows = await dbFetchAll();
      const { merchants: m, photos: p } = fromRows(rows);
      setMerchants(m);
      setPhotos(p);
      setSyncDot('online');
      showSyncBar(`✅ Sync selesai! ${m.length} merchant diperbarui.`);
    } catch (e) {
      setSyncDot('offline');
      showSyncBar('❌ Sync gagal: ' + (e as Error).message, 'error');
    } finally {
      syncingRef.current = false; setSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push All — kirim semua data lokal ke Supabase ────
  const pushAllToSupabase = useCallback(async () => {
    if (!isConfigured()) { showSyncBar('❌ Supabase belum dikonfigurasi.', 'error'); return; }
    if (!merchants.length) { showSyncBar('⚠️ Tidak ada data lokal untuk di-push.', 'error'); return; }
    showSyncBar(`🔄 Push ${merchants.length} merchant ke Supabase…`, 'loading');
    try {
      setSyncDot('syncing');
      await dbUpsertBatch(merchants.map(m => toRow(m, photos)));
      setSyncDot('online');
      showSyncBar(`✅ ${merchants.length} merchant berhasil di-push ke Supabase!`);
    } catch (e) {
      setSyncDot('offline');
      showSyncBar('❌ Push gagal: ' + (e as Error).message, 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos]);

  // ── Test koneksi ─────────────────────────────────────
  const testSupabase = useCallback(async () => {
    await dbTestConnection(showSyncBar);
  }, [showSyncBar]);

  // ── Export Excel ─────────────────────────────────────
  const doExportExcel = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    await exportToExcel(merchants, photos, showSyncBar);
    setExporting(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchants, photos, exporting]);

  const value: AppContextValue = {
    merchants, photos, filters, currentPage, expandedId,
    syncDot, syncBar, syncing, exporting,
    toast, lightboxSrc, filterPanelOpen,
    addModalOpen, editModalOpen, editingId, confirmModal,
    setFilters, setCurrentPage, setExpandedId,
    setFilterPanelOpen, setAddModalOpen, setEditModalOpen,
    setEditingId, setConfirmModal,
    openLightbox, closeLightbox, showToast, showSyncBar,
    addMerchant, updateMerchant, deleteMerchant,
    addPhoto, deletePhoto,
    syncNow, pushAllToSupabase, testSupabase, doExportExcel,
    getFilteredMerchants, getPhotos,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
