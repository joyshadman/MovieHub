import {
  addDoc, collection, deleteField, doc, getDoc, limitToLast, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../components/firebase';
import { itemType } from './watchHistory';

// Watch Together rooms (spec 0005). One doc per room in watch_rooms/{roomId}, chat in its
// messages subcollection. `control` is the host's choice: 'host' (only the host drives playback)
// or 'everyone' (any member's play, pause, seek or episode change drives it).
export const MEMBER_HEARTBEAT_MS = 20 * 1000;
export const MEMBER_LIVE_MS = 60 * 1000;
export const DRIFT_SEC = 3; // a guest seeks when it is further than this from the host

const roomRef = (roomId) => doc(db, 'watch_rooms', roomId);

const memberOf = (user) => ({
  name: user.displayName || user.email?.split('@')[0] || 'Guest',
  photo: user.photoURL || null,
  lastSeen: Date.now(),
});

export const roomLink = (roomId) => `${window.location.origin}/together/${roomId}`;

export const createRoom = async (user, movie, { season, episode, position = 0, playing = true }) => {
  const type = itemType(movie);
  const ref = await addDoc(collection(db, 'watch_rooms'), {
    hostUid: user.uid,
    hostName: memberOf(user).name,
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
    playing,
    position,
    updatedAt: Date.now(),
    hostLeft: false,
    control: 'host',
    lastAction: null,
    members: { [user.uid]: memberOf(user) },
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const canControl = (room, uid) => !!room && !!uid && (room.hostUid === uid || (room.control === 'everyone' && !!room.members?.[uid]));

export const getRoom = async (roomId) => {
  const snap = await getDoc(roomRef(roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeRoom = (roomId, cb, onError) =>
  onSnapshot(roomRef(roomId), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError);

// The playback state everyone follows. `action` ('play' | 'pause' | 'seek' | 'episode') names a
// person's own action, shown to the others; null is the host's quiet position heartbeat.
export const publishState = (roomId, user, action, { playing, position, season, episode }) =>
  updateDoc(roomRef(roomId), {
    playing: !!playing,
    position: Math.max(0, Number(position) || 0),
    season: season ?? null,
    episode: episode ?? null,
    updatedAt: Date.now(),
    ...(action ? { lastAction: { uid: user.uid, name: memberOf(user).name, action, at: Date.now() } } : {}),
  });

// Host only: who may drive playback.
export const setControl = (roomId, control) => updateDoc(roomRef(roomId), { control: control === 'everyone' ? 'everyone' : 'host' });

export const actionVerb = (a) => ({ play: 'pressed play', pause: 'paused', seek: 'skipped to a new spot', episode: 'changed the episode' }[a?.action] || 'changed playback');
export const actionLabel = (a) => (a ? `${a.name} ${actionVerb(a)}` : '');

export const joinRoom = (roomId, user) => updateDoc(roomRef(roomId), { [`members.${user.uid}`]: memberOf(user) });
export const heartbeat = (roomId, user) => updateDoc(roomRef(roomId), { [`members.${user.uid}.lastSeen`]: Date.now() });

export const leaveRoom = (roomId, user, isHost) =>
  updateDoc(roomRef(roomId), {
    [`members.${user.uid}`]: deleteField(),
    ...(isHost ? { hostLeft: true, playing: false } : {}),
  });

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
    name: memberOf(user).name,
    photo: user.photoURL || null,
    text: clean,
    createdAt: serverTimestamp(),
  });
};

export const liveMembers = (room, now = Date.now()) =>
  Object.entries(room?.members || {})
    .map(([uid, m]) => ({ uid, ...m, live: now - (m.lastSeen || 0) < MEMBER_LIVE_MS }))
    .sort((a, b) => Number(b.uid === room.hostUid) - Number(a.uid === room.hostUid) || Number(b.live) - Number(a.live));
