# PawMatch 🐾 — privacy-first dog matchmaking

Owners find a mate for their dog **without revealing who they are**.

- Sign up with a **username only**. There's no real-name field on any public profile.
- Profiles show the dog, the owner's `@username`, and a rough distance (location is rounded to about 1 km).
- When two owners like each other's dogs, a **private chat** opens.
- Real name, phone and meeting area are shown **only when both owners tap "Accept & share"** in that chat. Either owner can stop sharing at any time.

Built with React + Vite + TypeScript and Firebase (Auth, Firestore, Storage, Hosting).

## How the data is saved

| Firestore path | What it stores | Who can read it |
|---|---|---|
| `usernames/{username}` | `{ uid }`, to keep usernames unique | signed-in users |
| `users/{uid}` | username, city, rounded lat/lng | signed-in users (public) |
| `private/{uid}` | real name, phone, address | **the owner only**, or a chat partner after **both** consent |
| `dogs/{uid}` | dog profile and photo URLs | signed-in users (public) |
| `swipes/{from}_{to}` | like / pass | only those two users |
| `chats/{a}_{b}` | members, `consent: {a: bool, b: bool}`, last message | only the two members |
| `chats/{id}/messages/*` | messages | only the two members |
| Storage `dogs/{uid}/*` | dog photos (max 5 MB, images only) | signed-in users; only the owner can upload |

These rules are enforced **on the server** in `firestore.rules` and `storage.rules`, not only in the UI. For example:

- A chat can only be created after a mutual like.
- Each member can change only their **own** consent flag.
- `private/{uid}` can only be read when both consent flags are `true`.

Login email and password live in Firebase Auth. They are never stored in Firestore.

## Setup (about 10 minutes)

1. **Create the Firebase project.** At https://console.firebase.google.com, choose **Create a new Firebase project** and name it `pawmatch`.
2. **Turn on Authentication.** Go to Build → Authentication → Get started → Sign-in method, and enable **Email/Password**.
3. **Create the Firestore database.** Go to Build → Firestore Database → Create database, start in **production mode**, and pick the `asia-south1` (Mumbai) region.
4. **Turn on Storage (optional, for photos).** Go to Build → Storage → Get started. New projects need the Blaze (pay-as-you-go) plan for Storage, which has a free tier. Without Storage the app still works, but dogs show a placeholder photo.
5. **Register the web app.** Go to Project settings → Your apps → **Web (</>)** → register the app, then copy the config values.
6. **Fill in your local config:**
   ```bash
   cp .env.example .env      # paste the config values into .env
   cp .firebaserc.example .firebaserc   # put your project id in it
   npm install
   npm run dev               # http://localhost:5173
   ```
7. **Deploy the security rules (required, or every read is denied):**
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,storage
   ```
8. **Put the app online and share the link:**
   ```bash
   npm run build
   npx firebase-tools deploy --only hosting
   ```
   This gives you a link like `https://pawmatch-xxxx.web.app` that anyone can open on their phone.

## Automatic builds (GitHub Actions)

Every push runs `.github/workflows/build-app.yml`, which:
- builds the **Android APK** (`PawMatch-vN.apk`)
- publishes it under **Releases → PawMatch Version N**
- publishes the **iPhone/browser web app** to https://wolf234-ux.github.io/pawmatch/

One-time setup:
1. **Turn on Pages.** Go to Repo Settings → Pages → Source and choose **GitHub Actions**.
2. **Add the Firebase config.** Go to Repo Settings → Secrets and variables → Actions → **Variables** and add the six `VITE_FIREBASE_*` values.
3. **Add a signing key (optional).** Add a secret named `PAWMATCH_KEYSTORE` containing a base64-encoded keystore, so new APKs install over old ones.
4. **Allow the app's web address to sign in.** In Firebase, go to Authentication → Settings → Authorized domains and add `wolf234-ux.github.io`.

## Testing the privacy rules

```bash
cd tests/rules
npm install
npm test        # needs Java 11+; runs the Firestore emulator locally
```

The tests check these cases:
- strangers can't read private details
- nothing is shared after a match with no consent
- nothing is shared when only one side consents
- both owners can see each other's details once both consent, but a third user still can't
- revoking consent hides the details again
- a member can't flip the other member's consent
- outsiders can't read chats

## Project structure

```
src/
  firebase.ts          Firebase init from .env
  auth.tsx             auth + profile context
  lib/api.ts           all Firestore/Storage reads and writes
  pages/               Welcome, Setup, Discover, DogProfile, Chats, ChatRoom, Me
  components/          ProfileForm, BottomNav, DogPhoto, Icons
firestore.rules        privacy enforcement
storage.rules          photo upload rules
tests/rules/           emulator tests for the rules
```
