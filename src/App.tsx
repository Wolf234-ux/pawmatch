import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { firebaseConfigured } from './firebase';
import Welcome from './pages/Welcome';
import Setup from './pages/Setup';
import Discover from './pages/Discover';
import DogProfile from './pages/DogProfile';
import Chats from './pages/Chats';
import ChatRoom from './pages/ChatRoom';
import Me from './pages/Me';
import { Paw } from './components/Icons';

export default function App() {
  const { user, profile, dog, loading } = useAuth();

  if (!firebaseConfigured) {
    return (
      <div className="app"><div className="center">
        <Paw size={40} color="#c94f27" />
        <h1 className="title">Firebase not configured</h1>
        <p className="lead">Copy <code>.env.example</code> to <code>.env</code> and paste your Firebase web app config. See README.</p>
      </div></div>
    );
  }

  if (loading) {
    return <div className="app"><div className="center"><Paw size={40} color="#c94f27" /><span className="muted">Loading…</span></div></div>;
  }

  const ready = Boolean(user && profile && dog);

  return (
    <div className="app">
      <Routes>
        {!user && <Route path="*" element={<Welcome />} />}
        {user && !ready && <Route path="*" element={<Setup />} />}
        {ready && (
          <>
            <Route path="/discover" element={<Discover />} />
            <Route path="/dog/:uid" element={<DogProfile />} />
            <Route path="/chats" element={<Chats />} />
            <Route path="/chat/:chatId" element={<ChatRoom />} />
            <Route path="/me" element={<Me />} />
            <Route path="*" element={<Navigate to="/discover" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
}
