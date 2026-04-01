import { useApp } from '../../context/AppContext';
import { kwStats, computeStats } from '../../lib/merchantUtils';
import { KAW_HEX, KAWASAN_LIST, KAWASAN_LABEL } from '../../lib/constants';

export default function DashboardPage() {
  const { merchants, setCurrentPage, setFilters, setFilterPanelOpen } = useApp();
  const totalStats = computeStats(merchants);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

  // Navigate to list with specific filter
  const goFilter = (filterOverride: Parameters<typeof setFilters>[0]) => {
    setFilters({
      searchQ: '', filterBiz: '', filterVisit: '',
      filterHasil: '', filterMandiri: '', filterNama: '',
      activeKawasan: 'ALL',
      ...filterOverride,
    });
    setFilterPanelOpen(false);
    setCurrentPage('list');
  };

  const goKawasan = (k: string) => {
    setFilters({ activeKawasan: k });
    setCurrentPage('list');
    setFilterPanelOpen(false);
  };

  const visitPct = totalStats.total ? Math.round(totalStats.visited / totalStats.total * 100) : 0;

  // Config setiap stat card
  const statCards = [
    {
      label: 'Total Merchant',
      value: totalStats.total,
      color: '#2563eb', bg: '#eff6ff', icon: '🏪',
      filter: {} as Parameters<typeof setFilters>[0],
      subNote: null as string | null,
    },
    {
      label: 'Sudah Visit',
      value: totalStats.visited,
      color: '#0891b2', bg: '#f0f9ff', icon: '✅',
      filter: { filterVisit: 'SUDAH' } as Parameters<typeof setFilters>[0],
      subNote: null,
    },
    {
      label: 'Follow Up',
      value: totalStats.followUp,
      color: '#d97706', bg: '#fffbeb', icon: '🔄',
      filter: { filterHasil: 'Follow Up' } as Parameters<typeof setFilters>[0],
      subNote: null,
    },
    {
      label: 'Tidak Berminat',
      value: totalStats.tidakBerminat,
      color: '#dc2626', bg: '#fef2f2', icon: '❌',
      filter: { filterHasil: 'Tidak Berminat' } as Parameters<typeof setFilters>[0],
      subNote: null,
    },
    {
      label: 'Closing',
      value: totalStats.closing,
      color: '#16a34a', bg: '#f0fdf4', icon: '🎯',
      filter: { filterHasil: 'Closing' } as Parameters<typeof setFilters>[0],
      subNote: null,
    },
    {
      label: 'Ada Mandiri',
      value: totalStats.mandiri,
      color: '#7c3aed', bg: '#f5f3ff', icon: '🏦',
      filter: { filterMandiri: 'any' } as Parameters<typeof setFilters>[0],
      // Opsi B: sub-note berapa closing yang sudah ada produk Mandiri
      subNote: totalStats.mandiriFromClosing > 0
        ? `🎯 ${totalStats.mandiriFromClosing} dari Closing`
        : null,
    },
  ];

  return (
    <div className="page active" id="page-dashboard">
      {/* Hero */}
      <div className="dash-hero" style={{ paddingBottom: 14 }}>
        <div className="hero-top">
          <div className="hero-greeting">
            <h2>Selamat Datang 👋</h2>
            <p>Dashboard Mapping Merchant</p>
          </div>
          <div className="hero-badge">{today}</div>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div className="kaw-section" style={{ marginTop: 12 }}>
        <div className="kaw-section-title">📊 Progress Kunjungan</div>

        {/* Overall progress bar */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Total Progress Visit</span>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{visitPct}%</span>
          </div>
          <div style={{ height: 10, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${visitPct}%`, background: 'linear-gradient(90deg, #2563eb, #06b6d4)', borderRadius: 8, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#64748b' }}>
            <span>{totalStats.visited} sudah visit</span>
            <span>{totalStats.total - totalStats.visited} belum visit</span>
          </div>
        </div>

        {/* Stat cards — semua clickable */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
          {statCards.map(stat => (
            <div
              key={stat.label}
              onClick={() => goFilter(stat.filter)}
              style={{
                background: stat.bg,
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${stat.color}20`,
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.02)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${stat.color}30`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: 24 }}>{stat.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{stat.label}</div>
                {stat.subNote && (
                  <div style={{
                    fontSize: 11,
                    color: '#16a34a',
                    fontWeight: 600,
                    marginTop: 4,
                    background: '#dcfce7',
                    borderRadius: 6,
                    padding: '2px 7px',
                    display: 'inline-block',
                  }}>
                    {stat.subNote}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14, color: `${stat.color}99`, flexShrink: 0 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kawasan stat cards */}
      <div className="kaw-section">
        <div className="kaw-section-title">Statistik Per Kawasan</div>
        <div className="kaw-grid" id="kawGrid">
          {KAWASAN_LIST.map(k => {
            const s = kwStats(merchants, k);
            const pct = s.total ? Math.round(s.visited / s.total * 100) : 0;
            const clr = KAW_HEX[k];
            return (
              <div
                key={k}
                className="kaw-card"
                style={{ '--kc': clr } as React.CSSProperties}
                onClick={() => goKawasan(k)}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: clr, borderRadius: '16px 16px 0 0' }} />
                <div className="kaw-card-head">
                  <div className="kaw-badge" style={{ background: clr }}>{k}</div>
                  <div className="kaw-info">
                    <h4>Kawasan {k}</h4>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{KAWASAN_LABEL[k]}</p>
                    <p>{s.total} merchant</p>
                  </div>
                </div>
                <div className="kaw-row3">
                  <div className="kaw-stat-box">
                    <div className="kaw-stat-n" style={{ color: 'var(--navy-mid)' }}>{s.total}</div>
                    <div className="kaw-stat-l">Total</div>
                  </div>
                  <div className="kaw-stat-box">
                    <div className="kaw-stat-n" style={{ color: '#0369a1' }}>{s.visited}</div>
                    <div className="kaw-stat-l">Visit</div>
                  </div>
                  <div className="kaw-stat-box">
                    <div className="kaw-stat-n" style={{ color: '#16a34a' }}>{s.done}</div>
                    <div className="kaw-stat-l">Done</div>
                  </div>
                </div>
                <div className="prog">
                  <div className="prog-fill" style={{ width: `${pct}%`, background: clr }} />
                </div>
                <div className="prog-pct">{pct}% visited</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
