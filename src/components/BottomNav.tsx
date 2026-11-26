import { NavLink } from 'react-router-dom';
import { ChatIcon, Compass, UserIcon } from './Icons';

export default function BottomNav() {
  return (
    <nav className="nav" aria-label="Main">
      <NavLink to="/discover"><Compass />Discover</NavLink>
      <NavLink to="/chats"><ChatIcon />Chats</NavLink>
      <NavLink to="/me"><UserIcon />My dog</NavLink>
    </nav>
  );
}
