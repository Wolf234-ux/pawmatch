import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { firebaseConfigured } from './firebase';
// Each screen is a separate small file, downloaded only when first opened.
const Welcome = lazy(() => import('./pages/Welcome'));
const Setup = lazy(() => import('./pages/Setup'));
const Discover = lazy(() => import('./pages/Discover'));
const DogProfile = lazy(() => import('./pages/DogProfile'));
const Chats = lazy(() => import('./pages/Chats'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));
const Me = lazy(() => import('./pages/Me'));
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
      <Suspense fallback={<div className="center"><Paw size={40} color="#c94f27" /></div>}>
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
      </Suspense>
    </div>
  );
}
