// ════════════════════════════════════════════════════
//  SYNC — GOOGLE APPS SCRIPT
// ════════════════════════════════════════════════════

export async function apiCall(scriptUrl: string, payload: object): Promise<Record<string, unknown>> {
  if (!scriptUrl) throw new Error('Script URL belum diatur. Buka Setup → Apps Script.');
  let res: Response;
  try {
    res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
    });
  } catch (fetchErr) {
    console.error('Fetch error:', fetchErr);
    throw new Error('Tidak dapat terhubung ke server. Cek koneksi internet dan URL Apps Script.');
  }

  if (!res.ok) throw new Error(`Server error ${res.status}: ${res.statusText || 'cek URL Apps Script'}`);

  const text = await res.text();
  if (!text || !text.trim()) throw new Error('Respons kosong dari server. Re-deploy Apps Script.');
  if (text.trim().startsWith('<')) {
    throw new Error('Apps Script mengembalikan HTML bukan JSON. Pastikan deployment sudah "Anyone" dan URL benar.');
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Parse error, raw response:', text.substring(0, 200));
    throw new Error('Respons dari Apps Script tidak valid (bukan JSON). Coba re-deploy.');
  }

  if (json && json['error']) throw new Error(json['error'] as string);
  return json;
}

export async function fetchFromSheets(scriptUrl: string): Promise<Record<string, unknown>> {
  const res = await fetch(scriptUrl + '?_ts=' + Date.now());
  let json: Record<string, unknown>;
  try { json = await res.json(); }
  catch { throw new Error('Respons dari Sheets bukan JSON. Coba re-deploy Apps Script.'); }
  if (json['error']) throw new Error(json['error'] as string);
  return json;
}

export async function testConnection(scriptUrl: string): Promise<void> {
  const res = await fetch(scriptUrl + '?_ts=' + Date.now(), {
    signal: AbortSignal.timeout(10000),
  });
  await res.json();
}
