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
    getPhotos, openLightbox,
    setEditingId, setEditModalOpen,
    setConfirmModal,
  } = useApp();

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

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(m.id);
    setEditModalOpen(true);
  };

  return (
    <div className={`mc${isOpen ? ' is-expanded' : ''}`} id={`card-${m.id}`} style={{ '--kc': kwClr } as React.CSSProperties}>
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

      {/* Expanded section — read-only view */}
      {isOpen && (
        <div className="mc-expanded open" id={`exp-${m.id}`}>

          {/* Photos — view only, click to lightbox */}
          {mPh.length > 0 && (
            <>
              <div className="exp-photo-title">📸 Foto ({mPh.length})</div>
              <div className="exp-photo-row" id={`pg-${m.id}`}>
                {mPh.map((src, i) => (
                  <div className="photo-thumb-wrap" key={i}>
                    <img
                      src={src}
                      alt=""
                      onClick={e => { e.stopPropagation(); openLightbox(src); }}
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

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

          {/* Keterangan — read-only */}
          <div className="exp-field">
            <label>Keterangan</label>
            <div className="exp-readonly">{m.keterangan || <span className="exp-empty">—</span>}</div>
          </div>

          {/* Visit & Hasil — read-only */}
          <div className="exp-grid" style={{ marginTop: 7 }}>
            <div className="exp-field">
              <label>Status Visit</label>
              <div className="exp-readonly">
                {m.visit === 'SUDAH' ? '✅ Sudah' : '⏳ Belum'}
              </div>
            </div>
            <div className="exp-field">
              <label>Hasil Visit</label>
              <div className="exp-readonly">{m.hasil_visit || <span className="exp-empty">—</span>}</div>
            </div>
          </div>


          {/* Action buttons — Maps, Edit, Delete only */}
          <div className="card-btns">
            <a
              className="btn-maps"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((m.nama || '') + ' Green Ville Jakarta')}`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >📍 Maps</a>
            <button className="btn-edit-sm" style={{ flex: 2 }} onClick={openEdit}>✏️ Edit</button>
            <button className="btn-del-sm" onClick={e => { e.stopPropagation(); setConfirmModal({ open: true, id: m.id, nama: m.nama }); }}>🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}
