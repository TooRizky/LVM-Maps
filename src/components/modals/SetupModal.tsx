import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const APPS_SCRIPT_CODE = `// ═══════════════════════════════════════════════════════
//  LVM-MAPS — Google Apps Script (Code.gs)
//  Deploy sebagai Web App: Execute as Me, Anyone can access
// ═══════════════════════════════════════════════════════
const SHEET_NAME = 'Merchants';

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); initHeaders(sheet); }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ merchants: [] });
  const headers = data[0];
  const merchants = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] !== undefined ? String(row[i]) : '');
    return obj;
  });
  return jsonResponse({ merchants });
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(SHEET_NAME); initHeaders(sheet); }

  if (body.action === 'save') {
    sheet.clearContents();
    initHeaders(sheet);
    const rows = body.merchants.map(m => headerOrder().map(h => m[h] || ''));
    if (rows.length) sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    return jsonResponse({ ok: true, saved: rows.length });
  }

  if (body.action === 'upsert') {
    const headers = headerOrder();
    const existing = sheet.getDataRange().getValues();
    const idCol = headers.indexOf('id');
    body.merchants.forEach(m => {
      const rowIdx = existing.findIndex((r, i) => i > 0 && String(r[idCol]) === String(m.id));
      const rowData = headers.map(h => m[h] || '');
      if (rowIdx > 0) {
        sheet.getRange(rowIdx + 1, 1, 1, rowData.length).setValues([rowData]);
        existing[rowIdx] = rowData;
      } else {
        sheet.appendRow(rowData);
        existing.push(rowData);
      }
    });
    return jsonResponse({ ok: true, saved: body.merchants.length });
  }

  if (body.action === 'delete') {
    const headers = headerOrder();
    const idCol = headers.indexOf('id');
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idCol]) === String(body.id)) { sheet.deleteRow(i + 1); break; }
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Unknown action: ' + body.action });
}

function headerOrder() {
  return ['id','nama','business','kawasan','mandiri_rek','mandiri_edc','mandiri_qr',
          'bank_lain_edc','bank_lain_qr','visit','hasil_visit','keterangan','photos','updated_at'];
}
function initHeaders(sheet) { sheet.appendRow(headerOrder()); }
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export default function SetupModal() {
  const {
    setupModalOpen, setSetupModalOpen,
    sbCfg, scriptUrl,
    saveSupabase, clearSupabase, testSupabase,
    saveScriptUrlAction, pullFromSheets, syncAll, testConn,
    showToast,
  } = useApp();

  const [localUrl,   setLocalUrl]   = useState(sbCfg.url || '');
  const [localKey,   setLocalKey]   = useState(sbCfg.key || '');
  const [localScript, setLocalScript] = useState(scriptUrl || '');

  const close = () => setSetupModalOpen(false);

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE)
      .then(() => showToast('✅ Kode disalin!'))
      .catch(() => showToast('Salin manual dari kotak kode'));
  };

  return (
    <div className={`modal-overlay${setupModalOpen ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={close}>✕</button>
        <div className="modal-handle" />
        <div className="modal-title">⚙️ Setup & Konfigurasi</div>

        {/* Google Apps Script */}
        <div className="setup-section">
          <div className="setup-section-title">
            <span>📋</span> Google Apps Script (Sheets Sync)
            {scriptUrl && <span className="setup-badge">✅ URL AKTIF</span>}
          </div>
          <p className="setup-info-text">
            1. Buka Google Sheets → Extensions → Apps Script<br/>
            2. Tempel kode di bawah, Deploy → New Deployment → Web App<br/>
            3. Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong><br/>
            4. Copy URL exec dan paste di field bawah
          </p>

          <div className="code-box">
            <div className="code-box-hdr">
              <span style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700 }}>Code.gs — Google Apps Script</span>
              <button className="btn-copy" onClick={copyScript}>📋 Copy</button>
            </div>
            <pre id="appsScriptCode">{APPS_SCRIPT_CODE}</pre>
          </div>

          <div className="form-group">
            <label>Apps Script URL</label>
            <input
              type="url"
              id="scriptUrlInput"
              placeholder="https://script.google.com/macros/s/..."
              value={localScript}
              onChange={e => setLocalScript(e.target.value)}
            />
          </div>
          <div className="setup-btn-row">
            <button className="btn-primary" onClick={() => saveScriptUrlAction(localScript)}>💾 Simpan URL</button>
            <button className="btn-secondary" onClick={testConn}>🔌 Test Koneksi</button>
            <button className="btn-secondary" onClick={pullFromSheets}>⬇️ Pull Data</button>
            <button className="btn-secondary" onClick={syncAll}>⬆️ Push Semua</button>
          </div>
        </div>

        {/* Supabase */}
        <div className="setup-section">
          <div className="setup-section-title">
            <span>☁️</span> Supabase (Photo Storage)
            {(sbCfg.url && sbCfg.key) && <span className="setup-badge" id="sbBadge">✅ AKTIF</span>}
          </div>
          <p className="setup-info-text">
            Buat project di <strong>supabase.com</strong>, lalu:<br/>
            1. Storage → Create Bucket: <strong>merchant-photos</strong> (Public)<br/>
            2. Settings → API → copy Project URL dan anon key
          </p>
          <div className="form-group">
            <label>Supabase URL</label>
            <input type="url" id="sbUrl" placeholder="https://xxx.supabase.co" value={localUrl} onChange={e => setLocalUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Supabase Anon Key</label>
            <input type="text" id="sbKey" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value={localKey} onChange={e => setLocalKey(e.target.value)} />
          </div>
          <div className="setup-btn-row">
            <button className="btn-primary" onClick={() => saveSupabase(localUrl, localKey)}>💾 Simpan</button>
            <button className="btn-secondary" onClick={() => testSupabase(localUrl, localKey)}>🔌 Test</button>
            <button className="btn-secondary btn-danger" onClick={() => { clearSupabase(); setLocalUrl(''); setLocalKey(''); }}>🗑️ Hapus</button>
          </div>
        </div>

        <button className="btn-submit" style={{ marginTop: 4 }} onClick={close}>✓ Selesai</button>
      </div>
    </div>
  );
}
