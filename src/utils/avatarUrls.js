/**
 * Google / GitHub avatar hosts often reject requests that send a cross-site Referer.
 * Use on profile <img> elements that load user-controlled URLs.
 */
export const profileImgAttrs = {
  referrerPolicy: 'no-referrer',
};

/** Normalize GitHub avatar_url with a stable size param. */
export function githubSizedAvatarUrl(avatarUrl, size = 256) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  try {
    const u = new URL(avatarUrl);
    u.searchParams.set('s', String(size));
    return u.toString();
  } catch {
    const sep = avatarUrl.includes('?') ? '&' : '?';
    return `${avatarUrl}${sep}s=${size}`;
  }
}

/** DiceBear v7 HTTP paths are deprecated; v9 is the supported HTTP API. */
export function dicebearAvatarUrl(seed, style = 'avataaars') {
  const raw = String(seed || 'user').slice(0, 80);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(raw)}`;
}

export function uiAvatarsFallback(name) {
  const n = encodeURIComponent((name || 'User').slice(0, 40));
  return `https://ui-avatars.com/api/?name=${n}&background=1f2937&color=fff&size=128`;
}
