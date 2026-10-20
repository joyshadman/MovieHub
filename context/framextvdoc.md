Overview
Getting Started with frameXTV
frameXTV provides ultra-fast, clean, and responsive HTML5 iframe stream embeds for movies and TV shows. Easily integrate high-bitrate video streams into any web app, CMS, or streaming portal using standard IFrames or JavaScript controls.

Basic IFrame Integration

Copy
<iframe
  src="https://framextv.xyz/embed/550?autoplay=1&muted=0"
  width="100%"
  height="100%"
  frameborder="0"
  allowfullscreen
></iframe>
React / Next.js Component Example

Copy
import React from 'react';

export function VideoPlayer({ tmdbId, season, episode }) {
  const embedUrl = season && episode
    ? `https://framextv.xyz/embed/${tmdbId}/${season}/${episode}`
    : `https://framextv.xyz/embed/${tmdbId}`;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        title="frameXTV Stream Player"
      />
    </div>
  );
}
Configuration
URL Query Parameters Reference
Customize playback behavior, pre-select server extractors, set initial timestamps, or hide UI controls directly by appending URL query parameters to any embed link.

Parameter	Accepted Values	Default	Description
autoplay	1 | 0	1	Automatically start video playback on iframe load.
muted	1 | 0	0	Start playback muted (required by browsers for unmuted autoplay).
t / start	seconds (e.g. 120)	0	Seek directly to specified timestamp in seconds on playback start.
speed	0.5 | 1 | 1.25 | 1.5 | 2	1	Set initial video playback speed rate.
controls	1 | 0	1	Show or hide custom bottom video player control bar.
server / provider	barbarian | archer | goblin ...	auto	Pre-select active extraction server provider.
title	string	null	Override title overlay banner text shown inside player header.
poster / backdrop	image_url	null	Custom background poster image URL before video playback starts.
SDK Reference
JavaScript postMessage API Controller
Control the embedded frameXTV player dynamically from your host webpage using standard cross-window postMessage events. Send playback actions (play, pause, seek, volume, provider) or listen to real-time playback telemetry events.

postMessage JavaScript SDK Example

Copy
// Select target iframe element
const iframe = document.querySelector('iframe');

// Send Play / Pause Commands
iframe.contentWindow.postMessage({ action: 'play' }, '*');
iframe.contentWindow.postMessage({ action: 'pause' }, '*');

// Seek to specific timestamp (seconds) or relative offset (+10s / -10s)
iframe.contentWindow.postMessage({ action: 'seek', time: 120 }, '*');
iframe.contentWindow.postMessage({ action: 'seekBy', seconds: 10 }, '*');

// Volume & Mute Control (0.0 to 1.0)
iframe.contentWindow.postMessage({ action: 'setVolume', volume: 0.8 }, '*');
iframe.contentWindow.postMessage({ action: 'mute' }, '*');

// Switch Active Extraction Provider & Subtitle Index
iframe.contentWindow.postMessage({ action: 'setProvider', provider: 'archer' }, '*');
iframe.contentWindow.postMessage({ action: 'setSubtitle', index: 0 }, '*');

// Listen to Real-Time Telemetry Events from Player
window.addEventListener('message', (event) => {
  if (event.data?.event === 'frameXTV:timeupdate') {
    console.log('Progress:', event.data.currentTime, '/', event.data.duration);
  }
});
Infrastructure
Extraction Providers & Fallback Pipeline
frameXTV aggregates multi-tier stream extraction servers (Barbarian, Archer, Goblin, P.E.K.K.A, etc.). If an extraction source experiences downtime or buffering issues, the engine automatically falls back to alternative active providers.

Barbarian I
Built-in multi-language subtitles & ultra-fast HLS stream decryption.

Archer II
Multi-audio tracks & 4K Ultra HD playback support.

Goblin III
Fast automatic stream extraction mirror for popular titles.

P.E.K.K.A IV
High bitrate 1080p uncompressed stream server.