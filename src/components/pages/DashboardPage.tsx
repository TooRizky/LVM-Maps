import { useApp } from '../../context/AppContext';
import { kwStats, computeStats } from '../../lib/merchantUtils';
import { KAW_HEX, KAWASAN_LIST } from '../../lib/constants';

export default function DashboardPage() {
  const { merchants, setCurrentPage, setFilters, setFilterPanelOpen } = useApp();
  const totalStats = computeStats(merchants);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

  const goKawasan = (k: string) => {
    setFilters({ activeKawasan: k });
    setCurrentPage('list');
    setFilterPanelOpen(false);
  };

  return (
    <div className="page active" id="page-dashboard">
      {/* Hero */}
      <div className="dash-hero">
        <div className="hero-top">
          <div className="hero-greeting">
            <h2>Selamat Datang 👋</h2>
            <p>Dashboard Mapping Merchant</p>
          </div>
          <div className="hero-badge" id="heroDate">{today}</div>
        </div>
        <div className="hero-stats">
          <div className="hs">
            <div className="hs-n" id="hero-total">{totalStats.total}</div>
            <div className="hs-l">Total</div>
          </div>
          <div className="hs">
            <div className="hs-n" id="hero-visit">{totalStats.visited}</div>
            <div className="hs-l">Visit</div>
          </div>
          <div className="hs">
            <div className="hs-n" id="hero-mandiri">{totalStats.mandiri}</div>
            <div className="hs-l">Mandiri</div>
          </div>
          <div className="hs">
            <div className="hs-n" id="hero-done">{totalStats.done}</div>
            <div className="hs-l">Done</div>
          </div>
        </div>
      </div>

      {/* Denah Kawasan */}
      <div className="denah-section">
        <div className="section-title-bar">
          <div className="section-title">🗺️ Denah Kawasan</div>
          <div className="section-hint">Tap kawasan untuk lihat merchant</div>
        </div>
        <div className="denah-scroll">
          <div className="denah-canvas">
            {/* Roads */}
            <div className="road-h" style={{ top: '44%', height: '3%' }} />
            <div className="road-h" style={{ top: '97%', height: '3%' }} />
            <div className="road-v" style={{ left: '8%', width: '3%' }} />
            <div className="road-v" style={{ left: '18%', width: '3%' }} />
            <div className="road-v" style={{ left: '29%', width: '2%' }} />
            <div className="road-v" style={{ left: '40%', width: '2%' }} />
            <div className="road-v" style={{ left: '60%', width: '3%' }} />

            {/* Boundaries — outline boxes per zone */}
            <div className="boundary" style={{ left: '0%',  top: '0%',  width: '28%', bottom: '56%' }} />
            <div className="boundary" style={{ left: '31%', top: '0%',  right: '37%', bottom: '56%' }} />
            <div className="boundary" style={{ left: '63%', top: '0%',  right: '0%',  bottom: '43%' }} />
            <div className="boundary" style={{ left: '0%',  top: '47%', right: '63%', bottom: '0%'  }} />

            {/* ── KAWASAN A ──
                Fixed: was right:40% (width=60%) → center at 30%, covered by B which starts at 29%.
                Now: width:28% → center at 14% → label clearly visible in its own zone. */}
            <div className="kw" style={{ left: '0%', top: '0%', width: '28%', height: '44%', background: 'var(--kA)' }} onClick={() => goKawasan('A')}>
              <span className="ltr">A</span>
              <span className="cnt">{kwStats(merchants, 'A').total}</span>
            </div>

            {/* ── KAWASAN B ── left:31% so road at 29-31% is visible between A & B */}
            <div className="kw" style={{ left: '31%', top: '0%', right: '37%', height: '44%', background: 'var(--kB)' }} onClick={() => goKawasan('B')}>
              <span className="ltr">B</span>
              <span className="cnt">{kwStats(merchants, 'B').total}</span>
            </div>

            {/* ── KAWASAN C ── */}
            <div className="kw" style={{ left: '63%', top: '0%', right: '0%', height: '43%', background: 'var(--kC)' }} onClick={() => goKawasan('C')}>
              <span className="ltr">C</span>
              <span className="cnt">{kwStats(merchants, 'C').total}</span>
            </div>

            {/* ── KAWASAN D ── horizontal strip in the middle-lower area */}
            <div className="kw" style={{ left: '42%', top: '55%', right: '19%', height: '12%', background: 'var(--kD)' }} onClick={() => goKawasan('D')}>
              <span className="ltr" style={{ fontSize: 'clamp(9px,2vw,14px)' }}>D</span>
              <span className="cnt">{kwStats(merchants, 'D').total}</span>
            </div>

            {/* ── KAWASAN E ── narrow vertical strip far left */}
            <div className="kw" style={{ left: '0%', top: '47%', width: '8%', height: '6%', background: 'var(--kE)' }} onClick={() => goKawasan('E')}>
              <span className="ltr" style={{ fontSize: 'clamp(8px,1.8vw,12px)' }}>E</span>
            </div>
            <div className="kw vert" style={{ left: '0%', top: '54%', width: '8%', height: '44%', background: 'var(--kE)' }} onClick={() => goKawasan('E')}>
              <span className="ltr">E</span>
              <span className="cnt">{kwStats(merchants, 'E').total}</span>
            </div>

            {/* ── KAWASAN F ── narrow vertical strip, next to E with road gap */}
            <div className="kw" style={{ left: '20%', top: '47%', width: '9%', height: '6%', background: 'var(--kF)' }} onClick={() => goKawasan('F')}>
              <span className="ltr" style={{ fontSize: 'clamp(8px,1.8vw,12px)' }}>F</span>
            </div>
            <div className="kw vert" style={{ left: '20%', top: '54%', width: '9%', height: '44%', background: 'var(--kF)' }} onClick={() => goKawasan('F')}>
              <span className="ltr">F</span>
              <span className="cnt">{kwStats(merchants, 'F').total}</span>
            </div>

            {/* ── Office pins ── */}
            <div className="office-pin" style={{ left: '50%', top: '1%', transform: 'translateX(-50%)' }}>
              <div className="office-icon">🏦</div>
              <div className="office-lbl">Cab Baru</div>
            </div>
            <div className="office-pin" style={{ left: '36%', top: '26%', transform: 'translateX(-50%)' }}>
              <div className="office-icon">🏦</div>
              <div className="office-lbl">Cab Lama</div>
            </div>
            <div className="taman-pin" style={{ left: '10%', top: '63%' }}>Taman<br />Ratu</div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend-row">
          {KAWASAN_LIST.map(k => (
            <div className="leg" key={k}>
              <div className="leg-dot" style={{ background: KAW_HEX[k] }} />
              Kaw {k}
            </div>
          ))}
          <div className="leg"><span style={{ fontSize: 12 }}>🏦</span> Kantor Cab.</div>
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
