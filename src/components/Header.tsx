import { useApp } from '../context/AppContext';

export default function Header() {
  const {
    filters, setFilters, currentPage, merchants,
    syncDot, syncing, syncNow, setAddModalOpen,
    setFilterPanelOpen, filterPanelOpen, setSetupModalOpen,
  } = useApp();

  const count = merchants.length;

  const handleKawTab = (kaw: string) => {
    setFilters({ activeKawasan: kaw });
    if (currentPage === 'list') {
      // reset expandedId via filter change — renderList will trigger
    }
  };

  const showSearch = currentPage === 'list';

  return (
    <header className="app-header">
      {/* Top row */}
      <div className="hdr-top">
        <div className="hdr-brand">
          <div className="hdr-logo">LVM</div>
          <div className="hdr-text">
            <div className="hdr-title">Mapping Merchant — Cab. Green Ville 16500</div>
            <div className="hdr-sub">Internal Field Tool · Mandiri</div>
          </div>
        </div>
        <div className="hdr-actions">
          <div className="hdr-pill">{count}/{count}</div>
          <button
            className="btn-sync"
            onClick={syncNow}
            disabled={syncing}
          >
            <span className={`sync-dot ${syncDot === 'offline' ? 'offline' : syncDot === 'syncing' ? 'syncing' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button className="btn-sync" onClick={() => setSetupModalOpen(true)}>⚙️</button>
        </div>
      </div>

      {/* Search bar — only on list page */}
      {showSearch && (
        <>
          <div className="hdr-search" id="searchBarEl">
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

          {/* Kawasan quick tabs */}
          <div className="kaw-tabs" id="kawQuickTabs">
            {['ALL', 'A', 'B', 'C', 'D', 'E', 'F'].map(kaw => (
              <button
                key={kaw}
                className={`kaw-tab${filters.activeKawasan === kaw ? ' active' : ''}`}
                onClick={() => handleKawTab(kaw)}
              >
                {kaw === 'ALL' ? 'Semua' : `Kaw ${kaw}`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* FAB shortcut visible on mobile header only on dashboard */}
      {!showSearch && (
        <button
          style={{ display: 'none' }}
          onClick={() => setAddModalOpen(true)}
        />
      )}
    </header>
  );
}
