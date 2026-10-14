// Visitor country for the Top 10 row (spec 0002): the region part of the browser
// language (for example "en-BD" gives "BD"), else "US".
export const getRegion = () => {
  if (typeof navigator === 'undefined') return 'US';
  const langs = [...(navigator.languages || []), navigator.language].filter(Boolean);
  for (const lang of langs) {
    const match = /^[a-z]{2,3}[-_]([A-Z]{2})\b/i.exec(lang);
    if (match) return match[1].toUpperCase();
  }
  return 'US';
};

export const regionName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};
