import React, { useRef } from 'react';
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
  const safeMovies = Array.isArray(movies) ? movies.filter(Boolean) : [];
  // Mouse drag to scroll. Kept in refs, not state: a state update per mousemove re-rendered every
  // card in the row and made dragging stutter. Touch and trackpads use native scrolling.
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0, frame: 0, x: 0 });

  const handlePointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const d = drag.current;
    d.active = true;
    d.moved = 0;
    d.startX = e.clientX;
    d.x = e.clientX;
    d.startLeft = rowRef.current.scrollLeft;
  };

  const handlePointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    d.x = e.clientX;
    d.moved = Math.max(d.moved, Math.abs(d.x - d.startX));
    if (d.moved > 4 && !rowRef.current.hasPointerCapture?.(e.pointerId)) {
      rowRef.current.setPointerCapture?.(e.pointerId);
      rowRef.current.style.userSelect = 'none';
    }
    if (d.frame) return;
    d.frame = requestAnimationFrame(() => {
      d.frame = 0;
      if (rowRef.current) rowRef.current.scrollLeft = d.startLeft - (d.x - d.startX) * 1.4;
    });
  };

  const stopDragging = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (rowRef.current) rowRef.current.style.userSelect = '';
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
      // Rows off screen skip layout and paint until they come near the viewport.
      className="group/row relative [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
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
          className="hidden md:flex absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-line text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-white/20 motion-safe:transition-opacity"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className="hidden md:flex absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-line text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-white/20 motion-safe:transition-opacity"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>

        <ul
          ref={rowRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          onLostPointerCapture={stopDragging}
          onDragStart={(e) => e.preventDefault()}
          className="hide-scrollbar flex gap-3 md:gap-4 overflow-x-auto overscroll-x-contain px-4 md:px-8 lg:px-16 pt-1 pb-4 pointer-fine:cursor-grab pointer-fine:active:cursor-grabbing"
        >
          {safeMovies.map((movie, index) => (
            <Motion.li
              variants={index < 12 ? CARD : undefined}
              key={`${movie.id}-${index}`}
              // Cards scrolled out of view sideways skip paint (content-visibility). The placeholder
              // size equals the real card size at each breakpoint (2:3 poster), so rows never jump.
              className={`shrink-0 relative [content-visibility:auto] ${ranked
                ? 'flex items-end [contain-intrinsic-size:auto_206px_auto_165px] sm:[contain-intrinsic-size:auto_255px_auto_195px] lg:[contain-intrinsic-size:auto_300px_auto_225px]'
                : 'w-[128px] sm:w-[150px] lg:w-[184px] [contain-intrinsic-size:auto_128px_auto_192px] sm:[contain-intrinsic-size:auto_150px_auto_225px] lg:[contain-intrinsic-size:auto_184px_auto_276px]'}`}
              onClickCapture={(e) => {
                if (drag.current.moved > 8) { // a drag, not a click
                  drag.current.moved = 0;
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
              <div className={ranked ? 'relative w-[110px] sm:w-[130px] lg:w-[150px]' : ''} data-tour={index === 0 ? 'card' : undefined}>
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
