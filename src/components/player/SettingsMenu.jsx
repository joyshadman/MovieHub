import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Zap, ExternalLink } from 'lucide-react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const Row = ({ active, onClick, children, right, disabled }) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={!!active}
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm motion-safe:transition-colors disabled:opacity-40 ${active ? 'bg-white/10 text-white font-semibold' : 'text-white/80 hover:bg-white/[0.06] hover:text-white'}`}
  >
    <span className="min-w-0 truncate">{children}</span>
    <span className="flex shrink-0 items-center gap-2">
      {right}
      {active ? <Check size={15} aria-hidden="true" /> : <ChevronRight size={14} className="text-white/30" aria-hidden="true" />}
    </span>
  </button>
);

const Tag = ({ children, tone = 'plain' }) => (
  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone === 'bad' ? 'bg-accent/20 text-accent-text' : 'bg-white/10 text-white/70'}`}>{children}</span>
);

// Netflix style settings sheet from the reference screenshot: Servers, Subtitles, Speed.
// Each section says plainly which part our UI controls and which part lives inside the iframe.
const SettingsMenu = ({
  onClose, sources, sourceId, onSource, failedSources, autoSwitch, onAutoSwitch,
  custom, providers, providerId, onProvider, subtitlesOn, onSubtitles, onNativeControls,
  speed, onSpeed, position = 'bottom-24 right-3 sm:right-6',
}) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [tab, setTab] = useState('servers');
  const tabs = [
    { id: 'servers', label: 'Servers' },
    { id: 'subtitles', label: 'Subtitles' },
    { id: 'speed', label: 'Speed' },
  ];

  // Runs once on open. onClose is read through a ref: if it ran again on every player re-render
  // (several per second while playing) it would keep pulling focus back to the tab.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.('[data-settings-toggle]')) onCloseRef.current?.(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current?.(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    ref.current?.querySelector('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, []);

  return (
    <Motion.div
      ref={ref}
      role="dialog"
      aria-label="Player settings"
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`absolute ${position} z-40 w-[min(340px,calc(100vw-24px))] max-h-[min(460px,calc(100%-140px))] flex flex-col overflow-hidden rounded-panel border border-white/10 bg-[#111116]/95 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl font-body`}
    >
      <div role="tablist" aria-label="Settings sections" className="grid grid-cols-3 gap-1 border-b border-white/10 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg py-2 text-xs font-semibold motion-safe:transition-colors ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="overflow-y-auto p-1.5 hide-scrollbar">
        {tab === 'servers' && (
          <>
            {custom && providers.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">frameXTV servers · {providers.length}</p>
                <div role="menu" aria-label="frameXTV servers">
                  <Row active={!providerId} onClick={() => onProvider(null)} right={<Tag>Auto</Tag>}>Best available</Row>
                  {providers.map((p) => (
                    <Row key={p.id} active={providerId === p.id} onClick={() => onProvider(p.id)} right={p.tagline ? <Tag>{/4k/i.test(p.tagline) ? '4K' : 'HD'}</Tag> : null}>
                      {p.name}
                    </Row>
                  ))}
                </div>
              </>
            )}
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Sources · {sources.length}</p>
            <div role="menu" aria-label="Video sources">
              {sources.map((s) => (
                <Row
                  key={s.id}
                  active={sourceId === s.id}
                  onClick={() => onSource(s.id)}
                  right={failedSources.includes(s.id) ? <Tag tone="bad">Failed</Tag> : <Tag>{s.custom ? 'Our controls' : 'Own controls'}</Tag>}
                >
                  {s.name}
                </Row>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSwitch}
              onClick={() => onAutoSwitch(!autoSwitch)}
              className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2"><Zap size={14} aria-hidden="true" /> Switch source if a stream fails</span>
              <span className={`relative h-5 w-9 rounded-full motion-safe:transition-colors ${autoSwitch ? 'bg-accent' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white motion-safe:transition-all ${autoSwitch ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          </>
        )}

        {tab === 'subtitles' && (
          custom ? (
            <div role="menu" aria-label="Subtitles">
              <Row active={!subtitlesOn} onClick={() => onSubtitles(false)}>Off</Row>
              <Row active={subtitlesOn} onClick={() => onSubtitles(true)}>On (stream default track)</Row>
              <button type="button" onClick={onNativeControls} className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/[0.06]">
                <span>More languages in the frameXTV menu</span>
                <ExternalLink size={14} className="text-white/40" aria-hidden="true" />
              </button>
              <p className="px-3 pt-2 pb-2 text-[11px] leading-5 text-white/40">
                frameXTV lets us switch subtitles on and off. Picking a language happens in its own menu, which opens at your current time.
              </p>
            </div>
          ) : (
            <p className="px-3 py-4 text-sm leading-6 text-white/60">This source has its own subtitle button inside the video.</p>
          )
        )}

        {tab === 'speed' && (
          custom ? (
            <div role="menu" aria-label="Playback speed">
              {SPEEDS.map((s) => (
                <Row key={s} active={speed === s} onClick={() => onSpeed(s)}>{s === 1 ? 'Normal' : `${s}×`}</Row>
              ))}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm leading-6 text-white/60">This source controls speed inside the video.</p>
          )
        )}
      </div>
    </Motion.div>
  );
};

export default SettingsMenu;
