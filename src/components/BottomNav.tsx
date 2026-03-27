import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { currentPage, setCurrentPage, setAddModalOpen, setFilterPanelOpen } = useApp();

  const switchPage = (page: 'dashboard' | 'list') => {
    setCurrentPage(page);
    setFilterPanelOpen(false);
  };

  return (
    <nav className="bottom-nav">
      {/* Sidebar brand (desktop only) */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">LVM</div>
        <div>
          <div className="sidebar-brand-text">Green Ville</div>
          <div className="sidebar-brand-sub">Cab. Jakarta · 16500</div>
        </div>
      </div>

      <button
        className={`nav-btn${currentPage === 'dashboard' ? ' active' : ''}`}
        onClick={() => switchPage('dashboard')}
      >
        <span className="nav-icon">🗺️</span>
        <span>Denah</span>
        <div className="nav-indicator" />
      </button>

      <div className="nav-fab-wrap">
        <button className="nav-fab" onClick={() => setAddModalOpen(true)}>＋</button>
      </div>

      <button
        className={`nav-btn${currentPage === 'list' ? ' active' : ''}`}
        onClick={() => switchPage('list')}
      >
        <span className="nav-icon">📋</span>
        <span>Daftar</span>
        <div className="nav-indicator" />
      </button>
    </nav>
  );
}
