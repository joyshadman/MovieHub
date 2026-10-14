/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Trash2 } from 'lucide-react';
import { db } from '../components/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import SectionHeader from '../components/ui/SectionHeader';
import { ConfirmDialog } from '../components/ui/Modal';
import { fallbackGradient } from '../utils/fallbackArt';

const itemType = (item) => item.type || (item.first_air_date ? 'tv' : 'movie');

const artFor = (movie) =>
  movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
    : movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : movie.backdrop || movie.image || null;

// Figma "Landscape Card": 16:9 art, glass play button, title, episode or type, progress bar.
const ContinueWatching = ({ user, onMovieClick }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchScrollLeft, setTouchScrollLeft] = useState(0);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }
    const unsubHistory = onSnapshot(doc(db, 'history', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const items = docSnap.data().items || [];
        setHistory([...items].sort((a, b) => b.watchedAt - a.watchedAt));
      } else {
        setHistory([]);
      }
      setLoading(false);
    });
    return () => unsubHistory();
  }, [user?.uid]);

  // Drag to scroll, with click protection so a drag never opens a title.
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    if (Math.abs(x - startX) > 5) setHasMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 2;
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleTouchStart = (e) => {
    if (!scrollRef.current) return;
    setHasMoved(false);
    setTouchStartX(e.touches[0].clientX);
    setTouchScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleTouchMove = (e) => {
    if (!scrollRef.current) return;
    const x = e.touches[0].clientX;
    if (Math.abs(x - touchStartX) > 6) setHasMoved(true);
    scrollRef.current.scrollLeft = touchScrollLeft - (x - touchStartX) * 1.6;
  };

  const handlePlayClick = (movie, e) => {
    e.stopPropagation();
    if (!hasMoved) onMovieClick(movie);
  };

  const deleteFromHistory = async (movie, e) => {
    e.stopPropagation();
    if (hasMoved) return;
    try {
      const updated = history.filter(
        (item) => !(String(item.id) === String(movie.id) && itemType(item) === itemType(movie))
      );
      await updateDoc(doc(db, 'history', user.uid), { items: updated });
      toast.success('Removed from Continue Watching');
    } catch {
      toast.error('Could not remove it. Try again.');
    }
  };

  const clearAllHistory = async () => {
    setClearing(true);
    try {
      await updateDoc(doc(db, 'history', user.uid), { items: [] });
      setIsConfirmOpen(false);
      toast.success('Watch history cleared');
    } catch {
      toast.error('Could not clear history. Try again.');
    } finally {
      setClearing(false);
    }
  };

  if (!user || loading || history.length === 0) return null;

  const firstName = (user.displayName || '').split(' ')[0];

  return (
    <section aria-labelledby="continue-watching" className="select-none">
      <div className="px-4 md:px-8 lg:px-16">
        <SectionHeader
          id="continue-watching"
          title={firstName ? `Continue Watching for ${firstName}` : 'Continue Watching'}
          action={
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white rounded-full px-2 py-1"
            >
              <Trash2 size={15} aria-hidden="true" /> Clear all
            </button>
          }
        />
      </div>

      <ul
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="hide-scrollbar flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-8 lg:px-16 pb-4 cursor-grab active:cursor-grabbing scroll-smooth"
      >
        {history.map((movie) => {
          const art = artFor(movie);
          const title = movie.title || movie.name || 'Untitled';
          const episode = movie.lastSeason ? `S${movie.lastSeason}:E${movie.lastEpisode || 1}` : itemType(movie) === 'tv' ? 'Series' : 'Movie';
          const progress = Math.max(0, Math.min(100, Number(movie.progress) || 0));
          return (
            <li key={`${itemType(movie)}-${movie.id}`} className="group relative shrink-0 w-[260px] sm:w-[300px] lg:w-[320px]">
              <div
                className="relative aspect-video overflow-hidden rounded-card border border-line bg-card"
                style={art ? undefined : { backgroundImage: fallbackGradient(movie.id) }}
              >
                {art && (
                  <img src={art} alt="" draggable="false" className="h-full w-full object-cover pointer-events-none motion-safe:transition-transform duration-500 motion-safe:group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
                <span className="absolute inset-0 m-auto h-12 w-12 rounded-full glass flex items-center justify-center pointer-events-none motion-safe:transition-transform group-hover:scale-110">
                  <Play size={18} className="ml-0.5 fill-white text-white" aria-hidden="true" />
                </span>
                <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
                  <div className="flex items-end justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                    <span className="text-[11px] text-muted whitespace-nowrap">{episode}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/20 overflow-hidden" role="progressbar" aria-label={`${title} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handlePlayClick(movie, e)}
                aria-label={`Resume ${title}, ${episode}`}
                className="absolute inset-0 rounded-card"
              />
              <button
                type="button"
                onClick={(e) => deleteFromHistory(movie, e)}
                aria-label={`Remove ${title} from Continue Watching`}
                className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-full bg-black/55 border border-line backdrop-blur-sm flex items-center justify-center text-white hover:bg-accent hover:border-accent opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100 motion-safe:transition-opacity"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={clearAllHistory}
        loading={clearing}
        title="Clear watch history?"
        message="This removes every title from Continue Watching on all your devices. It cannot be undone."
        confirmLabel="Clear history"
      />
    </section>
  );
};

export default ContinueWatching;
