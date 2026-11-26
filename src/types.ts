import type { Timestamp } from 'firebase/firestore';

/** users/{uid} — PUBLIC. Never put a real name, phone or address here. */
export interface PublicUser {
  username: string;
  city: string;
  lat: number | null; // rounded to ~1 km
  lng: number | null;
  createdAt: Timestamp;
}

/** private/{uid} — readable only by the owner, or by a chat partner after BOTH consent. */
export interface PrivateDetails {
  realName: string;
  phone: string;
  address: string;
}

export type Gender = 'Male' | 'Female';
export type Size = 'Small' | 'Medium' | 'Large';

/** dogs/{ownerUid} — PUBLIC dog profile (one dog per owner in v1). */
export interface Dog {
  ownerUid: string;
  ownerUsername: string;
  name: string;
  breed: string;
  gender: Gender;
  ageYears: number;
  weightKg: number | null;
  size: Size;
  about: string;
  temperament: string[];
  health: string[];
  photoUrls: string[];
  city: string;
  lat: number | null;
  lng: number | null;
  updatedAt: Timestamp;
}

/** swipes/{from}_{to} */
export interface Swipe {
  from: string;
  to: string;
  liked: boolean;
  createdAt: Timestamp;
}

/** chats/{uidA}_{uidB} (uids sorted) */
export interface Chat {
  members: [string, string];
  consent: Record<string, boolean>;
  lastMessage: string;
  updatedAt: Timestamp;
}

export interface Message {
  from: string;
  text: string;
  createdAt: Timestamp | null;
}

export const TEMPERAMENTS = ['Playful', 'Calm', 'Friendly', 'Energetic', 'Good with kids', 'Good with dogs', 'Protective', 'Shy'];
export const HEALTH_TAGS = ['Vaccinated', 'Vet checked', 'Dewormed', 'Pedigree papers', 'KCI registered', 'Microchipped'];
