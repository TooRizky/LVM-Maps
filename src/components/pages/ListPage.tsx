import { useApp } from '../../context/AppContext';
import FilterPanel from '../FilterPanel';
import StatsStrip from '../StatsStrip';
import MerchantCard from '../MerchantCard';

export default function ListPage() {
  const { getFilteredMerchants, currentPage } = useApp();
  if (currentPage !== 'list') return null;

  const filtered = getFilteredMerchants();

  return (
    <div className="page active" id="page-list">
      <FilterPanel />
      <StatsStrip />
      <div className="merchant-list" id="merchantList">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>Tidak ada merchant</p>
            <small>Ubah filter atau kata kunci pencarian</small>
          </div>
        ) : (
          filtered.map(m => <MerchantCard key={m.id} merchant={m} />)
        )}
      </div>
    </div>
  );
}
