import React, { memo, useEffect, useState } from 'react';
import { cuesAt, SUB_BACKGROUNDS, SUB_COLORS, SUB_POSITIONS, SUB_SIZES } from '../../services/subtitles';

// frameXTV reports the time about 4 times a second. Between reports we move the clock on ourselves
// (while playing), capped so a stalled stream never runs the subtitles ahead.
const MAX_GLIDE_S = 1;

// One subtitle block in the viewer's style. Also used as the live preview in the settings sheet.
export const SubtitleText = ({ text, prefs, className = '' }) => {
  const scale = (SUB_SIZES.find((s) => s.id === prefs.size) || SUB_SIZES[1]).scale;
  const color = (SUB_COLORS.find((c) => c.id === prefs.color) || SUB_COLORS[0]).value;
  const bg = SUB_BACKGROUNDS.find((b) => b.id === prefs.bg) || SUB_BACKGROUNDS[1];
  const boxed = bg.id !== 'none';
  return (
    <div className={`text-center font-semibold leading-[1.3] ${className}`} style={{ fontSize: `calc(${scale} * clamp(15px, 3.1cqw, 46px))` }}>
      {text.split('\n').map((line, i) => (
        <span key={i} className="block">
          <span
            className="rounded-[0.2em] px-[0.35em] py-[0.05em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
            style={{
              color,
              backgroundColor: boxed ? `rgb(0 0 0 / ${bg.alpha})` : 'transparent',
              textShadow: boxed ? '0 1px 2px rgb(0 0 0 / 0.6)' : '0 0 3px #000, 0 0 3px #000, 1px 1px 2px #000, -1px -1px 2px #000',
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </div>
  );
};

// Draws the cues for the playing time over the video. Runs its own animation frame loop and only
// re-renders when the shown text changes, so playback updates elsewhere do not touch it.
const SubtitleOverlay = ({ cues, clockRef, offset, prefs, lift }) => {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!cues?.length) return undefined;
    let raf = 0;
    let shown = null;
    const tick = () => {
      const c = clockRef.current;
      const glide = c.playing ? Math.min(MAX_GLIDE_S, ((performance.now() - c.at) / 1000) * c.speed) : 0;
      // Positive offset = subtitles later.
      const next = cuesAt(cues, c.t + glide - offset).map((q) => q.text).join('\n');
      if (next !== shown) { shown = next; setText(next); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cues, clockRef, offset]);

  if (!text || !cues?.length) return null;
  const position = SUB_POSITIONS.find((p) => p.id === prefs.position) || SUB_POSITIONS[0];
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[15] flex justify-center px-[6%] motion-safe:transition-[bottom] duration-300"
      style={{ bottom: lift ? `max(${lift}px, ${position.bottom * 100}%)` : `${position.bottom * 100}%` }}
      aria-live="off"
    >
      <SubtitleText text={text} prefs={prefs} className="max-w-[92%]" />
    </div>
  );
};

export default memo(SubtitleOverlay);
