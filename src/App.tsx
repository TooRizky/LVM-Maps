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
import ImportModal from './components/modals/ImportModal';
import PicModal from './components/modals/PicModal';

function AppInner() {
  const { currentPage, setAddModalOpen } = useApp();
  return (
    <>
      <BottomNav />
      <div className="app-right">
        <Header />
        <SyncBar />
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'list'      && <ListPage />}
      </div>
      <button className="desktop-fab" onClick={() => setAddModalOpen(true)}>＋</button>
      <AddModal />
      <EditModal />
      <ImportModal />
      <PicModal />
      <ConfirmDialog />
      <Lightbox />
      <Toast />
    </>
  );
}
export default function App() { return <AppInner />; }
