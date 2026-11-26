import {
  collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Chat, Dog, PrivateDetails, Swipe } from '../types';
import { pairId } from './util';

/** Claims a username and creates the public profile in one atomic batch. */
export async function claimUsername(uid: string, username: string) {
  const b = writeBatch(db);
  b.set(doc(db, 'usernames', username), { uid });
  b.set(doc(db, 'users', uid), { username, city: '', lat: null, lng: null, createdAt: serverTimestamp() });
  await b.commit();
}

export async function saveProfileLocation(uid: string, city: string, lat: number | null, lng: number | null) {
  await updateDoc(doc(db, 'users', uid), { city, lat, lng });
}

export async function savePrivate(uid: string, d: PrivateDetails) {
  await setDoc(doc(db, 'private', uid), d);
}

export async function getPrivate(uid: string): Promise<PrivateDetails | null> {
  const s = await getDoc(doc(db, 'private', uid));
  return s.exists() ? (s.data() as PrivateDetails) : null;
}

export async function saveDog(uid: string, dog: Omit<Dog, 'updatedAt'>) {
  await setDoc(doc(db, 'dogs', uid), { ...dog, updatedAt: serverTimestamp() });
}

export async function uploadDogPhoto(uid: string, file: File): Promise<string> {
  const r = ref(storage, `dogs/${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}

export async function loadDogs(): Promise<Dog[]> {
  const s = await getDocs(query(collection(db, 'dogs'), limit(200)));
  return s.docs.map((d) => d.data() as Dog);
}

export async function mySwipedIds(me: string): Promise<Set<string>> {
  const s = await getDocs(query(collection(db, 'swipes'), where('from', '==', me)));
  return new Set(s.docs.map((d) => (d.data() as Swipe).to));
}

/**
 * Records a like or pass. On a like, if the other owner already liked us,
 * opens the private chat and returns its id.
 */
export async function swipe(me: string, other: string, liked: boolean): Promise<string | null> {
  await setDoc(doc(db, 'swipes', `${me}_${other}`), { from: me, to: other, liked, createdAt: serverTimestamp() });
  if (!liked) return null;
  const back = await getDoc(doc(db, 'swipes', `${other}_${me}`));
  if (!back.exists() || !(back.data() as Swipe).liked) return null;
  const id = pairId(me, other);
  const existing = await getDoc(doc(db, 'chats', id));
  if (!existing.exists()) {
    const members = id.split('_') as [string, string];
    try {
      await setDoc(doc(db, 'chats', id), {
        members,
        consent: { [members[0]]: false, [members[1]]: false },
        lastMessage: '',
        updatedAt: serverTimestamp(),
      });
    } catch {
      // The other owner created it at the same moment; that's fine.
    }
  }
  return id;
}

export async function setConsent(chatId: string, me: string, value: boolean) {
  await updateDoc(doc(db, 'chats', chatId), { [`consent.${me}`]: value, updatedAt: serverTimestamp() });
}

export async function sendMessage(chatId: string, me: string, text: string) {
  const ref2 = doc(collection(db, 'chats', chatId, 'messages'));
  const b = writeBatch(db);
  b.set(ref2, { from: me, text, createdAt: serverTimestamp() });
  b.update(doc(db, 'chats', chatId), { lastMessage: text.slice(0, 120), updatedAt: serverTimestamp() });
  await b.commit();
}

export type { Chat };
