/** Deterministic id for a pair of users (same rule as firestore.rules → pairId). */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function otherMember(members: string[], me: string): string {
  return members[0] === me ? members[1] : members[0];
}

export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** Rounds coordinates to 2 decimals (~1 km) so exact homes are never stored. */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export function distanceKm(lat1: number | null, lng1: number | null, lat2: number | null, lng2: number | null): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(km: number | null): string {
  if (km == null) return '';
  if (km < 1) return '<1 km away';
  return `~${Math.round(km)} km away`;
}

export function timeAgo(ms: number | undefined): string {
  if (!ms) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function errMsg(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email.',
    'permission-denied': 'Not allowed.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong.');
}
