import { useState, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { parseExcelFile, type ImportRow } from '../../lib/importExcel';

interface RowWithStatus {
  data: ImportRow;
  status: 'new' | 'exists';
}

export default function ImportModal() {
  const { importModalOpen, setImportModalOpen, merchants, importMerchants } = useApp();

  const [rows,     setRows]     = useState<RowWithStatus[]>([]);
  const [parseErr, setParseErr] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState<{ added: number; skipped: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]); setParseErr(''); setLoading(false); setDone(null); setDragging(false);
  };

  const close = () => { setImportModalOpen(false); setTimeout(reset, 300); };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
      setParseErr('File harus berformat Excel (.xlsx / .xls)');
      return;
    }
    setLoading(true);
    setParseErr('');
    setRows([]);
    setDone(null);

    const { rows: parsed, error } = await parseExcelFile(file);
    setLoading(false);

    if (error) { setParseErr(error); return; }
    if (parsed.length === 0) { setParseErr('Tidak ada data merchant yang ditemukan di file ini.'); return; }

    const existingNames = new Set(merchants.map(m => m.nama.trim().toUpperCase()));
    const withStatus: RowWithStatus[] = parsed.map(data => ({
      data,
      status: existingNames.has(data.nama.trim().toUpperCase()) ? 'exists' : 'new',
    }));
    setRows(withStatus);
  }, [merchants]);

  const handleFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    processFile(files[0]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files);
  };

  const doImport = async () => {
    const toAdd = rows.filter(r => r.status === 'new').map(r => r.data);
    if (toAdd.length === 0) return;
    setLoading(true);
    const result = await importMerchants(toAdd);
    setLoading(false);
    setDone(result);
  };

  const newCount    = rows.filter(r => r.status === 'new').length;
  const existsCount = rows.filter(r => r.status === 'exists').length;

  if (!importModalOpen) return null;

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-sheet" style={{ maxWidth: 720 }}>
        <button className="modal-close" onClick={close}>✕</button>
        <div className="modal-handle" />
        <div className="modal-title">📂 Import Data Merchant</div>

        {/* ── Step 1: pilih file ── */}
        {!done && rows.length === 0 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
              Upload file Excel (.xlsx) sesuai format template. Merchant dengan nama yang sudah ada di database akan
              <strong> dilewati</strong> — data existing tetap utuh.
            </p>

            <div
              className={`import-drop${dragging ? ' dragging' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {loading
                ? <><div className="import-spinner" /><p>Membaca file…</p></>
                : <><div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>Klik atau drag file Excel ke sini</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Format: .xlsx · .xls</p>
                  </>
              }
            </div>

            <input
              ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files)}
            />

            {parseErr && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: '#FEE2E2', color: '#B91C1C', fontSize: 13,
              }}>
                ⚠️ {parseErr}
              </div>
            )}
          </>
        )}

        {/* ── Step 2: preview ── */}
        {rows.length > 0 && !done && (
          <>
            {/* summary badge */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={badgeStyle('#D1FAE5', '#065F46')}>
                ✅ {newCount} merchant baru akan ditambahkan
              </div>
              {existsCount > 0 && (
                <div style={badgeStyle('#FEF3C7', '#92400E')}>
                  ⏭️ {existsCount} sudah ada — dilewati
                </div>
              )}
            </div>

            {/* preview table */}
            <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto', borderRadius: 10, border: '1px solid var(--border-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--navy)', color: '#fff', position: 'sticky', top: 0 }}>
                    <th style={th}>Status</th>
                    <th style={th}>Nama Merchant</th>
                    <th style={th}>Bisnis</th>
                    <th style={th}>Kaw</th>
                    <th style={th}>Mandiri</th>
                    <th style={th}>Bank Lain</th>
                    <th style={th}>Visit</th>
                    <th style={th}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{
                      background: r.status === 'exists'
                        ? '#FFFBEB'
                        : i % 2 === 0 ? '#fff' : '#F7FAFF',
                      opacity: r.status === 'exists' ? 0.6 : 1,
                    }}>
                      <td style={td}>
                        {r.status === 'new'
                          ? <span style={{ color: '#065F46', fontWeight: 700 }}>Baru</span>
                          : <span style={{ color: '#92400E' }}>Ada</span>}
                      </td>
                      <td style={{ ...td, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.data.nama}
                      </td>
                      <td style={td}>{r.data.business}</td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700 }}>{r.data.kawasan}</td>
                      <td style={td}>
                        {[
                          r.data.mandiri_rek && 'Rek',
                          r.data.mandiri_edc && 'EDC',
                          r.data.mandiri_qr  && 'QR',
                        ].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={td}>
                        {[
                          r.data.bank_lain_edc && `EDC: ${r.data.bank_lain_edc}`,
                          r.data.bank_lain_qr  && `QR: ${r.data.bank_lain_qr}`,
                        ].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td style={td}>
                        {r.data.visit === 'SUDAH'
                          ? <span style={{ color: '#2563EB' }}>{r.data.hasil_visit || 'Sudah'}</span>
                          : <span style={{ color: 'var(--muted)' }}>Belum</span>}
                      </td>
                      <td style={{ ...td, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.data.keterangan || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn-submit"
                style={{ flex: 1 }}
                onClick={doImport}
                disabled={loading || newCount === 0}
              >
                {loading ? '⏳ Mengimport…' : `💾 Import ${newCount} Merchant Baru`}
              </button>
              <button
                style={cancelBtn}
                onClick={reset}
              >
                ← Ganti File
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: selesai ── */}
        {done && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              Import Selesai!
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>
              ✅ <strong>{done.added}</strong> merchant baru berhasil ditambahkan
            </div>
            {done.skipped > 0 && (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                ⏭️ <strong>{done.skipped}</strong> merchant dilewati (sudah ada di database)
              </div>
            )}
            <button className="btn-submit" style={{ marginTop: 24, minWidth: 180 }} onClick={close}>
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────
const th: React.CSSProperties = {
  padding: '9px 10px', textAlign: 'left', fontWeight: 700,
  fontSize: 11, whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '7px 10px', borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
};
const cancelBtn: React.CSSProperties = {
  padding: '0 18px', borderRadius: 12, border: '1.5px solid var(--border-md)',
  background: 'var(--surface)', color: 'var(--text-2)',
  fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: 20,
    background: bg, color, fontSize: 13, fontWeight: 700,
  };
}
