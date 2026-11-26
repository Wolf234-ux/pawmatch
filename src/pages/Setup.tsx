import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../auth';

export default function Setup() {
  const { profile } = useAuth();
  return (
    <div className="page">
      <div className="topbar">
        <h1 className="title">Add your dog</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => signOut(auth)}>Log out</button>
      </div>
      <p className="lead">{profile ? `Signed in as @${profile.username}. ` : ''}Set up your dog's profile to start finding matches.</p>
      <ProfileForm submitLabel="Save & start matching" />
    </div>
  );
}
