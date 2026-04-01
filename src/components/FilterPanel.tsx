import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BIZ_EMOJI } from '../lib/constants';

export default function FilterPanel() {
  const { filterPanelOpen, filters, setFilters, merchants } = useApp();
  const [namaInput, setNamaInput] = useState(filters.filterNama || '');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const namaRef = useRef<HTMLDivElement>(null);

  // Merchant nama options for dropdown
  const namaOptions = [...new Set(merchants.map(m => m.nama).filter(Boolean))].sort();
  const filteredOptions = namaInput
    ? namaOptions.filter(n => n.toLowerCase().includes(namaInput.toLowerCase()))
    : namaOptions;

  // Business types from actual data
  const bizTypes = [...new Set(merchants.map(m => m.business).filter(Boolean))].sort();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (namaRef.current && !namaRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectNama = (nama: string) => {
    setNamaInput(nama);
    setFilters({ filterNama: nama });
    setDropdownOpen(false);
  };

  const clearNama = () => {
    setNamaInput('');
    setFilters({ filterNama: '' });
    setDropdownOpen(false);
  };

  if (!filterPanelOpen) return null;

  return (
    <div className="filter-panel open" id="filterPanel">

      {/* ── NEW: Filter by Nama Merchant ─────────────────── */}
      <div className="filter-label">Nama Merchant</div>
      <div className="filter-nama-wrap" ref={namaRef}>
        <input
          type="text"
          placeholder="Ketik atau pilih nama merchant..."
          value={namaInput}
          onChange={e => {
            setNamaInput(e.target.value);
            setFilters({ filterNama: '' }); // clear exact match while typing
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
        />
        {namaInput && (
          <button className="filter-nama-clear" onClick={clearNama} title="Hapus filter nama">✕</button>
        )}
        {dropdownOpen && filteredOptions.length > 0 && (
          <div className="filter-nama-dropdown">
            {filteredOptions.slice(0, 50).map(nama => (
              <div
                key={nama}
                className={`filter-nama-option${filters.filterNama === nama ? ' selected' : ''}`}
                onClick={() => selectNama(nama)}
              >
                {nama}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tipe Bisnis ────────────────────────────────── */}
      <div className="filter-label">Tipe Bisnis</div>
      <div className="chip-row" id="bizChips">
        <div
          className={`chip${!filters.filterBiz ? ' active' : ''}`}
          onClick={() => setFilters({ filterBiz: '' })}
        >Semua</div>
        {bizTypes.map(b => (
          <div
            key={b}
            className={`chip${filters.filterBiz === b ? ' active' : ''}`}
            onClick={() => setFilters({ filterBiz: filters.filterBiz === b ? '' : b })}
          >
            {BIZ_EMOJI[b] || ''} {b}
          </div>
        ))}
      </div>

      {/* ── Status Visit ──────────────────────────────── */}
      <div className="filter-label">Status Visit</div>
      <div className="chip-row" id="visitChips">
        {[
          { val: '', label: 'Semua' },
          { val: 'SUDAH', label: '✓ Sudah Visit' },
          { val: 'BELUM', label: 'Belum Visit' },
        ].map(({ val, label }) => (
          <div
            key={val}
            className={`chip${filters.filterVisit === val ? ' active' : ''}`}
            onClick={() => setFilters({ filterVisit: val })}
          >{label}</div>
        ))}
      </div>

      {/* ── Dropdowns ─────────────────────────────────── */}
      <div className="filter-selects">
        <select
          className="filter-sel"
          value={filters.filterHasil}
          onChange={e => setFilters({ filterHasil: e.target.value })}
        >
          <option value="">Semua Hasil</option>
          <option value="SUDAH">Done / Sudah</option>
          <option value="Follow Up">Follow Up</option>
          <option value="Tidak Berminat">Tidak Berminat</option>
          <option value="Closing">Closing</option>
          <option value="BELUM BERMINAT">Belum Berminat</option>
        </select>
        <select
          className="filter-sel"
          value={filters.filterMandiri}
          onChange={e => setFilters({ filterMandiri: e.target.value })}
        >
          <option value="">Semua Mandiri</option>
          <option value="any">Ada Mandiri (semua produk)</option>
          <option value="rekening">Ada Rekening</option>
          <option value="edc">Ada EDC</option>
          <option value="qr">Ada QR</option>
          <option value="none">Belum Ada</option>
        </select>
      </div>
    </div>
  );
}
