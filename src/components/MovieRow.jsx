import React, { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

const MovieRow = ({ title, movies = [], onMovieClick, onAddToWatchlist }) => {
  const rowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [movement, setMovement] = useState(0);
  const reducedMotion = useReducedMotion();

  const safeMovies = Array.isArray(movies) ? movies : [];

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;

    setIsDragging(true);
    setMovement(0);
    setDragStartX(e.pageX - rowRef.current.offsetLeft);
    setDragScrollLeft(rowRef.current.scrollLeft);

    document.body.style.userSelect = 'none';
    rowRef.current.style.scrollBehavior = 'auto';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const x = e.pageX - rowRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.6;
    setMovement((prev) => prev + Math.abs(e.movementX));
    rowRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const stopDragging = () => {
    if (!isDragging) return;
    setTimeout(() => setIsDragging(false), 50);
    document.body.style.userSelect = 'auto';
    if (rowRef.current) rowRef.current.style.scrollBehavior = 'smooth';
  };

  const scroll = (direction) => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo =
        direction === 'left'
          ? scrollLeft - clientWidth * 0.7
          : scrollLeft + clientWidth * 0.7;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (safeMovies.length === 0) return null;

  const rowScaleClass =
    !reducedMotion && isDragging ? 'scale-[0.995] transition-transform duration-150' : 'scale-100 transition-transform duration-150';

  return (
    <div className="group/row relative mb-12 px-6 md:px-14 select-none overflow-visible">
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white/90">
            {title}
          </h2>
          <div
            className={`h-1 bg-red-600 rounded-full mt-1 shadow-[0_0_15px_#dc2626] ${reducedMotion ? 'w-10' : 'w-10 animate-none'}`}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => scroll('left')}
        className="absolute left-4 top-[45%] z-[70] -translate-y-1/2 rounded-full bg-black/40 p-4 text-white opacity-0 backdrop-blur-md border border-white/10 transition-opacity hover:bg-red-600 group-hover/row:opacity-100 hidden md:flex items-center justify-center shadow-xl"
      >
        <ChevronLeft size={22} strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={() => scroll('right')}
        className="absolute right-4 top-[45%] z-[70] -translate-y-1/2 rounded-full bg-black/40 p-4 text-white opacity-0 backdrop-blur-md border border-white/10 transition-opacity hover:bg-red-600 group-hover/row:opacity-100 hidden md:flex items-center justify-center shadow-xl"
      >
        <ChevronRight size={22} strokeWidth={3} />
      </button>

      <div
        ref={rowRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        className={`flex gap-5 overflow-x-auto pb-10 pt-2 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden ${rowScaleClass}`}
      >
        {safeMovies.map((movie) => (
          <div
            key={movie.id}
            className="min-w-[130px] sm:min-w-[160px] md:min-w-[220px] lg:min-w-[260px] relative"
            onClickCapture={(e) => {
              if (movement > 10) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
          >
            {isDragging && movement > 10 && (
              <div className="absolute inset-0 z-[100] cursor-grabbing bg-transparent" />
            )}

            <div className={movement > 10 ? 'pointer-events-none' : 'pointer-events-auto'}>
              <MovieCard movie={movie} onClick={onMovieClick} onAddToWatchlist={onAddToWatchlist} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieRow;
