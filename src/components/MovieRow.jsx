import React, { useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import SectionHeader from './ui/SectionHeader';

// Row reveal: the header and cards rise in a quick stagger the first time the row scrolls into view.
const ROW = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
const CARD = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// Figma home rows: section header, horizontally scrolling poster cards, arrow buttons on hover.
// `ranked` renders the "Top 10" variant with large outlined numbers.
const MovieRow = ({ title, movies = [], onMovieClick, to, ranked = false, headerAction }) => {
  const rowRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [movement, setMovement] = useState(0);

  const safeMovies = Array.isArray(movies) ? movies.filter(Boolean) : [];

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
    if (!rowRef.current) return;
    const { scrollLeft, clientWidth } = rowRef.current;
    rowRef.current.scrollTo({
      left: direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  if (safeMovies.length === 0) return null;
  const headingId = `row-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <Motion.section
      aria-labelledby={headingId}
      className="group/row relative"
      variants={ROW}
      initial={reducedMotion ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      <Motion.div variants={CARD} className="px-4 md:px-8 lg:px-16">
        <SectionHeader id={headingId} title={title} to={to} action={headerAction} />
      </Motion.div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label={`Scroll ${title} left`}
          className="hidden md:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full glass text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-white/20 motion-safe:transition-opacity"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className="hidden md:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full glass text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-white/20 motion-safe:transition-opacity"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>

        <ul
          ref={rowRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          className="hide-scrollbar flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-8 lg:px-16 pt-1 pb-4 cursor-grab active:cursor-grabbing scroll-smooth"
        >
          {safeMovies.map((movie, index) => (
            <Motion.li
              variants={index < 12 ? CARD : undefined}
              key={`${movie.id}-${index}`}
              className={`shrink-0 relative ${ranked ? 'flex items-end' : 'w-[128px] sm:w-[150px] lg:w-[184px]'}`}
              onClickCapture={(e) => {
                if (movement > 10) {
                  e.stopPropagation();
                  e.preventDefault();
                }
              }}
            >
              {ranked && (
                <span
                  aria-hidden="true"
                  className="font-display leading-none text-[110px] sm:text-[140px] lg:text-[170px] -mr-4 sm:-mr-5 select-none"
                  style={{ color: 'transparent', WebkitTextStroke: '2px rgb(255 255 255 / 0.55)' }}
                >
                  {index + 1}
                </span>
              )}
              <div className={ranked ? 'relative w-[110px] sm:w-[130px] lg:w-[150px]' : ''}>
                {ranked && <span className="sr-only">Number {index + 1}: </span>}
                <MovieCard movie={movie} onClick={onMovieClick} />
              </div>
            </Motion.li>
          ))}
        </ul>
      </div>
    </Motion.section>
  );
};

export default MovieRow;
