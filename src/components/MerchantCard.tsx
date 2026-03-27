import { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getStatus } from '../lib/merchantUtils';
import { KAW_HEX, BIZ_CLR, BIZ_EMOJI } from '../lib/constants';
import type { Merchant } from '../types';

interface Props {
  merchant: Merchant;
}

export default function MerchantCard({ merchant: m }: Props) {
  const {
    expandedId, setExpandedId,
    getPhotos, openLightbox, deletePhoto, addPhoto,
    updateField, saveCard,
    setEditingId, setEditModalOpen,
    setConfirmModal,
  } = useApp();

  const fileRef = useRef<HTMLInputElement>(null);
  const mPh = getPhotos(m.id);
  const isOpen = expandedId === m.id;
  const st = getStatus(m);
  const kwClr = KAW_HEX[m.kawasan] || '#94a3b8';
  const bizBg = BIZ_CLR[m.business] || '#F1F5F9';

  const toggleExpand = () => {
    setExpandedId(isOpen ? null : m.id);
    if (!isOpen) {
      setTimeout(() => {
        document.getElementById(`card-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(f => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) addPhoto(m.id, e.target.result as string);
      };
      reader.readAsDataURL(f);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mc" id={`card-${m.id}`} style={{ '--kc': kwClr } as React.CSSProperties}>
      {/* Left kawasan color strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: kwClr }} />

      {/* Main row */}
      <div className="mc-main" onClick={toggleExpand}>
        <div className="mc-avatar" style={{ background: bizBg }}>
          {mPh.length
            ? <img src={mPh[0]} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span>{BIZ_EMOJI[m.business] || '📌'}</span>
          }
        </div>
        <div className="mc-body">
          <div className="mc-name">{m.nama}</div>
          <div className="mc-tags">
            <span className="tag-biz" style={{ background: bizBg, color: '#374151' }}>{m.business}</span>
            <span className="tag-kaw" style={{ background: kwClr, color: '#fff' }}>Kaw.{m.kawasan}</span>
            {m.mandiri_rek && <span className="tag-mandiri">REK</span>}
            {m.mandiri_edc && <span className="tag-mandiri">EDC</span>}
            {m.mandiri_qr  && <span className="tag-mandiri">QR</span>}
            {m.bank_lain_edc && <span className="tag-bank-lain">BL·EDC</span>}
            {m.bank_lain_qr  && <span className="tag-bank-lain">BL·QR</span>}
          </div>
        </div>
        <div className="mc-right">
          <span className="status-badge" style={{ background: st.bg, color: st.color }}>
            <span className="status-dot" style={{ background: st.dot }} />
            {st.label}
          </span>
          {mPh.length > 0 && <span className="mc-photo-count">📷 {mPh.length}</span>}
        </div>
      </div>

      {/* Expanded section */}
      {isOpen && (
        <div className="mc-expanded open" id={`exp-${m.id}`}>
          {/* Photos */}
          <div className="exp-photo-title">📸 Foto {mPh.length ? `(${mPh.length})` : ''}</div>
          <div className="exp-photo-row" id={`pg-${m.id}`}>
            {mPh.map((src, i) => (
              <div className="photo-thumb-wrap" key={i}>
                <img
                  src={src}
                  alt=""
                  onClick={e => { e.stopPropagation(); openLightbox(src); }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <button className="photo-del" onClick={e => { e.stopPropagation(); deletePhoto(m.id, i); }}>✕</button>
              </div>
            ))}
            <div>
              <div className="photo-add-btn" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                📷<br/>Foto
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => { e.stopPropagation(); handleFiles(e.target.files); }}
            />
          </div>

          {/* Mandiri & Bank Lain */}
          <div className="exp-grid">
            <div>
              <div className="exp-section-title">🏦 Mandiri</div>
              {[
                { key: 'mandiri_rek', label: 'Rekening' },
                { key: 'mandiri_edc', label: 'EDC' },
                { key: 'mandiri_qr',  label: 'QR/QRIS' },
              ].map(({ key, label }) => (
                <div className="exp-check-row" key={key}>
                  <span className={`exp-chk ${m[key as keyof Merchant] ? 'yes' : 'no'}`}>
                    {m[key as keyof Merchant] ? '✓' : '–'}
                  </span>
                  {label}
                </div>
              ))}
            </div>
            <div>
              <div className="exp-section-title">🏧 Bank Lain</div>
              {[
                { key: 'bank_lain_edc', label: 'EDC' },
                { key: 'bank_lain_qr',  label: 'QR' },
              ].map(({ key, label }) => (
                <div className="exp-check-row" key={key}>
                  <span className={`exp-chk ${m[key as keyof Merchant] ? 'yes' : 'no'}`}>
                    {m[key as keyof Merchant] ? '✓' : '–'}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Keterangan */}
          <div className="exp-field">
            <label>Keterangan</label>
            <input
              type="text"
              defaultValue={m.keterangan || ''}
              placeholder="Kosong..."
              onClick={e => e.stopPropagation()}
              onChange={e => updateField(m.id, 'keterangan', e.target.value)}
            />
          </div>

          {/* Visit & Hasil */}
          <div className="exp-grid" style={{ marginTop: 7 }}>
            <div className="exp-field">
              <label>Status Visit</label>
              <select
                defaultValue={m.visit || ''}
                onClick={e => e.stopPropagation()}
                onChange={e => updateField(m.id, 'visit', e.target.value)}
              >
                <option value="">Belum</option>
                <option value="SUDAH">Sudah</option>
              </select>
            </div>
            <div className="exp-field">
              <label>Hasil Visit</label>
              <input
                type="text"
                defaultValue={m.hasil_visit || ''}
                placeholder="Isi hasil..."
                onClick={e => e.stopPropagation()}
                onChange={e => updateField(m.id, 'hasil_visit', e.target.value)}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="card-btns">
            <a
              className="btn-maps"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((m.nama || '') + ' Green Ville Jakarta')}`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >📍 Maps</a>
            <button className="btn-save" onClick={e => { e.stopPropagation(); saveCard(m.id); }}>💾 Simpan</button>
            <button className="btn-edit-sm" onClick={e => { e.stopPropagation(); setEditingId(m.id); setEditModalOpen(true); }}>✏️ Edit</button>
            <button className="btn-del-sm" onClick={e => { e.stopPropagation(); setConfirmModal({ open: true, id: m.id, nama: m.nama }); }}>🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}
