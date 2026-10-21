import {
  addDoc, collection, deleteField, doc, limitToLast, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../components/firebase';
import { itemType } from './watchHistory';
import { SUB_BACKGROUNDS, SUB_COLORS, SUB_POSITIONS, SUB_SIZES } from './subtitles';

// Watch Together rooms (spec 0005). One doc per room in watch_rooms/{roomId}, chat in its
// messages subcollection. The host lets each guest in from `pending` into `members` (at most 10,
// host included) or into `blocked`. `control` is the host's choice: 'host' (only the host drives
// playback) or 'everyone' (any member's play, pause, seek, episode or server change drives it).
// Writes are budgeted for the free Spark plan: one presence beat a minute per member, and the
// host's position beat every 30 s carries its presence too.
export const MEMBER_BEAT_MS = 60 * 1000;
export const HOST_BEAT_MS = 30 * 1000;
export const MEMBER_LIVE_MS = 150 * 1000;
export const ROOM_IDLE_MS = 12 * 60 * 60 * 1000;
export const MAX_MEMBERS = 10;
export const DRIFT_SEC = 3; // a follower seeks when it is further than this from the room

const roomRef = (roomId) => doc(db, 'watch_rooms', roomId);

const nameOf = (user) => user.displayName || user.email?.split('@')[0] || 'Guest';
const memberOf = (user, now = Date.now()) => ({ name: nameOf(user), photo: user.photoURL || null, joinedAt: now, lastSeen: now });

export const roomLink = (roomId) => `${window.location.origin}/together/${roomId}`;

export const createRoom = async (user, movie, { season, episode, position = 0, playing = true, server }) => {
  const type = itemType(movie);
  const now = Date.now();
  const ref = await addDoc(collection(db, 'watch_rooms'), {
    hostUid: user.uid,
    hostName: nameOf(user),
    title: {
      id: movie.id,
      type,
      title: movie.title || movie.name || 'Untitled',
      poster_path: movie.poster_path || null,
      backdrop_path: movie.backdrop_path || null,
      first_air_date: type === 'tv' ? movie.first_air_date || null : null,
    },
    season: type === 'tv' ? season : null,
    episode: type === 'tv' ? episode : null,
    server: { sourceId: server?.sourceId || 'framex', providerId: server?.providerId || null },
    subs: null,
    audio: null,
    playing,
    position,
    updatedAt: now,
    control: 'host',
    lastAction: null,
    members: { [user.uid]: memberOf(user, now) },
    pending: {},
    blocked: {},
    hostAway: false,
    activeAt: now,
    endedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

// --- Derived room state (the rules check the same things) ---
export const memberCount = (room) => Object.keys(room?.members || {}).length;
export const roomEnded = (room, now = Date.now()) =>
  !room || !!room.endedAt || !room.activeAt || now - room.activeAt >= ROOM_IDLE_MS; // no activeAt: a room from before spec 0005 was ratified
export const hostIsAway = (room, now = Date.now()) =>
  !!room && (!!room.hostAway || now - (room.members?.[room.hostUid]?.lastSeen || 0) > MEMBER_LIVE_MS);

// Where this viewer stands: 'ended' | 'member' | 'pending' | 'blocked' | 'full' | 'outsider'.
// Ended wins over everything but membership, which the player keeps watching on its own.
export const viewerState = (room, uid, now = Date.now()) => {
  if (room.members?.[uid]) return roomEnded(room, now) ? 'ended' : 'member';
  if (room.blocked?.[uid]) return 'blocked';
  if (roomEnded(room, now)) return 'ended';
  if (room.pending?.[uid]) return 'pending';
  return memberCount(room) >= MAX_MEMBERS ? 'full' : 'outsider';
};

export const canControl = (room, uid) => !!room && !!uid && (room.hostUid === uid || (room.control === 'everyone' && !!room.members?.[uid]));

// The room's playback second, from a snapshot received at `receivedAt` on this device.
export const roomSecond = (room, receivedAt, now = Date.now()) => {
  const pos = Number(room?.position) || 0;
  return room?.playing ? pos + Math.max(0, now - receivedAt) / 1000 : pos;
};

// The first snapshot has no local receive time for its position yet, so age it by the writer's
// clock, capped at one host beat so a badly set device clock can not throw it far off.
export const firstReceivedAt = (room, now = Date.now()) =>
  now - Math.min(Math.max(0, now - (Number(room?.updatedAt) || now)), HOST_BEAT_MS + 5000);

export const subscribeRoom = (roomId, cb, onError) =>
  onSnapshot(roomRef(roomId), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError);

// --- Lobby ---
export const knock = (roomId, user) =>
  updateDoc(roomRef(roomId), { [`pending.${user.uid}`]: { name: nameOf(user), photo: user.photoURL || null, at: Date.now() } });
export const cancelKnock = (roomId, uid) => updateDoc(roomRef(roomId), { [`pending.${uid}`]: deleteField() });

// Host only.
export const admit = (roomId, uid, entry) => {
  const now = Date.now();
  return updateDoc(roomRef(roomId), {
    [`pending.${uid}`]: deleteField(),
    [`members.${uid}`]: { name: entry?.name || 'Guest', photo: entry?.photo || null, joinedAt: now, lastSeen: now },
  });
};
export const deny = (roomId, uid, entry) =>
  updateDoc(roomRef(roomId), { [`pending.${uid}`]: deleteField(), [`blocked.${uid}`]: { name: entry?.name || 'Guest', at: Date.now() } });
export const removeMember = (roomId, uid, entry) =>
  updateDoc(roomRef(roomId), { [`members.${uid}`]: deleteField(), [`blocked.${uid}`]: { name: entry?.name || 'Guest', at: Date.now() } });

// --- Playback ---
// The playback state everyone follows. `action` ('play' | 'pause' | 'seek' | 'episode' | 'server' |
// 'audio') names a person's own action, shown to the others; null is the host's quiet position beat.
// `audio` ({ lang, label, at } or null, spec 0007) is the room's dub language, sent with its server.
// Every publish also counts as the publisher's presence beat.
export const publishState = (roomId, user, action, { playing, position, season, episode, server, audio }) => {
  const now = Date.now();
  return updateDoc(roomRef(roomId), {
    playing: !!playing,
    position: Math.max(0, Number(position) || 0),
    season: season ?? null,
    episode: episode ?? null,
    ...(server ? { server: { sourceId: server.sourceId, providerId: server.providerId || null } } : {}),
    ...(audio !== undefined ? { audio: audio ? { lang: String(audio.lang).slice(0, 40), label: String(audio.label || audio.lang).slice(0, 40), at: audio.at || now } : null } : {}),
    updatedAt: now,
    activeAt: now,
    [`members.${user.uid}.lastSeen`]: now,
    ...(action ? { lastAction: { uid: user.uid, name: nameOf(user), action, at: now } } : {}),
  });
};

// Host only: who may drive playback.
export const setControl = (roomId, control) => updateDoc(roomRef(roomId), { control: control === 'everyone' ? 'everyone' : 'host' });

// The room's subtitles (spec 0007), set by whoever may control playback: on or off, the track
// (matched by url, then language), the timing offset and the look. `at` tells a device which
// change it published itself, so it never re-applies its own echo.
const pick = (list, id, fallback) => (list.some((o) => o.id === id) ? id : fallback);
export const cleanSubs = ({ on, url, lang, offset, style = {} }, at = Date.now()) => ({
  on: !!on && !!url,
  url: on && url ? String(url) : null,
  lang: lang ? String(lang).slice(0, 20) : null,
  offset: Math.round(Math.max(-60, Math.min(60, Number(offset) || 0)) * 10) / 10,
  style: {
    size: pick(SUB_SIZES, style.size, 'm'),
    color: pick(SUB_COLORS, style.color, 'white'),
    bg: pick(SUB_BACKGROUNDS, style.bg, 'soft'),
    position: pick(SUB_POSITIONS, style.position, 'low'),
  },
  at,
});
export const publishSubs = (roomId, user, subs) => {
  const now = Date.now();
  return updateDoc(roomRef(roomId), {
    subs: { ...subs, by: user.uid },
    activeAt: now,
    [`members.${user.uid}.lastSeen`]: now,
    lastAction: { uid: user.uid, name: nameOf(user), action: 'subs', at: now },
  });
};

export const actionVerb = (a) => ({ play: 'pressed play', pause: 'paused', seek: 'skipped to a new spot', episode: 'changed the episode', server: 'switched the server', subs: 'changed the subtitles', audio: 'changed the audio language' }[a?.action] || 'changed playback');
export const actionLabel = (a) => (a ? `${a.name} ${actionVerb(a)}` : '');

// --- Presence ---
// Opening the room and the minute beat are the same write; the host's also says it is back.
export const beat = (roomId, user, { isHost = false } = {}) => {
  const now = Date.now();
  return updateDoc(roomRef(roomId), { [`members.${user.uid}.lastSeen`]: now, activeAt: now, ...(isHost ? { hostAway: false } : {}) });
};

// A guest's leave writes nothing (their lastSeen just ages, like a crashed tab). The host marks the
// room away; in host controls mode it also parks playback at its own second, so it can pick up
// from exactly there on return.
export const hostLeave = (roomId, { control, position }) =>
  updateDoc(roomRef(roomId), {
    hostAway: true,
    ...(control === 'everyone' ? {} : { playing: false, position: Math.max(0, Number(position) || 0), updatedAt: Date.now() }),
  });

// Host only: closes the room for good.
export const endRoom = (roomId) => updateDoc(roomRef(roomId), { endedAt: Date.now(), playing: false });

// --- Chat (members only, by rule) ---
export const subscribeMessages = (roomId, cb) =>
  onSnapshot(
    query(collection(db, 'watch_rooms', roomId, 'messages'), orderBy('createdAt'), limitToLast(100)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))),
    (err) => { console.error('Room chat error:', err); cb([]); }
  );

export const sendMessage = (roomId, user, text) => {
  const clean = String(text || '').trim().slice(0, 500);
  if (!clean) return Promise.resolve();
  return addDoc(collection(db, 'watch_rooms', roomId, 'messages'), {
    uid: user.uid,
    name: nameOf(user),
    photo: user.photoURL || null,
    text: clean,
    createdAt: serverTimestamp(),
  });
};

export const liveMembers = (room, now = Date.now()) =>
  Object.entries(room?.members || {})
    .map(([uid, m]) => ({ uid, ...m, live: now - (m.lastSeen || 0) < MEMBER_LIVE_MS }))
    .sort((a, b) => Number(b.uid === room.hostUid) - Number(a.uid === room.hostUid) || Number(b.live) - Number(a.live));

export const pendingList = (room) =>
  Object.entries(room?.pending || {}).map(([uid, p]) => ({ uid, ...p })).sort((a, b) => (a.at || 0) - (b.at || 0));
