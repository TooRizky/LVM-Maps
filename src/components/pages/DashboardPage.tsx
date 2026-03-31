import { useApp } from '../../context/AppContext';
import { kwStats, computeStats } from '../../lib/merchantUtils';
import { KAW_HEX, KAWASAN_LIST, KAWASAN_LABEL } from '../../lib/constants';

export default function DashboardPage() {
  const { merchants, setCurrentPage, setFilters, setFilterPanelOpen } = useApp();
  const totalStats = computeStats(merchants);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

  // Count hasil visit types
  const followUpCount     = merchants.filter(m => m.hasil_visit === 'Follow Up').length;
  const closingCount      = merchants.filter(m => m.hasil_visit === 'Closing').length;
  const tidakBerminatCount = merchants.filter(m => m.hasil_visit === 'Tidak Berminat').length;

  const goKawasan = (k: string) => {
    setFilters({ activeKawasan: k });
    setCurrentPage('list');
    setFilterPanelOpen(false);
  };

  const visitPct = totalStats.total ? Math.round(totalStats.visited / totalStats.total * 100) : 0;

  return (
    <div className="page active" id="page-dashboard">
      {/* Hero — greeting only */}
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

        {/* Summary stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Total Merchant', value: totalStats.total,       color: '#2563eb', bg: '#eff6ff', icon: '🏪' },
            { label: 'Sudah Visit',    value: totalStats.visited,      color: '#0891b2', bg: '#f0f9ff', icon: '✅' },
            { label: 'Follow Up',      value: followUpCount,           color: '#d97706', bg: '#fffbeb', icon: '🔄' },
            { label: 'Tidak Berminat', value: tidakBerminatCount,      color: '#dc2626', bg: '#fef2f2', icon: '❌' },
            { label: 'Closing',        value: closingCount,            color: '#16a34a', bg: '#f0fdf4', icon: '🎯' },
            { label: 'Ada Mandiri',    value: totalStats.mandiri,      color: '#7c3aed', bg: '#f5f3ff', icon: '🏦' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg,
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: `1px solid ${stat.color}20`,
            }}>
              <span style={{ fontSize: 24 }}>{stat.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{stat.label}</div>
              </div>
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
