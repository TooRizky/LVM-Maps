import { useApp } from '../context/AppContext';

export default function SyncBar() {
  const { syncBar } = useApp();

  return (
    <div
      className={`sync-bar${syncBar.show ? ' show' : ''}${syncBar.type ? ' ' + syncBar.type : ''}`}
    >
      {syncBar.message}
    </div>
  );
}
