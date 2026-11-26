import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../auth';
import ProfileForm from '../components/ProfileForm';
import BottomNav from '../components/BottomNav';
import DogPhoto from '../components/DogPhoto';
import { Lock } from '../components/Icons';

export default function Me() {
  const { profile, dog } = useAuth();
  const [saved, setSaved] = useState(false);
  return (
    <>
      <div className="page with-nav">
        <div className="topbar">
          <h1 className="title">My dog</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut(auth)}>Log out</button>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <DogPhoto url={dog?.photoUrls[0]} alt={dog?.name ?? ''} className="avatar" style={{ width: 64, height: 64 }} />
          <div>
            <div className="display" style={{ fontWeight: 800, fontSize: 20 }}>{dog?.name}</div>
            <div className="owner-line"><Lock size={14} color="#2457a6" />Shown as <strong>@{profile?.username}</strong></div>
          </div>
        </div>
        {saved && <div className="notice notice-green" role="status">Profile saved.</div>}
        <ProfileForm submitLabel="Save changes" onSaved={() => { setSaved(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>
      <BottomNav />
    </>
  );
}
