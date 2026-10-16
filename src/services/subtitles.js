// Our own subtitles: files come from frameXTV's subtitle API (OpenSubtitles, SRT or VTT, CORS open)
// and are drawn by our player (components/player/SubtitleOverlay.jsx), so size, colors, background,
// position and timing are all ours. frameXTV's own subtitle rendering is never used.

const toSeconds = (stamp) => {
  const m = String(stamp).trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/);
  if (!m) return NaN;
  const [, h = '0', min, s, ms = '0'] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000;
};

// SRT and WebVTT share the "start --> end" line; everything after it up to a blank line is the text.
export const parseSubtitles = (raw) => {
  const blocks = String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const cues = [];
  blocks.forEach((block) => {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => l.includes('-->'));
    if (at < 0) return;
    const [a, b = ''] = lines[at].split('-->');
    const start = toSeconds(a);
    const end = toSeconds(b.trim().split(/\s+/)[0]);
    const text = lines.slice(at + 1).join('\n')
      .replace(/<[^>]+>/g, '') // <i>, <font>, VTT voice tags
      .replace(/\{\\[^}]*\}/g, '') // {\an8} style overrides
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .trim();
    if (text && Number.isFinite(start) && Number.isFinite(end) && end > start) cues.push({ start, end, text });
  });
  return cues.sort((x, y) => x.start - y.start);
};

const cueCache = new Map();
export const loadSubtitleCues = (url) => {
  if (!cueCache.has(url)) {
    const request = fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Subtitles ${r.status}`))))
      .then(parseSubtitles)
      .catch((err) => { cueCache.delete(url); throw err; });
    cueCache.set(url, request);
  }
  return cueCache.get(url);
};

// Cues showing at time t (cues are sorted by start; overlapping cues are shown together).
export const cuesAt = (cues, t) => {
  let lo = 0;
  let hi = cues.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) { last = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const out = [];
  for (let i = last; i >= 0 && i > last - 8; i--) if (cues[i].end > t) out.unshift(cues[i]);
  return out;
};

// --- Look and feel, saved in this browser (a per viewer convenience) ---
export const SUB_SIZES = [
  { id: 's', label: 'S', scale: 0.8 },
  { id: 'm', label: 'M', scale: 1 },
  { id: 'l', label: 'L', scale: 1.25 },
  { id: 'xl', label: 'XL', scale: 1.55 },
];
export const SUB_COLORS = [
  { id: 'white', label: 'White', value: '#ffffff' },
  { id: 'yellow', label: 'Yellow', value: '#fde047' },
  { id: 'cyan', label: 'Cyan', value: '#67e8f9' },
  { id: 'green', label: 'Green', value: '#86efac' },
  { id: 'pink', label: 'Pink', value: '#f9a8d4' },
];
export const SUB_BACKGROUNDS = [
  { id: 'none', label: 'Outline' },
  { id: 'soft', label: 'Soft', alpha: 0.45 },
  { id: 'dark', label: 'Dark', alpha: 0.75 },
  { id: 'solid', label: 'Solid', alpha: 1 },
];
export const SUB_POSITIONS = [
  { id: 'low', label: 'Bottom', bottom: 0.06 },
  { id: 'high', label: 'Higher', bottom: 0.16 },
];

const PREFS_KEY = 'mh:subs';
export const DEFAULT_SUB_PREFS = { size: 'm', color: 'white', bg: 'soft', position: 'low', lang: null };
export const loadSubPrefs = () => {
  try { return { ...DEFAULT_SUB_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { return DEFAULT_SUB_PREFS; }
};
export const saveSubPrefs = (prefs) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage blocked: prefs last this visit */ }
};

// Which track to turn on: the language picked last time, then the stream's default, then the
// browser's language, then the first one.
export const pickTrack = (tracks, lang) => {
  if (!tracks.length) return null;
  const browser = (typeof navigator !== 'undefined' ? navigator.language : 'en').slice(0, 2).toLowerCase();
  return tracks.find((t) => lang && t.lang === lang)
    || tracks.find((t) => t.isDefault)
    || tracks.find((t) => t.lang?.slice(0, 2) === browser)
    || tracks[0];
};
