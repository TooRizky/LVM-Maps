import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { BUSINESS_TYPES, KAWASAN_LIST } from '../../lib/constants';
import type { Merchant } from '../../types';

export default function AddModal() {
  const { addModalOpen, setAddModalOpen, addMerchant } = useApp();

  const [nama,       setNama]       = useState('');
  const [business,   setBusiness]   = useState<string>('F&B');
  const [kawasan,    setKawasan]    = useState<string>('A');
  const [visit,      setVisit]      = useState('');
  const [hasilVisit, setHasilVisit] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [checks, setChecks] = useState({
    mandiri_rek: false, mandiri_edc: false, mandiri_qr: false,
    bank_lain_edc: false, bank_lain_qr: false,
  });
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setNama(''); setBusiness('F&B'); setKawasan('A'); setVisit('');
    setHasilVisit(''); setKeterangan('');
    setChecks({ mandiri_rek:false, mandiri_edc:false, mandiri_qr:false, bank_lain_edc:false, bank_lain_qr:false });
    setPendingPhotos([]);
  };

  const close = () => { setAddModalOpen(false); reset(); };
  const toggleChk = (key: keyof typeof checks) =>
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = e => { if (e.target?.result) setPendingPhotos(prev => [...prev, e.target!.result as string]); };
      r.readAsDataURL(f);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!nama.trim()) { alert('⚠️ Nama merchant wajib!'); return; }
    const m: Omit<Merchant, 'id'> = {
      nama: nama.trim(), business, kawasan,
      mandiri_rek:   checks.mandiri_rek   ? 'V' : '',
      mandiri_edc:   checks.mandiri_edc   ? 'V' : '',
      mandiri_qr:    checks.mandiri_qr    ? 'V' : '',
      bank_lain_edc: checks.bank_lain_edc ? 'V' : '',
      bank_lain_qr:  checks.bank_lain_qr  ? 'V' : '',
      visit,
      hasil_visit:   hasilVisit.trim(),
      keterangan:    keterangan.trim(),
    };
    await addMerchant(m, [...pendingPhotos]);
    close();
  };

  return (
    <div className={`modal-overlay${addModalOpen ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={close}>✕</button>
        <div className="modal-handle" />
        <div className="modal-title">＋ Tambah Merchant Baru</div>

        <div className="form-group">
          <label>Nama Merchant *</label>
          <input type="text" placeholder="Nama toko / merchant" value={nama} onChange={e => setNama(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Tipe Bisnis</label>
          <select value={business} onChange={e => setBusiness(e.target.value)}>
            {BUSINESS_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Kawasan</label>
          <select value={kawasan} onChange={e => setKawasan(e.target.value)}>
            {KAWASAN_LIST.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>🏦 Produk Mandiri</label>
          <div className="form-check-grid">
            {(['mandiri_rek','mandiri_edc','mandiri_qr'] as const).map(key => (
              <label key={key} className={`form-check${checks[key] ? ' checked' : ''}`} onClick={() => toggleChk(key)}>
                <span className="chk-box">{checks[key] ? '✓' : ''}</span>
                {key === 'mandiri_rek' ? 'Rekening' : key === 'mandiri_edc' ? 'EDC' : 'QR / QRIS'}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>🏧 Bank Lain</label>
          <div className="form-check-grid">
            {(['bank_lain_edc','bank_lain_qr'] as const).map(key => (
              <label key={key} className={`form-check${checks[key] ? ' checked' : ''}`} onClick={() => toggleChk(key)}>
                <span className="chk-box">{checks[key] ? '✓' : ''}</span>
                {key === 'bank_lain_edc' ? 'EDC' : 'QR'}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>🚶 Status Visit</label>
          <select value={visit} onChange={e => setVisit(e.target.value)}>
            <option value="">Belum Visit</option>
            <option value="SUDAH">✅ Sudah Visit</option>
          </select>
        </div>
        <div className="form-group">
          <label>📋 Hasil Visit</label>
          <input type="text" placeholder="FOLLOW UP / SUDAH / TIDAK BERMINAT…" value={hasilVisit} onChange={e => setHasilVisit(e.target.value)} />
        </div>
        <div className="form-group">
          <label>📝 Keterangan</label>
          <textarea rows={2} placeholder="EDC BCA, ANCHOR, dsb…" value={keterangan} onChange={e => setKeterangan(e.target.value)} />
        </div>
        <div className="form-group">
          <label>📸 Foto Merchant</label>
          <div className="photo-upload-area" onClick={() => fileRef.current?.click()}>
            <div className="pu-icon">📷</div>
            <p>Ambil Foto / Pilih dari Galeri</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => handlePhotos(e.target.files)} />
          <div className="photo-preview-row">
            {pendingPhotos.map((src, i) => (
              <div className="photo-preview-item" key={i}>
                <img src={src} alt="" />
                <button className="del-pp" onClick={() => setPendingPhotos(p => p.filter((_,j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-submit" onClick={submit}>💾 Simpan Merchant</button>
      </div>
    </div>
  );
}
