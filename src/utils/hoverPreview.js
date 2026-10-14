// Desktop hover preview timing and gate (see components/HoverPreview.jsx).
// The pointer must rest on a poster card this long before the silent trailer opens.
export const HOVER_DELAY_MS = 1000;

// Mouse or trackpad on a laptop or desktop sized screen only; touch devices keep the plain card.
export const canHoverPreview = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches;
