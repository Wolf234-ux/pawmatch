import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { getPrivate, sendMessage, setConsent } from '../lib/api';
import { errMsg, otherMember } from '../lib/util';
import type { Chat, Dog, Message, PrivateDetails } from '../types';
import DogPhoto from '../components/DogPhoto';
import { Back, IdCard, Lock, Send } from '../components/Icons';

export default function ChatRoom() {
  const { chatId } = useParams();
  const { user, dog: myDog } = useAuth();
  const me = user!.uid;
  const nav = useNavigate();
  const [chat, setChat] = useState<Chat | null | undefined>(undefined);
  const [dog, setDog] = useState<Dog | null>(null);
  const [messages, setMessages] = useState<(Message & { id: string })[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [theirs, setTheirs] = useState<PrivateDetails | null>(null);
  const [mine, setMine] = useState<PrivateDetails | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const other = chat ? otherMember(chat.members, me) : null;
  const iConsent = Boolean(chat && chat.consent?.[me]);
  const theyConsent = Boolean(chat && other && chat.consent?.[other]);
  const shared = iConsent && theyConsent;
  const chatReady = chat !== undefined && chat !== null;

  useEffect(() => {
    if (!chatId) return;
    return onSnapshot(doc(db, 'chats', chatId), (s) => setChat(s.exists() ? (s.data() as Chat) : null), () => setChat(null));
  }, [chatId]);

  useEffect(() => {
    if (!other) return;
    getDoc(doc(db, 'dogs', other)).then((s) => setDog(s.exists() ? (s.data() as Dog) : null)).catch(() => {});
  }, [other]);

  useEffect(() => {
    if (!chatId || !chatReady) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(500));
    return onSnapshot(q, (s) => setMessages(s.docs.map((d) => ({ id: d.id, ...(d.data() as Message) }))));
  }, [chatId, chatReady]);

  // Contact details are fetched ONLY when both consented — and the security rules enforce the same.
  useEffect(() => {
    if (!shared || !other) { setTheirs(null); return; }
    getPrivate(other).then(setTheirs).catch(() => setTheirs(null));
    getPrivate(me).then(setMine).catch(() => {});
  }, [shared, other, me]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [messages.length, shared, theyConsent]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !chatId) return;
    setText('');
    try { await sendMessage(chatId, me, t); } catch (err) { setError(errMsg(err)); setText(t); }
  }

  async function consent(v: boolean) {
    if (!chatId) return;
    try { await setConsent(chatId, me, v); } catch (err) { setError(errMsg(err)); }
  }

  if (chat === undefined) return <div className="center"><span className="muted">Loading…</span></div>;
  if (chat === null) return <div className="center"><p className="lead">This chat is not available.</p><button className="btn btn-ghost" onClick={() => nav('/chats')}>Back to chats</button></div>;

  const handle = dog ? `@${dog.ownerUsername}` : 'the other owner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div className="chat-head">
        <button className="icon-btn" style={{ border: 0 }} aria-label="Back" onClick={() => nav('/chats')}><Back size={20} /></button>
        <button onClick={() => other && nav(`/dog/${other}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, padding: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
          <DogPhoto url={dog?.photoUrls[0]} alt={dog?.name ?? ''} className="avatar" style={{ width: 40, height: 40 }} />
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="ellipsis" style={{ fontWeight: 600, fontSize: 15 }}>{dog?.name ?? 'Dog'} · {handle}</span>
            <span style={{ fontSize: 12, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}><Lock size={12} color="#2457a6" />Private chat</span>
          </span>
        </button>
      </div>

      <div className="chat-body">
        <div className="notice notice-blue" style={{ fontSize: 12 }}>
          <Lock size={18} color="#2457a6" />
          <div>You are chatting as usernames only. Real names and phone numbers appear here only if you <strong>both</strong> choose to share.</div>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.from === me ? 'me' : 'them'}`}>{m.text}</div>
        ))}

        {theyConsent && !iConsent && (
          <div className="consent-card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45 }}>
              <IdCard size={22} color="#2457a6" />
              <div><strong>{handle} wants to share contact details.</strong> If you accept, you will both see each other's name, phone and meeting area.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, minHeight: 44 }} onClick={() => bottom.current?.scrollIntoView()}>Not now</button>
              <button className="btn btn-blue btn-sm" style={{ flex: 1, minHeight: 44 }} onClick={() => consent(true)}>Accept &amp; share</button>
            </div>
          </div>
        )}

        {iConsent && !theyConsent && (
          <div className="consent-card">
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>You offered to share your contact details. Nothing is visible until {handle} accepts too.</div>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => consent(false)}>Cancel request</button>
          </div>
        )}

        {shared && (
          <div style={{ background: 'var(--green-soft)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Both owners agreed · contacts shared</span>
            <div className="contact-grid">
              <div className="contact-box">
                <div className="muted" style={{ fontSize: 12 }}>{dog?.name ?? 'Their dog'}'s owner</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{theirs?.realName || 'Not provided'}</div>
                {theirs?.phone && <a href={`tel:${theirs.phone}`}>{theirs.phone}</a>}
                {theirs?.address && <div>{theirs.address}</div>}
              </div>
              <div className="contact-box">
                <div className="muted" style={{ fontSize: 12 }}>You ({myDog?.name}'s owner)</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{mine?.realName || 'Not provided'}</div>
                {mine?.phone && <div>{mine.phone}</div>}
                {mine?.address && <div>{mine.address}</div>}
              </div>
            </div>
            <button className="btn btn-sm" style={{ alignSelf: 'flex-start', border: '1.5px solid #9ccbb6', background: 'transparent', color: 'var(--green)' }} onClick={() => consent(false)}>Stop sharing my details</button>
          </div>
        )}

        {error && <div className="notice notice-err" role="alert">{error}</div>}
        <div ref={bottom} />
      </div>

      <form className="composer" onSubmit={send}>
        <button type="button" className="icon-btn" style={{ background: 'var(--blue-soft)', borderColor: 'var(--blue-line)' }}
          aria-label={iConsent ? 'You already offered your contact details' : 'Share my contact details'}
          title={iConsent ? 'Already offered' : 'Share my contact details'}
          disabled={iConsent} onClick={() => consent(true)}>
          <IdCard size={20} color="#2457a6" />
        </button>
        <label htmlFor="msg" className="sr-only">Message</label>
        <input id="msg" className="input" placeholder={`Message ${handle}`} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button className="icon-btn round" style={{ background: 'var(--accent)', border: 0 }} aria-label="Send" disabled={!text.trim()}><Send size={20} color="#fff" /></button>
      </form>
    </div>
  );
}
