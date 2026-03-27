import { useApp } from './context/AppContext';
import Header from './components/Header';
import SyncBar from './components/SyncBar';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import Lightbox from './components/Lightbox';
import ConfirmDialog from './components/ConfirmDialog';
import DashboardPage from './components/pages/DashboardPage';
import ListPage from './components/pages/ListPage';
import AddModal from './components/modals/AddModal';
import EditModal from './components/modals/EditModal';
import SetupModal from './components/modals/SetupModal';

function AppInner() {
  const { currentPage, setAddModalOpen } = useApp();

  return (
    <>
      {/* Left sidebar (desktop) / Bottom nav (mobile) */}
      <BottomNav />

      {/* Main content area */}
      <div className="app-right">
        <Header />
        <SyncBar />

        {/* Pages */}
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'list'      && <ListPage />}
      </div>

      {/* Desktop FAB */}
      <button className="desktop-fab" onClick={() => setAddModalOpen(true)}>＋</button>

      {/* Modals & overlays */}
      <AddModal />
      <EditModal />
      <SetupModal />
      <ConfirmDialog />
      <Lightbox />
      <Toast />
    </>
  );
}

export default function App() {
  return <AppInner />;
}
