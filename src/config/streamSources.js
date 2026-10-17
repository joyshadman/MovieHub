import { frameXEmbedUrl } from '../services/frameX';

// Video sources for the Watch player, in fallback order.
// - frameXTV is the main source. With controls=0 it hides its own UI and our player drives it
//   through its postMessage API (services/frameX.js). It also has many servers of its own.
// - The backups are plain embeds: they show THEIR OWN controls inside the frame, and the app can
//   only choose which page to load. Never picked automatically; only by hand in Settings.
// Checked 2026-10-15: frameXTV, VidLink and VidSrc load. vidsrc.cc (522), vidsrc.xyz, embed.su and
// player.autoembed.cc were down or gone and were removed.
export const STREAM_SOURCES = [
  {
    id: 'framex',
    name: 'MovieHub Server',
    custom: true,
    sandbox: true,
    // ownControls: frameXTV shows its own player UI (phones and tablets); otherwise ours drives it.
    url: ({ id, isTV, season, episode, start, provider, title, poster, ownControls }) =>
      frameXEmbedUrl({ id, isTV, season, episode, start, provider, title, poster, customControls: !ownControls }),
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    custom: false,
    url: ({ id, isTV, season, episode }) => (isTV ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`),
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    custom: false,
    url: ({ id, isTV, season, episode }) => (isTV ? `https://vidsrc.me/embed/tv/${id}/${season}/${episode}` : `https://vidsrc.me/embed/movie/${id}`),
  },
];
