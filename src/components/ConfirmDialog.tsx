import { useApp } from '../context/AppContext';

export default function ConfirmDialog() {
  const { confirmModal, setConfirmModal, deleteMerchant } = useApp();

  const close = () => setConfirmModal({ open: false, id: null, nama: '' });

  const confirm = () => {
    if (confirmModal.id !== null) {
      deleteMerchant(confirmModal.id);
    }
    close();
  };

  return (
    <div className={`confirm-overlay${confirmModal.open ? ' open' : ''}`} onClick={close}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <h3>🗑️ Hapus Merchant?</h3>
        <p>"{confirmModal.nama}" akan dihapus permanen dari lokal dan Sheets.</p>
        <div className="confirm-btns">
          <button className="btn-cancel-conf" onClick={close}>Batal</button>
          <button className="btn-confirm-del" onClick={confirm}>Hapus</button>
        </div>
      </div>
    </div>
  );
}
