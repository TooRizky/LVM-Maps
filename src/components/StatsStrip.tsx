import { useApp } from '../context/AppContext';
import { computeStats } from '../lib/merchantUtils';

export default function StatsStrip() {
  const { getFilteredMerchants, currentPage } = useApp();
  if (currentPage !== 'list') return null;

  const filtered = getFilteredMerchants();
  const s = computeStats(filtered);

  return (
    <div className="stats-strip" id="statsStrip">
      <div className="stat-cell"><div className="stat-num">{s.total}</div><div className="stat-lbl">Total</div></div>
      <div className="stat-cell"><div className="stat-num">{s.visited}</div><div className="stat-lbl">Visit</div></div>
      <div className="stat-cell"><div className="stat-num">{s.mandiri}</div><div className="stat-lbl">Mandiri</div></div>
      <div className="stat-cell"><div className="stat-num">{s.done}</div><div className="stat-lbl">Done</div></div>
    </div>
  );
}
