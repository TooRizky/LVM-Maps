import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BUSINESS_TYPES, KAWASAN_LIST, KAWASAN_LABEL,
  HASIL_VISIT_OPTIONS, PIC_CABANG_LIST, BANK_LIST,
} from '../../lib/constants';
import type { VisitRecord } from '../../types';

export default function EditModal() {
  const {
    editModalOpen, setEditModalOpen, editingId, setEditingId,
    merchants, updateMerchant,
    getPhotos, addPhoto, deletePhoto, openLightbox,
  } = useApp();

  const m    = merchants.find(x => Number(x.id) === Number(editingId)) || null;
  const mPh  = editingId != null ? getPhotos(Number(editingId)) : [];
  const fileRef = useRef<HTMLInputElement>(null);

  const [nama,       setNama]       = useState('');
  const [business,   setBusiness]   = useState('F&B');
  const [kawasan,    setKawasan]    = useState('A');
  const [visit,      setVisit]      = useState('');
  const [hasilVisit, setHasilVisit] = useState('');
  const [picCabang,  setPicCabang]  = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [checks, setChecks] = useState({
    mandiri_rek: false, mandiri_edc: false, mandiri_qr: false,
  });
  const [bankLainEdc, setBankLainEdc] = useState<string[]>([]);
  const [bankLainQr,  setBankLainQr]  = useState<string[]>([]);

  useEffect(() => {
    if (!editModalOpen || !m) return;

    setNama(m.nama        || '');
    setBusiness(m.business || 'F&B');
    setKawasan(m.kawasan  || 'A');
    setVisit(m.visit             || '');
    setHasilVisit(m.hasil_visit  || '');
    setPicCabang(m.pic_cabang    || '');
    setKeterangan(m.keterangan   || '');

    try {
      const h = JSON.parse(m.visit_history || '[]');
      setVisitHistory(Array.isArray(h) ? h : []);
    } catch {
      setVisitHistory([]);
    }

    setChecks({
      mandiri_rek: !!m.mandiri_rek,
      mandiri_edc: !!m.mandiri_edc,
      mandiri_qr:  !!m.mandiri_qr,
    });
    setBankLainEdc(m.bank_lain_edc ? m.bank_lain_edc.split(',').filter(Boolean) : []);
    setBankLainQr (m.bank_lain_qr  ? m.bank_lain_qr.split(',').filter(Boolean)  : []);
  }, [editingId, editModalOpen]); // eslint-disable-line

  const close = () => { setEditModalOpen(false); setEditingId(null); };
  const toggleChk = (key: keyof typeof checks) =>
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleBank = (arr: string[], setArr: (v: string[]) => void, bank: string) => {
    setArr(arr.includes(bank) ? arr.filter(b => b !== bank) : [...arr, bank]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || editingId == null) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) addPhoto(Number(editingId), e.target.result as string);
      };
      reader.readAsDataURL(f);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!nama.trim()) { alert('⚠️ Nama merchant wajib!'); return; }
    if (!m) { close(); return; }

    // Build visit history entry if this is a completed visit
    let newHistory = [...visitHistory];
    if (visit === 'SUDAH' && hasilVisit) {
      const lastRecord = newHistory[newHistory.length - 1];
      const isDuplicate = lastRecord &&
        lastRecord.pic === picCabang &&
        lastRecord.hasil === hasilVisit;
      if (!isDuplicate) {
        newHistory.push({
          date: new Date().toISOString(),
          pic: picCabang || 'Unknown',
          hasil: hasilVisit,
          keterangan: keterangan.trim(),
        });
      }
    }

    await updateMerchant({
      ...m,
      nama:          nama.trim(),
      business,
      kawasan,
      mandiri_rek:   checks.mandiri_rek ? 'V' : '',
      mandiri_edc:   checks.mandiri_edc ? 'V' : '',
      mandiri_qr:    checks.mandiri_qr  ? 'V' : '',
      bank_lain_edc: bankLainEdc.join(','),
      bank_lain_qr:  bankLainQr.join(','),
      visit,
      hasil_visit:   hasilVisit,
      pic_cabang:    picCabang,
      keterangan:    keterangan.trim(),
      visit_history: JSON.stringify(newHistory),
    });
    close();
  };

  return (
    <div
      className={`modal-overlay${editModalOpen ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
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
            {KAWASAN_LIST.map(k => (
              <option key={k} value={k}>{k} — {KAWASAN_LABEL[k]}</option>
            ))}
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
          <label>🏧 Bank Lain — EDC</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {BANK_LIST.map(bank => (
              <label
                key={bank}
                className={`form-check${bankLainEdc.includes(bank) ? ' checked' : ''}`}
                onClick={() => toggleBank(bankLainEdc, setBankLainEdc, bank)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                <span className="chk-box">{bankLainEdc.includes(bank) ? '✓' : ''}</span>
                {bank}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>📱 Bank Lain — QR / QRIS</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {BANK_LIST.map(bank => (
              <label
                key={bank}
                className={`form-check${bankLainQr.includes(bank) ? ' checked' : ''}`}
                onClick={() => toggleBank(bankLainQr, setBankLainQr, bank)}
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                <span className="chk-box">{bankLainQr.includes(bank) ? '✓' : ''}</span>
                {bank}
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
          <select value={hasilVisit} onChange={e => setHasilVisit(e.target.value)}>
            {HASIL_VISIT_OPTIONS.map(o => (
              <option key={o} value={o}>{o || '— Pilih Hasil Visit —'}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>👤 PIC Cabang</label>
          <select value={picCabang} onChange={e => setPicCabang(e.target.value)}>
            <option value="">— Pilih PIC —</option>
            {PIC_CABANG_LIST.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>📝 Keterangan</label>
          <textarea
            rows={2}
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Contoh: EDC BCA, ANCHOR, sudah presentasi produk…"
          />
        </div>

        {visitHistory.length > 0 && (
          <div className="form-group">
            <label
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowHistory(v => !v)}
            >
              📅 Riwayat Kunjungan ({visitHistory.length}) {showHistory ? '▲' : '▼'}
            </label>
            {showHistory && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...visitHistory].reverse().map((rec, i) => (
                  <div key={i} style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600, color: '#0369a1' }}>
                      {new Date(rec.date).toLocaleDateString('id-ID', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div>👤 {rec.pic || 'Unknown'} &nbsp;|&nbsp; 📋 {rec.hasil}</div>
                    {rec.keterangan && <div style={{ color: '#64748b' }}>💬 {rec.keterangan}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label>📸 Foto {mPh.length > 0 ? `(${mPh.length})` : ''}</label>
          <div className="exp-photo-row" style={{ marginTop: 6 }}>
            {mPh.map((src, i) => (
              <div className="photo-thumb-wrap" key={i}>
                <img
                  src={src} alt=""
                  onClick={() => openLightbox(src)}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <button
                  className="photo-del"
                  onClick={() => editingId != null && deletePhoto(Number(editingId), i)}
                >✕</button>
              </div>
            ))}
            <div>
              <div className="photo-add-btn" onClick={() => fileRef.current?.click()}>
                📷<br/>Tambah
              </div>
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" multiple
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
