import { useEffect, useState, type FormEvent } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { claimUsername, getPrivate, saveDog, savePrivate, saveProfileLocation, uploadDogPhoto } from '../lib/api';
import { errMsg, roundCoord, USERNAME_RE } from '../lib/util';
import { HEALTH_TAGS, TEMPERAMENTS, type Gender, type Size } from '../types';
import { Lock } from './Icons';
import DogPhoto from './DogPhoto';

export default function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved?: () => void }) {
  const { user, profile, dog } = useAuth();
  const uid = user!.uid;

  const [username, setUsername] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(profile?.city ?? '');
  const [lat, setLat] = useState<number | null>(profile?.lat ?? null);
  const [lng, setLng] = useState<number | null>(profile?.lng ?? null);

  const [name, setName] = useState(dog?.name ?? '');
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [gender, setGender] = useState<Gender>(dog?.gender ?? 'Male');
  const [ageYears, setAge] = useState(String(dog?.ageYears ?? ''));
  const [weightKg, setWeight] = useState(dog?.weightKg != null ? String(dog.weightKg) : '');
  const [size, setSize] = useState<Size>(dog?.size ?? 'Medium');
  const [about, setAbout] = useState(dog?.about ?? '');
  const [temperament, setTemperament] = useState<string[]>(dog?.temperament ?? []);
  const [health, setHealth] = useState<string[]>(dog?.health ?? []);
  const [photoUrls, setPhotoUrls] = useState<string[]>(dog?.photoUrls ?? []);

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [locMsg, setLocMsg] = useState('');

  useEffect(() => {
    getPrivate(uid).then((p) => {
      if (!p) return;
      setRealName(p.realName);
      setPhone(p.phone);
      setAddress(p.address);
    }).catch(() => {});
  }, [uid]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function useMyLocation() {
    if (!navigator.geolocation) { setLocMsg('Location not available on this device.'); return; }
    setLocMsg('Getting location…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(roundCoord(p.coords.latitude));
        setLng(roundCoord(p.coords.longitude));
        setLocMsg('Approximate location saved (rounded to ~1 km).');
      },
      () => setLocMsg('Could not get location. Distance will not be shown.'),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function onPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 6 - photoUrls.length)) {
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) throw new Error(`${f.name} is larger than 5 MB.`);
        urls.push(await uploadDogPhoto(uid, f));
      }
      setPhotoUrls((p) => [...p, ...urls].slice(0, 6));
    } catch (e) {
      setError(`Photo upload failed: ${errMsg(e)}`);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let myUsername = profile?.username;
      if (!myUsername) {
        const u = username.trim().toLowerCase().replace(/^@/, '');
        if (!USERNAME_RE.test(u)) throw new Error('Username: 3–20 characters, only a–z, 0–9, _ and .');
        const taken = await getDoc(doc(db, 'usernames', u));
        if (taken.exists()) throw new Error('That username is taken.');
        await claimUsername(uid, u);
        myUsername = u;
      }
      const age = Number(ageYears);
      if (!name.trim() || !breed.trim()) throw new Error("Please add your dog's name and breed.");
      if (!Number.isFinite(age) || age < 0 || age > 25) throw new Error('Please enter a valid age.');

      await saveProfileLocation(uid, city.trim(), lat, lng);
      await savePrivate(uid, { realName: realName.trim(), phone: phone.trim(), address: address.trim() });
      await saveDog(uid, {
        ownerUid: uid,
        ownerUsername: myUsername,
        name: name.trim(),
        breed: breed.trim(),
        gender,
        ageYears: age,
        weightKg: weightKg ? Number(weightKg) : null,
        size,
        about: about.trim(),
        temperament,
        health,
        photoUrls,
        city: city.trim(),
        lat,
        lng,
      });
      onSaved?.();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!profile && (
        <div className="field">
          <label htmlFor="un">Choose a username (public)</label>
          <input id="un" className="input" placeholder="bruno_dad" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
      )}

      <h2 className="section-title">Your dog (public)</h2>
      <div className="field">
        <span style={{ fontSize: 13, fontWeight: 600 }}>Photos (up to 6)</span>
        <div className="thumbs">
          {photoUrls.map((u, i) => (
            <div className="thumb" key={u}>
              <DogPhoto url={u} alt={`Photo ${i + 1}`} className="thumb" style={{ width: 72, height: 72, borderRadius: 12 }} />
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotoUrls(photoUrls.filter((x) => x !== u))}>×</button>
            </div>
          ))}
          {photoUrls.length < 6 && (
            <label className="thumb photo" style={{ cursor: 'pointer', border: '1.5px dashed var(--line)', fontSize: 24 }}>
              {uploading ? '…' : '+'}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onPhotos(e.target.files)} />
              <span className="sr-only">Add photos</span>
            </label>
          )}
        </div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="dn">Name</label><input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label htmlFor="db">Breed</label><input id="db" className="input" placeholder="Labrador" value={breed} onChange={(e) => setBreed(e.target.value)} required /></div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="dg">Gender</label>
          <select id="dg" className="select" value={gender} onChange={(e) => setGender(e.target.value as Gender)}><option>Male</option><option>Female</option></select>
        </div>
        <div className="field"><label htmlFor="ds">Size</label>
          <select id="ds" className="select" value={size} onChange={(e) => setSize(e.target.value as Size)}><option>Small</option><option>Medium</option><option>Large</option></select>
        </div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="da">Age (years)</label><input id="da" className="input" type="number" min={0} max={25} step="0.5" value={ageYears} onChange={(e) => setAge(e.target.value)} required /></div>
        <div className="field"><label htmlFor="dw">Weight (kg)</label><input id="dw" className="input" type="number" min={0} max={120} step="0.5" value={weightKg} onChange={(e) => setWeight(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="dab">About</label>
        <textarea id="dab" className="textarea" maxLength={600} placeholder="Personality, what kind of mate you are looking for…" value={about} onChange={(e) => setAbout(e.target.value)} />
      </div>
      <div className="field"><span style={{ fontSize: 13, fontWeight: 600 }}>Temperament</span>
        <div className="chips">{TEMPERAMENTS.map((t) => <button type="button" key={t} className={`chip ${temperament.includes(t) ? 'on' : ''}`} aria-pressed={temperament.includes(t)} onClick={() => toggle(temperament, setTemperament, t)}>{t}</button>)}</div>
      </div>
      <div className="field"><span style={{ fontSize: 13, fontWeight: 600 }}>Health &amp; papers</span>
        <div className="chips">{HEALTH_TAGS.map((t) => <button type="button" key={t} className={`chip ${health.includes(t) ? 'on' : ''}`} aria-pressed={health.includes(t)} onClick={() => toggle(health, setHealth, t)}>{t}</button>)}</div>
      </div>

      <h2 className="section-title">Area (public, approximate)</h2>
      <div className="field"><label htmlFor="city">City / area</label><input id="city" className="input" placeholder="e.g. Ahmedabad" value={city} onChange={(e) => setCity(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={useMyLocation}>{lat != null ? 'Update my location' : 'Use my location for distance'}</button>
        <span className="muted">{locMsg || (lat != null ? 'Approximate location set.' : '')}</span>
      </div>

      <div className="notice notice-blue">
        <Lock size={22} color="#2457a6" />
        <div><strong>Private details</strong> are never shown on your profile. They are revealed only inside a chat after you <em>and</em> the other owner both tap Accept.</div>
      </div>
      <div className="field"><label htmlFor="rn">Your real name (private)</label><input id="rn" className="input" maxLength={80} value={realName} onChange={(e) => setRealName(e.target.value)} /></div>
      <div className="field"><label htmlFor="ph">Phone (private)</label><input id="ph" className="input" type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div className="field"><label htmlFor="ad">Address / meeting area (private)</label><input id="ad" className="input" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} /></div>

      {error && <div className="notice notice-err" role="alert">{error}</div>}
      <button className="btn btn-primary btn-block" disabled={busy || uploading}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}
