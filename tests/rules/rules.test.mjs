// Privacy tests for firestore.rules. Run: cd tests/rules && npm i && npm test   (needs Java 11+)
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

const A = 'aliceUid000000000000000000001';
const B = 'bobUid00000000000000000000002';
const C = 'carolUid000000000000000000003';
const chatId = A < B ? `${A}_${B}` : `${B}_${A}`;
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pawmatch',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, name] of [[A, 'alice'], [B, 'bob'], [C, 'carol']]) {
      await setDoc(doc(db, 'users', uid), { username: name, city: 'Ahmedabad', lat: null, lng: null, createdAt: new Date() });
      await setDoc(doc(db, 'private', uid), { realName: `Real ${name}`, phone: '999', address: 'Secret street' });
    }
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

async function makeMutualChat() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'swipes', `${A}_${B}`), { from: A, to: B, liked: true, createdAt: new Date() });
    await setDoc(doc(db, 'swipes', `${B}_${A}`), { from: B, to: A, liked: true, createdAt: new Date() });
  });
  const members = chatId.split('_');
  await assertSucceeds(setDoc(doc(as(A), 'chats', chatId), {
    members, consent: { [members[0]]: false, [members[1]]: false }, lastMessage: '', updatedAt: new Date(),
  }));
}

test('nobody signed out can read anything', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users', A)));
  await assertFails(getDoc(doc(db, 'private', A)));
});

test('owner can read own private details; strangers cannot', async () => {
  await assertSucceeds(getDoc(doc(as(A), 'private', A)));
  await assertFails(getDoc(doc(as(B), 'private', A)));
});

test('public profile cannot carry a real name field', async () => {
  await assertFails(updateDoc(doc(as(A), 'users', A), { realName: 'Alice Shah' }));
});

test('chat cannot be created without a mutual like', async () => {
  const members = chatId.split('_');
  await assertFails(setDoc(doc(as(A), 'chats', chatId), {
    members, consent: { [members[0]]: false, [members[1]]: false }, lastMessage: '', updatedAt: new Date(),
  }));
});

test('matched but not consented: details stay hidden', async () => {
  await makeMutualChat();
  await assertFails(getDoc(doc(as(B), 'private', A)));
});

test('only ONE side consented: details stay hidden', async () => {
  await makeMutualChat();
  await assertSucceeds(updateDoc(doc(as(A), 'chats', chatId), { [`consent.${A}`]: true }));
  await assertFails(getDoc(doc(as(B), 'private', A)));
  await assertFails(getDoc(doc(as(A), 'private', B)));
});

test('a member cannot set the OTHER member\'s consent', async () => {
  await makeMutualChat();
  await assertFails(updateDoc(doc(as(A), 'chats', chatId), { [`consent.${B}`]: true }));
});

test('both consented: partners see each other; a third user still cannot', async () => {
  await makeMutualChat();
  await updateDoc(doc(as(A), 'chats', chatId), { [`consent.${A}`]: true });
  await updateDoc(doc(as(B), 'chats', chatId), { [`consent.${B}`]: true });
  await assertSucceeds(getDoc(doc(as(B), 'private', A)));
  await assertSucceeds(getDoc(doc(as(A), 'private', B)));
  await assertFails(getDoc(doc(as(C), 'private', A)));
});

test('revoking consent hides details again', async () => {
  await makeMutualChat();
  await updateDoc(doc(as(A), 'chats', chatId), { [`consent.${A}`]: true });
  await updateDoc(doc(as(B), 'chats', chatId), { [`consent.${B}`]: true });
  await updateDoc(doc(as(A), 'chats', chatId), { [`consent.${A}`]: false });
  await assertFails(getDoc(doc(as(B), 'private', A)));
});

test('outsiders cannot read chat messages or swipes', async () => {
  await makeMutualChat();
  await assertSucceeds(setDoc(doc(as(A), 'chats', chatId, 'messages', 'm1'), { from: A, text: 'hi', createdAt: new Date() }));
  await assertFails(getDoc(doc(as(C), 'chats', chatId, 'messages', 'm1')));
  await assertFails(getDoc(doc(as(C), 'swipes', `${A}_${B}`)));
  await assertSucceeds(getDocs(query(collection(as(A), 'chats'), where('members', 'array-contains', A))));
});

test('cannot send a message pretending to be the other member', async () => {
  await makeMutualChat();
  await assertFails(setDoc(doc(as(A), 'chats', chatId, 'messages', 'm2'), { from: B, text: 'fake', createdAt: new Date() }));
});
