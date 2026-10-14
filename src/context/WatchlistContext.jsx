/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc, arrayUnion, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../components/firebase';

const WatchlistContext = createContext(null);

// Firestore rejects undefined values, so drop them before saving.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const TMDB_IMG = 'https://image.tmdb.org/t/p';

// Compact, consistent shape for saved titles, whatever list the card came from.
const toSavedItem = (m) =>
  clean({
    id: m.id,
    title: m.title || m.name || 'Untitled',
    image: m.image || (m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null),
    backdrop: m.backdrop || (m.backdrop_path ? `${TMDB_IMG}/original${m.backdrop_path}` : null),
    year: m.year || String(m.release_date || m.first_air_date || '').slice(0, 4) || null,
    type: m.type || m.media_type || (m.first_air_date ? 'tv' : 'movie'),
    rating: m.rating ?? m.vote_average ?? 0,
    overview: m.overview || '',
    genreIds: m.genreIds || m.genre_ids || [],
  });

// One live subscription to watchlists/{uid} shared by every card, the navbar and My List.
export const WatchlistProvider = ({ user, children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(() => new Set());

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, 'watchlists', user.uid),
      (snap) => {
        setItems(snap.exists() ? snap.data().items || [] : []);
        setLoading(false);
      },
      (err) => {
        console.error('Watchlist sync error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const ids = useMemo(() => new Set(items.map((i) => String(i.id))), [items]);
  const isSaved = useCallback((id) => ids.has(String(id)), [ids]);
  const isPending = useCallback((id) => pending.has(String(id)), [pending]);

  const setBusy = (id, busy) =>
    setPending((prev) => {
      const next = new Set(prev);
      if (busy) next.add(String(id));
      else next.delete(String(id));
      return next;
    });

  const remove = useCallback(async (movie) => {
    if (!user || !movie?.id) return;
    setBusy(movie.id, true);
    try {
      const updated = items.filter((i) => String(i.id) !== String(movie.id));
      await updateDoc(doc(db, 'watchlists', user.uid), { items: updated });
      toast.success('Removed from My List');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error('Could not remove it. Try again.');
    } finally {
      setBusy(movie.id, false);
    }
  }, [user, items]);

  const add = useCallback(async (movie) => {
    if (!user || !movie?.id) return;
    setBusy(movie.id, true);
    try {
      await setDoc(doc(db, 'watchlists', user.uid), { items: arrayUnion(toSavedItem(movie)) }, { merge: true });
      toast.success('Saved to My List');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Could not save it. Try again.');
    } finally {
      setBusy(movie.id, false);
    }
  }, [user]);

  const toggle = useCallback(async (movie) => {
    if (!user) {
      toast.error('Sign in to save titles to My List');
      return;
    }
    if (!movie?.id || pending.has(String(movie.id))) return;
    if (ids.has(String(movie.id))) await remove(movie);
    else await add(movie);
  }, [user, ids, pending, add, remove]);

  const value = useMemo(
    () => ({ items, loading, count: items.length, isSaved, isPending, toggle, remove, signedIn: !!user }),
    [items, loading, isSaved, isPending, toggle, remove, user]
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

export const useWatchlist = () => useContext(WatchlistContext);
