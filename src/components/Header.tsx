import { useApp } from '../context/AppContext';

export default function Header() {
  const {
    filters, setFilters, currentPage, merchants,
    syncDot, syncing, syncNow,
    setFilterPanelOpen, filterPanelOpen,
    doExportExcel, exporting,
  } = useApp();

  const showSearch = currentPage === 'list';

  return (
    <header className="app-header">
      <div className="hdr-top">
        <div className="hdr-brand">
          <div className="hdr-logo">LVM</div>
          <div className="hdr-text">
            <div className="hdr-title">Mapping Merchant — Cab. Green Ville 16500</div>
            <div className="hdr-sub">Internal Field Tool · Mandiri</div>
          </div>
        </div>
        <div className="hdr-actions">
          <div className="hdr-pill">{merchants.length}</div>
          <button
            className={`btn-sync${exporting ? ' exporting' : ''}`}
            title="Export Excel (urut Kawasan A-F, Nama A-Z)"
            onClick={doExportExcel}
            disabled={exporting}
          >
            {exporting ? '⏳' : '📥'} Excel
          </button>
          <button
            className="btn-sync"
            onClick={syncNow}
            disabled={syncing}
            title="Refresh data dari Supabase"
          >
            <span className={`sync-dot${
              syncDot === 'offline'  ? ' offline'  :
              syncDot === 'syncing' ? ' syncing' : ''
            }`} />
            {syncing ? 'Loading…' : 'Sync'}
          </button>
        </div>
      </div>

      {showSearch && (
        <>
          <div className="hdr-search">
            <div className="search-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="search"
                placeholder="Cari merchant..."
                value={filters.searchQ}
                onChange={e => setFilters({ searchQ: e.target.value })}
              />
            </div>
            <button
              className={`btn-filter-hdr${filterPanelOpen ? ' active' : ''}`}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            >
              <span>⊟</span> Filter
            </button>
          </div>
          <div className="kaw-tabs">
            {['ALL','A','B','C','D','E','F'].map(kaw => (
              <button
                key={kaw}
                className={`kaw-tab${filters.activeKawasan === kaw ? ' active' : ''}`}
                onClick={() => setFilters({ activeKawasan: kaw })}
              >
                {kaw === 'ALL' ? 'Semua' : `Kaw ${kaw}`}
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  );
}
