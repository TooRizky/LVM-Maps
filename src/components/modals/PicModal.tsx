import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export default function PicModal() {
  const { picModalOpen, setPicModalOpen, picList, addPic, removePic } = useApp();
  const [inputVal, setInputVal] = useState('');
  const [err,      setErr]      = useState('');

  const close = () => { setPicModalOpen(false); setInputVal(''); setErr(''); };

  const handleAdd = () => {
    const name = inputVal.trim();
    if (!name) { setErr('Nama PIC tidak boleh kosong.'); return; }
    if (picList.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
      setErr('Nama PIC sudah ada.'); return;
    }
    addPic(name);
    setInputVal('');
    setErr('');
  };

  if (!picModalOpen) return null;

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-sheet" style={{ maxWidth: 420 }}>
        <button className="modal-close" onClick={close}>✕</button>
        <div className="modal-handle" />
        <div className="modal-title">👥 Kelola Daftar PIC</div>

        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Tambah atau hapus nama PIC. Perubahan langsung berlaku di form tambah/edit merchant.
        </p>

        {/* List PIC */}
        <div style={{
          maxHeight: 320, overflowY: 'auto',
          border: '1px solid var(--border-md)', borderRadius: 12,
          marginBottom: 16,
        }}>
          {picList.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Belum ada PIC. Tambahkan di bawah.
            </div>
          ) : (
            picList.map((pic, i) => (
              <div key={pic} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                borderBottom: i < picList.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? '#fff' : 'var(--surface-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `hsl(${(pic.charCodeAt(0) * 37) % 360}, 55%, 88%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 13,
                    color: `hsl(${(pic.charCodeAt(0) * 37) % 360}, 55%, 32%)`,
                  }}>
                    {pic[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{pic}</span>
                </div>
                <button
                  onClick={() => removePic(pic)}
                  style={{
                    background: 'none', border: '1.5px solid #FECACA',
                    borderRadius: 8, padding: '3px 10px',
                    fontSize: 12, color: '#DC2626', cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Hapus
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new PIC */}
        <div className="form-group" style={{ marginBottom: 6 }}>
          <label>Tambah PIC Baru</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Nama PIC…"
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleAdd}
              style={{
                padding: '0 18px', borderRadius: 12,
                background: 'var(--navy)', color: '#fff',
                border: 'none', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              ＋ Tambah
            </button>
          </div>
        </div>

        {err && (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>⚠️ {err}</div>
        )}

        <button className="btn-submit" style={{ marginTop: 8 }} onClick={close}>
          ✓ Selesai
        </button>
      </div>
    </div>
  );
}
