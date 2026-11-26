type P = { size?: number; color?: string };
const base = (size = 22, color = 'currentColor') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const Paw = ({ size, color }: P) => (
  <svg {...base(size, color)}><circle cx="6" cy="9" r="2" /><circle cx="10" cy="5" r="2" /><circle cx="14" cy="5" r="2" /><circle cx="18" cy="9" r="2" /><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 3-4 2-2 1-4 0-4-2z" /></svg>
);
export const Lock = ({ size, color }: P) => (
  <svg {...base(size, color)}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const Compass = ({ size, color }: P) => (
  <svg {...base(size, color)}><circle cx="12" cy="12" r="9" /><path d="M15 9l-2 4-4 2 2-4z" /></svg>
);
export const ChatIcon = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M4 5h16v11H8l-4 4z" /></svg>
);
export const UserIcon = ({ size, color }: P) => (
  <svg {...base(size, color)}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const Heart = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
);
export const X = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const Back = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const Send = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M4 12l16-8-6 16-2-7z" /></svg>
);
export const IdCard = ({ size, color }: P) => (
  <svg {...base(size, color)}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3" /></svg>
);
export const ImageIcon = ({ size, color }: P) => (
  <svg {...base(size, color)} strokeWidth={1.5}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 8" /></svg>
);
export const Filter = ({ size, color }: P) => (
  <svg {...base(size, color)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
