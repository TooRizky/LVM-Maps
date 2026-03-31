import { useApp } from '../context/AppContext';
import { getStatus } from '../lib/merchantUtils';
import { KAW_HEX, BIZ_CLR, BIZ_EMOJI, KAWASAN_LABEL } from '../lib/constants';
import type { Merchant, VisitRecord } from '../types';

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

  // Parse bank lain
  const bankEdcList = m.bank_lain_edc ? m.bank_lain_edc.split(',').filter(Boolean) : [];
  const bankQrList  = m.bank_lain_qr  ? m.bank_lain_qr.split(',').filter(Boolean)  : [];

  // Parse visit history
  let visitHistory: VisitRecord[] = [];
  try {
    const parsed = JSON.parse(m.visit_history || '[]');
    visitHistory = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }

  const lastVisit = visitHistory.length > 0 ? visitHistory[visitHistory.length - 1] : null;

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

  const hasilColor: Record<string, string> = {
    'Follow Up':      '#d97706',
    'Closing':        '#16a34a',
    'Tidak Berminat': '#dc2626',
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
            {bankEdcList.length > 0 && <span className="tag-bank-lain">BL·EDC</span>}
            {bankQrList.length  > 0 && <span className="tag-bank-lain">BL·QR</span>}
          </div>
          {m.hasil_visit && (
            <div style={{ fontSize: 11, marginTop: 3, color: hasilColor[m.hasil_visit] || '#64748b', fontWeight: 600 }}>
              {m.hasil_visit === 'Follow Up' && '🔄 '}
              {m.hasil_visit === 'Closing' && '🎯 '}
              {m.hasil_visit === 'Tidak Berminat' && '❌ '}
              {m.hasil_visit}
              {m.pic_cabang && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {m.pic_cabang}</span>}
            </div>
          )}
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
          {mPh.length > 0 && (
            <>
              <div className="exp-photo-title">📸 Foto ({mPh.length})</div>
              <div className="exp-photo-row" id={`pg-${m.id}`}>
                {mPh.map((src, i) => (
                  <div className="photo-thumb-wrap" key={i}>
                    <img
                      src={src} alt=""
                      onClick={e => { e.stopPropagation(); openLightbox(src); }}
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Lokasi */}
          <div className="exp-field" style={{ marginBottom: 8 }}>
            <label>📍 Lokasi Kawasan</label>
            <div className="exp-readonly" style={{ color: KAW_HEX[m.kawasan] || '#64748b', fontWeight: 600 }}>
              Kawasan {m.kawasan} — {KAWASAN_LABEL[m.kawasan] || ''}
            </div>
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
              <div className="exp-check-row">
                <strong style={{ fontSize: 12 }}>EDC:</strong>&nbsp;
                {bankEdcList.length > 0
                  ? <span style={{ color: '#0891b2' }}>{bankEdcList.join(', ')}</span>
                  : <span style={{ color: '#94a3b8' }}>–</span>}
              </div>
              <div className="exp-check-row" style={{ marginTop: 4 }}>
                <strong style={{ fontSize: 12 }}>QR:</strong>&nbsp;
                {bankQrList.length > 0
                  ? <span style={{ color: '#0891b2' }}>{bankQrList.join(', ')}</span>
                  : <span style={{ color: '#94a3b8' }}>–</span>}
              </div>
            </div>
          </div>

          {/* Visit & Hasil */}
          <div className="exp-grid" style={{ marginTop: 7 }}>
            <div className="exp-field">
              <label>Status Visit</label>
              <div className="exp-readonly">
                {m.visit === 'SUDAH' ? '✅ Sudah' : '⏳ Belum'}
              </div>
            </div>
            <div className="exp-field">
              <label>Hasil Visit</label>
              <div className="exp-readonly" style={{ color: hasilColor[m.hasil_visit] || 'inherit', fontWeight: m.hasil_visit ? 600 : 400 }}>
                {m.hasil_visit || <span className="exp-empty">—</span>}
              </div>
            </div>
          </div>

          {/* PIC & Keterangan */}
          <div className="exp-grid" style={{ marginTop: 7 }}>
            <div className="exp-field">
              <label>👤 PIC Cabang</label>
              <div className="exp-readonly">{m.pic_cabang || <span className="exp-empty">—</span>}</div>
            </div>
            <div className="exp-field">
              <label>📝 Keterangan</label>
              <div className="exp-readonly">{m.keterangan || <span className="exp-empty">—</span>}</div>
            </div>
          </div>

          {/* Last visit record */}
          {lastVisit && (
            <div style={{
              marginTop: 10,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>
                📅 Kunjungan Terakhir
              </div>
              <div style={{ color: '#475569' }}>
                {new Date(lastVisit.date).toLocaleDateString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
              <div>👤 {lastVisit.pic} &nbsp;|&nbsp; 📋 <span style={{ color: hasilColor[lastVisit.hasil] || '#475569', fontWeight: 600 }}>{lastVisit.hasil}</span></div>
              {lastVisit.keterangan && <div style={{ color: '#64748b', marginTop: 2 }}>💬 {lastVisit.keterangan}</div>}
              {visitHistory.length > 1 && (
                <div style={{ color: '#94a3b8', marginTop: 4, fontSize: 11 }}>
                  + {visitHistory.length - 1} kunjungan sebelumnya (edit untuk lihat semua)
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="card-btns">
            <a
              className="btn-maps"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((m.nama || '') + ' ' + (KAWASAN_LABEL[m.kawasan] || '') + ' Jakarta')}`}
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
