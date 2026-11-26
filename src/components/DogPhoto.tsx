import type { CSSProperties } from 'react';
import { ImageIcon } from './Icons';

export default function DogPhoto({ url, alt, style, className = '' }: { url?: string; alt: string; style?: CSSProperties; className?: string }) {
  return (
    <div className={`photo ${className}`} style={style}>
      {url ? <img src={url} alt={alt} /> : <ImageIcon size={40} color="#8a6a4c" />}
    </div>
  );
}
