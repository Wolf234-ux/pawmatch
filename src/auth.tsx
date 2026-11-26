import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from './firebase';
import type { Dog, PublicUser } from './types';

interface AuthState {
  user: User | null;
  profile: PublicUser | null;
  dog: Dog | null;
  loading: boolean;
}

const Ctx = createContext<AuthState>({ user: null, profile: null, dog: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [dog, setDog] = useState<Dog | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [profileReady, setProfileReady] = useState(false);
  const [dogReady, setDogReady] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setDog(null);
      setProfileReady(true);
      setDogReady(true);
      return;
    }
    setProfileReady(false);
    setDogReady(false);
    const u1 = onSnapshot(doc(db, 'users', user.uid), (s) => {
      setProfile(s.exists() ? (s.data() as PublicUser) : null);
      setProfileReady(true);
    }, () => setProfileReady(true));
    const u2 = onSnapshot(doc(db, 'dogs', user.uid), (s) => {
      setDog(s.exists() ? (s.data() as Dog) : null);
      setDogReady(true);
    }, () => setDogReady(true));
    return () => {
      u1();
      u2();
    };
  }, [user]);

  return (
    <Ctx.Provider value={{ user, profile, dog, loading: !authReady || !profileReady || !dogReady }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
