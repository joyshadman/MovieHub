import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Zap, Minus, Plus, RotateCcw } from 'lucide-react';
import { SUB_BACKGROUNDS, SUB_COLORS, SUB_POSITIONS, SUB_SIZES } from '../../services/subtitles';
import { SubtitleText } from './SubtitleOverlay';

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

// Small segmented choice used by the subtitle style controls.
const Choice = ({ label, options, value, onChange, render }) => (
  <div className="px-3 py-2">
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          aria-label={o.label}
          onClick={() => onChange(o.id)}
          className={`inline-flex h-8 min-w-[2.5rem] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold motion-safe:transition-colors ${value === o.id ? 'bg-white text-black' : 'bg-white/[0.07] text-white/80 hover:bg-white/15'}`}
        >
          {render ? render(o) : o.label}
        </button>
      ))}
    </div>
  </div>
);

const fmtOffset = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} s`;

const Tag = ({ children, tone = 'plain' }) => (
  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${tone === 'bad' ? 'bg-accent/20 text-accent-text' : 'bg-white/10 text-white/70'}`}>{children}</span>
);

// Netflix style settings sheet from the reference screenshot: Servers, Subtitles, Speed.
// Each section says plainly which part our UI controls and which part lives inside the iframe.
const SettingsMenu = ({
  onClose, sources, sourceId, onSource, failedSources, autoSwitch, onAutoSwitch,
  custom, providers, providerId, onProvider,
  subTracks, subStatus, subUrl, onSubTrack, subPrefs, onSubPrefs, subOffset, onSubOffset, nativeSubs = false, ownPlayer = false,
  speed, onSpeed, position = 'bottom-24 right-3 sm:right-6', initialTab = 'servers',
}) => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [tab, setTab] = useState(initialTab);
  const [subView, setSubView] = useState('language');
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
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">MovieHub servers · {providers.length}</p>
                <div role="menu" aria-label="MovieHub servers">
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
            <p className="px-3 pb-1 text-[11px] leading-4 text-white/40">Backups are never picked for you. They use their own player.</p>
            <div role="menu" aria-label="Video sources">
              {sources.map((s) => (
                <Row
                  key={s.id}
                  active={sourceId === s.id}
                  onClick={() => onSource(s.id)}
                  right={failedSources.includes(s.id) ? <Tag tone="bad">Failed</Tag> : <Tag>{s.custom ? 'Our player' : 'Backup'}</Tag>}
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
              <span className="flex items-center gap-2"><Zap size={14} aria-hidden="true" /> Try another server if one fails</span>
              <span className={`relative h-5 w-9 rounded-full motion-safe:transition-colors ${autoSwitch ? 'bg-accent' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white motion-safe:transition-all ${autoSwitch ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          </>
        )}

        {tab === 'subtitles' && (
          custom ? (
            <>
              <div role="tablist" aria-label="Subtitle settings" className="grid grid-cols-2 gap-1 p-1.5">
                {[['language', 'Language'], ['style', 'Style & timing']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={subView === id} onClick={() => setSubView(id)} className={`rounded-full py-1.5 text-xs font-semibold motion-safe:transition-colors ${subView === id ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/60 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {subView === 'language' && (
                <div role="menu" aria-label="Subtitle language">
                  <Row active={!subUrl} onClick={() => onSubTrack(null)}>Off</Row>
                  {subStatus === 'loading' && <p className="px-3 py-3 text-sm text-white/50">Finding subtitles…</p>}
                  {subStatus === 'error' && <p className="px-3 py-3 text-sm text-white/50">Subtitles did not load. Try again in a moment.</p>}
                  {subStatus === 'ready' && subTracks.length === 0 && <p className="px-3 py-3 text-sm text-white/50">No subtitles found for this title.</p>}
                  {subTracks.map((t) => (
                    <Row key={t.url} active={subUrl === t.url} onClick={() => onSubTrack(t.url)} right={t.lang ? <Tag>{t.lang}</Tag> : null}>
                      {t.label}
                    </Row>
                  ))}
                </div>
              )}

              {subView === 'style' && nativeSubs && (
                <p className="px-3 py-4 text-sm leading-6 text-white/60">
                  On iPhone the subtitles come from the video itself, so they also show in full screen. Change their look in
                  Settings, Accessibility, Subtitles &amp; Captioning. In full screen, the CC button lists every language.
                </p>
              )}

              {subView === 'style' && !nativeSubs && (
                <div>
                  <div className="@container relative mx-1.5 mt-1 flex h-24 items-end justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#3b2a1f,#14202b)] pb-3" aria-hidden="true">
                    <SubtitleText text={'This is how your\nsubtitles will look.'} prefs={subPrefs} />
                  </div>

                  <div className="px-3 pt-3 pb-1">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Timing</p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => onSubOffset(subOffset - 0.5)} aria-label="Subtitles 0.5 seconds earlier" className="h-8 rounded-full bg-white/[0.07] px-2.5 text-xs font-semibold hover:bg-white/15">−0.5</button>
                      <button type="button" onClick={() => onSubOffset(subOffset - 0.1)} aria-label="Subtitles 0.1 seconds earlier" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/15"><Minus size={14} aria-hidden="true" /></button>
                      <output className="min-w-[4.5rem] flex-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">{fmtOffset(subOffset)}</output>
                      <button type="button" onClick={() => onSubOffset(subOffset + 0.1)} aria-label="Subtitles 0.1 seconds later" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/15"><Plus size={14} aria-hidden="true" /></button>
                      <button type="button" onClick={() => onSubOffset(subOffset + 0.5)} aria-label="Subtitles 0.5 seconds later" className="h-8 rounded-full bg-white/[0.07] px-2.5 text-xs font-semibold hover:bg-white/15">+0.5</button>
                      <button type="button" onClick={() => onSubOffset(0)} disabled={!subOffset} aria-label="Reset subtitle timing" className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"><RotateCcw size={14} aria-hidden="true" /></button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-white/40">Words show up too early? Press +. Too late? Press −.</p>
                  </div>

                  <Choice label="Size" options={SUB_SIZES} value={subPrefs.size} onChange={(size) => onSubPrefs({ size })} />
                  <Choice
                    label="Text color"
                    options={SUB_COLORS}
                    value={subPrefs.color}
                    onChange={(color) => onSubPrefs({ color })}
                    render={(o) => <><span className="h-3 w-3 rounded-full ring-1 ring-black/30" style={{ backgroundColor: o.value }} />{o.label}</>}
                  />
                  <Choice label="Background" options={SUB_BACKGROUNDS} value={subPrefs.bg} onChange={(bg) => onSubPrefs({ bg })} />
                  <Choice label="Position" options={SUB_POSITIONS} value={subPrefs.position} onChange={(position) => onSubPrefs({ position })} />
                </div>
              )}
            </>
          ) : (
            <p className="px-3 py-4 text-sm leading-6 text-white/60">{ownPlayer ? 'Use the subtitle button inside the video.' : 'This backup source has its own subtitle button inside the video.'}</p>
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
