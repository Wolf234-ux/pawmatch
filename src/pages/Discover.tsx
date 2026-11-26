import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { loadDogs, mySwipedIds, swipe } from '../lib/api';
import { distanceKm, errMsg, formatDistance } from '../lib/util';
import type { Dog } from '../types';
import BottomNav from '../components/BottomNav';
import DogPhoto from '../components/DogPhoto';
import { Filter, Heart, Lock, Paw, X } from '../components/Icons';

type GenderFilter = 'Any' | 'Male' | 'Female';
const DISTANCES = [10, 25, 50, 0]; // 0 = any

export default function Discover() {
  const { user, profile, dog: myDog } = useAuth();
  const me = user!.uid;
  const nav = useNavigate();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [swiped, setSwiped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [gender, setGender] = useState<GenderFilter>(myDog?.gender === 'Male' ? 'Female' : myDog?.gender === 'Female' ? 'Male' : 'Any');
  const [sameBreed, setSameBreed] = useState(false);
  const [maxKm, setMaxKm] = useState(0);
  const [matchChat, setMatchChat] = useState<{ id: string; dog: Dog } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([loadDogs(), mySwipedIds(me)])
      .then(([d, s]) => { setDogs(d); setSwiped(s); })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [me]);

  const queue = useMemo(() => dogs.filter((d) => {
    if (d.ownerUid === me || swiped.has(d.ownerUid)) return false;
    if (gender !== 'Any' && d.gender !== gender) return false;
    if (sameBreed && myDog && d.breed.trim().toLowerCase() !== myDog.breed.trim().toLowerCase()) return false;
    if (maxKm) {
      const km = distanceKm(profile?.lat ?? null, profile?.lng ?? null, d.lat, d.lng);
      if (km == null || km > maxKm) return false;
    }
    return true;
  }), [dogs, swiped, me, gender, sameBreed, maxKm, myDog, profile]);

  const current = queue[0];
  const km = current ? distanceKm(profile?.lat ?? null, profile?.lng ?? null, current.lat, current.lng) : null;

  async function act(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const chatId = await swipe(me, current.ownerUid, liked);
      setSwiped((s) => new Set(s).add(current.ownerUid));
      if (chatId) setMatchChat({ id: chatId, dog: current });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page with-nav" style={{ gap: 12 }}>
        <div className="topbar">
          <h1 className="title">Discover</h1>
          <button className="icon-btn" aria-label="Filters" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}><Filter size={20} /></button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fff', borderRadius: 16, padding: 14 }}>
            <div className="chips" role="group" aria-label="Gender">
              {(['Any', 'Female', 'Male'] as GenderFilter[]).map((g) => (
                <button key={g} className={`chip ${gender === g ? 'on' : ''}`} aria-pressed={gender === g} onClick={() => setGender(g)}>{g === 'Any' ? 'Any gender' : g}</button>
              ))}
            </div>
            <div className="chips" role="group" aria-label="Distance">
              {DISTANCES.map((d) => (
                <button key={d} className={`chip ${maxKm === d ? 'on' : ''}`} aria-pressed={maxKm === d} onClick={() => setMaxKm(d)}>{d ? `Within ${d} km` : 'Any distance'}</button>
              ))}
            </div>
            <div className="chips">
              <button className={`chip ${sameBreed ? 'on' : ''}`} aria-pressed={sameBreed} onClick={() => setSameBreed(!sameBreed)}>Same breed as {myDog?.name}</button>
            </div>
          </div>
        )}

        {error && <div className="notice notice-err" role="alert">{error}</div>}

        {loading ? (
          <div className="center"><Paw size={36} color="#c94f27" /><span className="muted">Finding dogs…</span></div>
        ) : !current ? (
          <div className="center">
            <Paw size={40} color="#c94f27" />
            <h2 style={{ margin: 0 }}>No more dogs right now</h2>
            <p className="lead">Try widening your filters, or check back later as new owners join.</p>
          </div>
        ) : (
          <>
            <Link to={`/dog/${current.ownerUid}`} className="card" style={{ flex: 1 }}>
              <DogPhoto url={current.photoUrls[0]} alt={current.name} style={{ flex: 1, minHeight: 300 }} />
              <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span className="display" style={{ fontWeight: 800, fontSize: 26 }}>{current.name}, {current.ageYears}</span>
                  <span className="muted">{formatDistance(km) || current.city}</span>
                </div>
                <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{current.breed} · {current.gender}{current.health.includes('Vaccinated') ? ' · Vaccinated' : ''}</span>
                {current.temperament.length > 0 && (
                  <div className="chips">{current.temperament.slice(0, 3).map((t) => <span key={t} className="tag tag-accent">{t}</span>)}</div>
                )}
                <div className="owner-line" style={{ paddingTop: 6, borderTop: '1px solid var(--line-2)' }}>
                  <Lock size={16} color="#2457a6" />Owner: <strong>@{current.ownerUsername}</strong> · identity hidden
                </div>
              </div>
            </Link>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <button className="icon-btn round" style={{ width: 60, height: 60 }} aria-label={`Pass on ${current.name}`} disabled={busy} onClick={() => act(false)}><X size={26} color="#5c6477" /></button>
              <button className="icon-btn round" style={{ width: 60, height: 60, background: 'var(--accent)', border: 0 }} aria-label={`Like ${current.name}`} disabled={busy} onClick={() => act(true)}><Heart size={26} color="#fff" /></button>
            </div>
          </>
        )}
      </div>

      {matchChat && (
        <div role="dialog" aria-modal="true" aria-labelledby="match-title" style={{ position: 'fixed', inset: 0, background: 'rgba(31,42,68,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 24, padding: 24, maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
            <Heart size={40} color="#c94f27" />
            <h2 id="match-title" style={{ margin: 0, fontSize: 26 }}>It's a match!</h2>
            <p className="lead">{myDog?.name} and {matchChat.dog.name} like each other. Start a private chat with @{matchChat.dog.ownerUsername}.</p>
            <button className="btn btn-primary" onClick={() => nav(`/chat/${matchChat.id}`)}>Open chat</button>
            <button className="btn btn-ghost" onClick={() => setMatchChat(null)}>Keep browsing</button>
          </div>
        </div>
      )}
      <BottomNav />
    </>
  );
}
