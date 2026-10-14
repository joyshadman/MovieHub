import React, { useEffect, useState } from 'react';
import { movieApi } from '../../services/movieApi';
import Logo from '../../components/Logo';
import { fallbackGradient } from '../../utils/fallbackArt';

let posterCache = null;

// Figma Login / Sign Up backdrop: a tilted wall of dimmed posters behind a glass card.
const AuthLayout = ({ children }) => {
  const [posters, setPosters] = useState(posterCache || []);

  useEffect(() => {
    if (posterCache) return undefined;
    let cancelled = false;
    movieApi.getTrending('movie').then((list) => {
      const urls = (list || []).map((m) => m.image).filter(Boolean).slice(0, 24);
      posterCache = urls;
      if (!cancelled) setPosters(urls);
    });
    return () => { cancelled = true; };
  }, []);

  const tiles = posters.length ? posters : Array.from({ length: 24 }, () => null);

  return (
    <div className="font-body relative min-h-svh overflow-hidden bg-canvas text-white">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[20%] grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4 -rotate-[8deg] opacity-40">
          {[...tiles, ...tiles].map((src, i) => (
            <div key={i} className="aspect-[2/3] rounded-card overflow-hidden" style={src ? undefined : { backgroundImage: fallbackGradient(i) }}>
              {src && <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-canvas/80 via-canvas/70 to-canvas" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(225_29_72/0.18),transparent_60%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 md:px-8 lg:px-16 h-20">
        <Logo className="text-[32px]" />
      </header>

      <main id="main" className="relative z-10 flex justify-center px-4 pb-16 pt-4 md:pt-10">
        <div className="w-full max-w-[460px] glass bg-black/40 rounded-sheet p-6 sm:p-10 shadow-card">{children}</div>
      </main>
    </div>
  );
};

export default AuthLayout;
