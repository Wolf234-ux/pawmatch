import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth';
import { mySwipedIds } from '../lib/api';
import { otherMember, timeAgo } from '../lib/util';
import type { Chat, Dog, Swipe } from '../types';
import BottomNav from '../components/BottomNav';
import DogPhoto from '../components/DogPhoto';
import { ChatIcon } from '../components/Icons';

type Row = { id: string; chat: Chat; dog: Dog | null };

export default function Chats() {
  const { user } = useAuth();
  const me = user!.uid;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [likedMe, setLikedMe] = useState<Dog[]>([]);
  const [dogCache] = useState(() => new Map<string, Dog | null>());

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('members', 'array-contains', me));
    return onSnapshot(q, async (snap) => {
      const list = await Promise.all(snap.docs.map(async (d) => {
        const chat = d.data() as Chat;
        const other = otherMember(chat.members, me);
        if (!dogCache.has(other)) {
          const s = await getDoc(doc(db, 'dogs', other));
          dogCache.set(other, s.exists() ? (s.data() as Dog) : null);
        }
        return { id: d.id, chat, dog: dogCache.get(other) ?? null };
      }));
      list.sort((a, b) => (b.chat.updatedAt?.toMillis?.() ?? 0) - (a.chat.updatedAt?.toMillis?.() ?? 0));
      setRows(list);
    }, () => setRows([]));
  }, [me, dogCache]);

  useEffect(() => {
    (async () => {
      const [mine, incoming] = await Promise.all([
        mySwipedIds(me),
        new Promise<Swipe[]>((res) => {
          const unsub = onSnapshot(query(collection(db, 'swipes'), where('to', '==', me), where('liked', '==', true)), (s) => {
            unsub();
            res(s.docs.map((d) => d.data() as Swipe));
          }, () => res([]));
        }),
      ]);
      const pending = incoming.filter((s) => !mine.has(s.from)).slice(0, 12);
      const dogs = await Promise.all(pending.map(async (s) => {
        const d = await getDoc(doc(db, 'dogs', s.from));
        return d.exists() ? (d.data() as Dog) : null;
      }));
      setLikedMe(dogs.filter((d): d is Dog => d !== null));
    })().catch(() => {});
  }, [me]);

  return (
    <>
      <div className="page with-nav" style={{ gap: 12 }}>
        <h1 className="title">Matches</h1>

        {likedMe.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="section-title">Liked your dog ({likedMe.length})</h2>
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {likedMe.map((d) => (
                <Link key={d.ownerUid} to={`/dog/${d.ownerUid}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 68, flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
                  <DogPhoto url={d.photoUrls[0]} alt={d.name} style={{ width: 64, height: 64, borderRadius: '50%', border: '2.5px solid var(--accent)' }} />
                  <span style={{ fontSize: 12, fontWeight: 500 }} className="ellipsis">{d.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <h2 className="section-title">Private chats</h2>
        {rows === null ? (
          <span className="muted">Loading…</span>
        ) : rows.length === 0 ? (
          <div className="center">
            <ChatIcon size={36} color="#c94f27" />
            <p className="lead">No chats yet. When you and another owner both like each other's dogs, a private chat opens here.</p>
            <Link className="btn btn-primary" to="/discover">Discover dogs</Link>
          </div>
        ) : (
          <div>
            {rows.map(({ id, chat, dog }) => {
              const other = otherMember(chat.members, me);
              const shared = chat.consent?.[me] && chat.consent?.[other];
              const theyAsked = chat.consent?.[other] && !chat.consent?.[me];
              return (
                <Link key={id} to={`/chat/${id}`} className="list-item">
                  <DogPhoto url={dog?.photoUrls[0]} alt={dog?.name ?? ''} className="avatar" />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span className="ellipsis" style={{ fontWeight: 600, fontSize: 15 }}>{dog?.name ?? 'Dog'} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 13 }}>· @{dog?.ownerUsername ?? 'owner'}</span></span>
                      <span className="muted" style={{ fontSize: 12, flexShrink: 0 }}>{timeAgo(chat.updatedAt?.toMillis?.())}</span>
                    </div>
                    <span className="ellipsis" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{theyAsked ? 'Wants to share contact details' : chat.lastMessage || 'Say hello'}</span>
                    {shared && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Contacts shared</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}
