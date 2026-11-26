import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { swipe } from '../lib/api';
import { distanceKm, errMsg, formatDistance } from '../lib/util';
import type { Dog } from '../types';
import DogPhoto from '../components/DogPhoto';
import { Back, Lock, Paw } from '../components/Icons';

export default function DogProfile() {
  const { uid } = useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'dogs', uid)).then((s) => setDog(s.exists() ? (s.data() as Dog) : null)).finally(() => setLoading(false));
  }, [uid]);

  if (loading) return <div className="center"><Paw size={36} color="#c94f27" /></div>;
  if (!dog) return <div className="center"><p className="lead">This dog profile is no longer available.</p><button className="btn btn-ghost" onClick={() => nav(-1)}>Go back</button></div>;

  const isMine = dog.ownerUid === user!.uid;
  const km = distanceKm(profile?.lat ?? null, profile?.lng ?? null, dog.lat, dog.lng);

  async function act(liked: boolean) {
    setBusy(true);
    setMsg('');
    try {
      const chatId = await swipe(user!.uid, dog!.ownerUid, liked);
      if (chatId) nav(`/chat/${chatId}`);
      else if (liked) setMsg(`Request sent. If @${dog!.ownerUsername} likes ${dog!.name} back, a private chat opens.`);
      else nav('/discover');
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ position: 'relative' }}>
        <DogPhoto url={dog.photoUrls[photo]} alt={`${dog.name} photo ${photo + 1}`} style={{ height: 320 }} />
        <button className="icon-btn round" aria-label="Back" onClick={() => nav(-1)} style={{ position: 'absolute', top: 16, left: 16, border: 0 }}><Back size={20} /></button>
        {dog.photoUrls.length > 1 && (
          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {dog.photoUrls.map((_, i) => (
              <button key={i} aria-label={`Photo ${i + 1}`} onClick={() => setPhoto(i)} style={{ width: 28, height: 28, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: i === photo ? '#fff' : 'rgba(255,255,255,.5)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="page" style={{ marginTop: -24, borderRadius: '24px 24px 0 0', background: 'var(--bg)', position: 'relative', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <h1 className="title" style={{ fontSize: 28 }}>{dog.name}</h1>
          <span className="muted">{[formatDistance(km), dog.city].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="stats">
          <div className="stat"><div>Age</div><div>{dog.ageYears} yrs</div></div>
          <div className="stat"><div>Gender</div><div>{dog.gender}</div></div>
          <div className="stat"><div>Weight</div><div>{dog.weightKg != null ? `${dog.weightKg} kg` : '—'}</div></div>
          <div className="stat"><div>Size</div><div>{dog.size}</div></div>
        </div>
        <div>
          <h2 className="section-title" style={{ marginBottom: 6 }}>About {dog.name}</h2>
          <p className="lead" style={{ fontSize: 14 }}>{dog.breed}. {dog.about}</p>
        </div>
        {dog.temperament.length > 0 && <div className="chips">{dog.temperament.map((t) => <span key={t} className="tag tag-accent">{t}</span>)}</div>}
        {dog.health.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="section-title">Health &amp; papers</h2>
            <div className="chips">{dog.health.map((t) => <span key={t} className="tag tag-green">{t}</span>)}</div>
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Lock size={22} color="#2457a6" /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>@{dog.ownerUsername}</span>
            <span className="muted" style={{ fontSize: 12 }}>Owner details hidden until you both agree in chat</span>
          </div>
        </div>
        {msg && <div className="notice notice-green" role="status">{msg}</div>}
        {!isMine && (
          <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => act(false)}>Pass</button>
            <button className="btn btn-primary" style={{ flex: 2 }} disabled={busy} onClick={() => act(true)}>Send match request</button>
          </div>
        )}
      </div>
    </div>
  );
}
