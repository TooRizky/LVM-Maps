import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { BUSINESS_TYPES, KAWASAN_LIST } from '../../lib/constants';

export default function EditModal() {
  const {
    editModalOpen, setEditModalOpen, editingId, setEditingId,
    merchants, updateMerchant,
    getPhotos, addPhoto, deletePhoto, openLightbox,
  } = useApp();

  const m = merchants.find(x => x.id === editingId) || null;
  const mPh = editingId ? getPhotos(editingId) : [];
  const fileRef = useRef<HTMLInputElement>(null);

  const [nama,       setNama]       = useState('');
  const [business,   setBusiness]   = useState('F&B');
  const [kawasan,    setKawasan]    = useState('A');
  const [visit,      setVisit]      = useState('');
  const [hasilVisit, setHasilVisit] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [checks, setChecks] = useState({
    mandiri_rek: false, mandiri_edc: false, mandiri_qr: false,
    bank_lain_edc: false, bank_lain_qr: false,
  });

  useEffect(() => {
    if (m) {
      setNama(m.nama || '');
      setBusiness(m.business || 'F&B');
      setKawasan(m.kawasan || 'A');
      setVisit(m.visit || '');
      setHasilVisit(m.hasil_visit || '');
      setKeterangan(m.keterangan || '');
      setChecks({
        mandiri_rek:   !!m.mandiri_rek,
        mandiri_edc:   !!m.mandiri_edc,
        mandiri_qr:    !!m.mandiri_qr,
        bank_lain_edc: !!m.bank_lain_edc,
        bank_lain_qr:  !!m.bank_lain_qr,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id]);

  const close = () => { setEditModalOpen(false); setEditingId(null); };
  const toggleChk = (key: keyof typeof checks) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleFiles = (files: FileList | null) => {
    if (!files || !editingId) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) addPhoto(editingId, e.target.result as string);
      };
      reader.readAsDataURL(f);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = () => {
    if (!nama.trim() || !m) { alert('⚠️ Nama merchant wajib!'); return; }
    updateMerchant({
      ...m,
      nama: nama.trim(), business, kawasan,
      mandiri_rek:   checks.mandiri_rek   ? 'V' : '',
      mandiri_edc:   checks.mandiri_edc   ? 'V' : '',
      mandiri_qr:    checks.mandiri_qr    ? 'V' : '',
      bank_lain_edc: checks.bank_lain_edc ? 'V' : '',
      bank_lain_qr:  checks.bank_lain_qr  ? 'V' : '',
      visit, hasil_visit: hasilVisit.trim(), keterangan: keterangan.trim(),
    });
    close();
  };

  return (
    <div className={`modal-overlay${editModalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={close}>✕</button>
        <div className="modal-handle" />
        <div className="modal-title">✏️ Edit Merchant</div>

        <div className="form-group">
          <label>Nama Merchant *</label>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama toko / merchant" />
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
          <label>Status Visit</label>
          <select value={visit} onChange={e => setVisit(e.target.value)}>
            <option value="">Belum</option>
            <option value="SUDAH">Sudah</option>
          </select>
        </div>
        <div className="form-group">
          <label>Hasil Visit</label>
          <input type="text" value={hasilVisit} onChange={e => setHasilVisit(e.target.value)} placeholder="FOLLOW UP / SUDAH / TIDAK BERMINAT..." />
        </div>
        <div className="form-group">
          <label>Keterangan</label>
          <textarea rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="EDC BCA, ANCHOR, dsb..." />
        </div>

        {/* Photo management — dipindah dari card ke sini */}
        <div className="form-group">
          <label>📸 Foto {mPh.length > 0 ? `(${mPh.length})` : ''}</label>
          <div className="exp-photo-row" style={{ marginTop: 6 }}>
            {mPh.map((src, i) => (
              <div className="photo-thumb-wrap" key={i}>
                <img
                  src={src}
                  alt=""
                  onClick={() => openLightbox(src)}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <button
                  className="photo-del"
                  onClick={() => editingId && deletePhoto(editingId, i)}
                >✕</button>
              </div>
            ))}
            <div>
              <div className="photo-add-btn" onClick={() => fileRef.current?.click()}>
                📷<br/>Tambah
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
        </div>

        <button className="btn-submit" onClick={save}>💾 Simpan Perubahan</button>
      </div>
    </div>
  );
}
