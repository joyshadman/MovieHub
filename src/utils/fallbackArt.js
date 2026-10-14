// Figma style placeholder art for titles with no poster or backdrop (spec 0001).
// Colors estimated from the Figma placeholder cards; each fades to the canvas color.
const FALLBACK_COLORS = [
  '#1E3A8A', // blue
  '#7C2D12', // rust
  '#065F46', // green
  '#6D28D9', // violet
  '#9F1239', // crimson
  '#0E7490', // teal
  '#B45309', // amber
  '#BE185D', // magenta
];

// djb2 string hash, kept to an unsigned 32 bit integer.
const hash = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
};

// Returns a CSS background-image value; the same id always gets the same gradient.
export const fallbackGradient = (id) => {
  const index = id === null || id === undefined ? 0 : hash(String(id)) % FALLBACK_COLORS.length;
  return `linear-gradient(160deg, ${FALLBACK_COLORS[index]} 0%, #0A0A0F 100%)`;
};
