import { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Lock, Paw } from '../components/Icons';
import { errMsg, USERNAME_RE } from '../lib/util';
import { claimUsername } from '../lib/api';

export default function Welcome() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return;
      }
      const u = username.trim().toLowerCase().replace(/^@/, '');
      if (!USERNAME_RE.test(u)) throw new Error('Username: 3–20 characters, only a–z, 0–9, _ and . (no real names).');
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const taken = await getDoc(doc(db, 'usernames', u));
      if (taken.exists()) throw new Error('That username is taken. Pick another on the next screen.');
      await claimUsername(cred.user.uid, u);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="page" onSubmit={submit} style={{ paddingTop: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paw size={24} color="#fff" />
        </div>
        <span className="display" style={{ fontWeight: 800, fontSize: 24 }}>PawMatch</span>
      </div>

      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: 32, lineHeight: 1.1, fontWeight: 800 }}>
          {mode === 'signup' ? 'Find the perfect mate for your dog' : 'Welcome back'}
        </h1>
        <p className="lead">Only your dog is on show. You stay anonymous behind a username.</p>
      </div>

      {mode === 'signup' && (
        <div className="field">
          <label htmlFor="u">Username (public)</label>
          <input id="u" className="input" placeholder="bruno_dad" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <span className="muted">No real names. This is all other owners see.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="e">Email (private)</label>
        <input id="e" className="input" type="email" placeholder="For login only" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="p">Password</label>
        <input id="p" className="input" type="password" minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      {mode === 'signup' && (
        <div className="notice notice-blue">
          <Lock size={22} color="#2457a6" />
          <div><strong>Your details stay hidden.</strong> Name, phone and address are shared only inside a private chat, and only when both owners agree.</div>
        </div>
      )}

      {error && <div className="notice notice-err" role="alert">{error}</div>}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account & add my dog' : 'Log in'}
        </button>
        <span className="muted" style={{ fontSize: 14 }}>
          {mode === 'signup' ? 'Already a member? ' : 'New here? '}
          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }} style={{ background: 'none', border: 0, color: 'var(--accent-dark)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            {mode === 'signup' ? 'Log in' : 'Create an account'}
          </button>
        </span>
      </div>
    </form>
  );
}
