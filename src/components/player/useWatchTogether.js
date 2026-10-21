/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DRIFT_SEC, HOST_BEAT_MS, MEMBER_BEAT_MS, actionLabel, admit, beat, canControl, cleanSubs, deny, endRoom,
  firstReceivedAt, hostIsAway, hostLeave, liveMembers, pendingList, publishState, publishSubs, removeMember,
  roomEnded, roomSecond, sendMessage, setControl, subscribeMessages, subscribeRoom,
} from '../../services/watchTogether';

const ACTION_GAP_MS = 2500; // a follower waits this long between corrections (time reports lag)
const FRESH_ACTION_MS = 10000; // someone else acted this recently: the host's beat waits
const TICK_MS = 15000; // re-check who is here and whether the host is away
const SUBS_DEBOUNCE_MS = 600; // timing and style taps in a row go to the room as one write

// One Watch Together room seen from the player (spec 0005). Members who may control (the host,
// or everyone when the host allows it) publish ONLY their own actions through `act`; every member
// follows the room. Following never publishes, so nobody bounces an update back. Times are
// measured from when a playback change ARRIVED here, not from another device's clock, so devices
// with wrong clocks still line up (network delay is well under a second).
export const useWatchTogether = ({ roomId, user, player, season, episode, server, onEpisode, onServer, onSubs, onAudio }) => {
  const [room, setRoom] = useState(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const receivedAt = useRef(0);
  const uid = user?.uid;
  const isHost = !!room && !!uid && room.hostUid === uid;
  const isMember = !!room && !!uid && !!room.members?.[uid];
  const ended = !!room && roomEnded(room, now);
  const away = !!room && !isHost && hostIsAway(room, now);
  const everyone = room?.control === 'everyone';
  // Host away: in host controls mode everyone watches on their own; in everyone mode the room goes on.
  const syncing = isMember && !ended && (!away || everyone);
  const allowed = syncing && canControl(room, uid);

  // Room doc + chat. The clock restarts only when playback was published (`updatedAt` moved), not
  // on a presence beat, which changes the doc but not the position.
  useEffect(() => {
    if (!roomId) return undefined;
    setMissing(false);
    receivedAt.current = 0;
    let lastUpdatedAt = null;
    const unsubRoom = subscribeRoom(roomId, (r) => {
      if (r && r.updatedAt !== lastUpdatedAt) {
        receivedAt.current = receivedAt.current ? Date.now() : firstReceivedAt(r);
        lastUpdatedAt = r.updatedAt;
      }
      setRoom(r);
      setMissing(!r);
    }, () => setMissing(true));
    const unsubChat = subscribeMessages(roomId, setMessages);
    const tick = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => { unsubRoom(); unsubChat(); clearInterval(tick); setRoom(null); setMessages([]); };
  }, [roomId]);

  // Everything the timers and cleanups read, kept fresh without restarting them.
  const latest = useRef({});
  useEffect(() => { latest.current = { room, player, season, episode, isHost, ended, expectedTime }; });

  // Presence: one beat on opening (the host's also clears "away"), then one a minute, skipped when
  // a playback publish already counted as this minute's beat.
  const lastWrite = useRef(0);
  useEffect(() => {
    if (!roomId || !user || !isMember) return undefined;
    const host = latest.current.isHost;
    beat(roomId, user, { isHost: host }).catch((err) => console.error('Join room:', err));
    lastWrite.current = Date.now();
    const t = setInterval(() => {
      if (Date.now() - lastWrite.current < MEMBER_BEAT_MS - 10000) return;
      lastWrite.current = Date.now();
      beat(roomId, user).catch(() => {});
    }, MEMBER_BEAT_MS);
    return () => {
      clearInterval(t);
      const { room: r, player: p, isHost: h, ended: e } = latest.current;
      if (h && !e) hostLeave(roomId, { control: r?.control, position: p?.duration > 0 ? p.currentTime : r?.position }).catch(() => {});
    };
  }, [roomId, uid, isMember]);

  // Someone else's action: say who did what (not the one already in the room when we joined).
  const shownAction = useRef(undefined);
  const roomLoaded = !!room;
  useEffect(() => {
    if (!roomLoaded || !user) return;
    const a = room.lastAction;
    const key = a ? `${a.uid}|${a.at}` : 'none';
    if (shownAction.current === undefined) { shownAction.current = key; return; }
    if (shownAction.current === key) return;
    shownAction.current = key;
    if (a && a.uid !== user.uid) toast(actionLabel(a), { id: 'room-action', icon: '👥', duration: 2500 });
  }, [roomLoaded, room?.lastAction?.at]);

  // When this member last corrected or acted: followers wait ACTION_GAP_MS after it.
  const lastAction = useRef(0);
  const publishedAudioAt = useRef(null); // the room audio change this device published itself

  // Where the room is now, as seen from here.
  const expectedTime = useCallback(() => (room ? roomSecond(room, receivedAt.current) : 0), [room]);

  // --- PUBLISH: a person's own action (Watch.jsx calls it from its buttons) ---
  // Returns false when this member may not control the room, so the caller can hold the action.
  const act = useCallback((action, state = {}) => {
    if (!roomId || !room || !syncing) return true; // no live room: act locally as usual
    if (!canControl(room, uid)) return false;
    // Mark ours so we do not "correct" our own action before the room echoes it back.
    lastAction.current = Date.now();
    if (state.audio) publishedAudioAt.current = state.audio.at;
    lastWrite.current = Date.now();
    publishState(roomId, user, action, {
      playing: !player.paused,
      position: player.duration > 0 ? player.currentTime : 0,
      season,
      episode,
      server,
      ...state,
    }).catch((err) => console.error('Room update:', err));
    return true;
  }, [roomId, room, syncing, user, uid, player.paused, player.currentTime, player.duration, season, episode, server]);

  // Host clock: re-publish its position while playing, only when it is in step with the room and
  // nobody else just acted (so a stale beat can not undo someone's seek). Carries no server, so a
  // server another member just picked is never overwritten.
  useEffect(() => {
    if (!isHost || !syncing) return undefined;
    const t = setInterval(() => {
      const { room: r, player: p, season: s, episode: e, expectedTime: exp } = latest.current;
      if (!r || !(p.duration > 0) || p.paused || !r.playing) return;
      if (r.lastAction && r.lastAction.uid !== uid && Date.now() - (r.lastAction.at || 0) < FRESH_ACTION_MS) return;
      if (Math.abs(p.currentTime - exp()) > DRIFT_SEC) return;
      lastWrite.current = Date.now();
      publishState(roomId, user, null, { playing: true, position: p.currentTime, season: s, episode: e }).catch(() => {});
    }, HOST_BEAT_MS);
    return () => clearInterval(t);
  }, [isHost, syncing, roomId]);

  // --- FOLLOW: every member matches the room ---
  const episodeFor = useRef(null);
  const onEpisodeRef = useRef(onEpisode);
  const onServerRef = useRef(onServer);
  const onSubsRef = useRef(onSubs);
  const onAudioRef = useRef(onAudio);
  useEffect(() => {
    onEpisodeRef.current = onEpisode; onServerRef.current = onServer; onSubsRef.current = onSubs; onAudioRef.current = onAudio;
  }, [onEpisode, onServer, onSubs, onAudio]);
  useEffect(() => {
    if (!syncing) return undefined;
    const check = () => {
      if (room.season && room.episode && (room.season !== season || room.episode !== episode)) {
        const key = `${room.season}|${room.episode}|${room.updatedAt}`;
        if (episodeFor.current !== key) {
          episodeFor.current = key;
          onEpisodeRef.current?.(room.season, room.episode, expectedTime());
        }
        return;
      }
      if (!(player.duration > 0) || Date.now() - lastAction.current < ACTION_GAP_MS) return;
      const target = expectedTime();
      let acted = false;
      if (Math.abs(player.currentTime - target) > DRIFT_SEC) { player.seek(target); acted = true; }
      if (room.playing && player.paused) { player.play(); acted = true; }
      if (!room.playing && !player.paused) { player.pause(); acted = true; }
      if (acted) lastAction.current = Date.now();
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [syncing, room, season, episode, player.duration, player.paused, player.currentTime, expectedTime]);

  // The room's server is followed as an event (when someone switches), not enforced every second,
  // so this device's own automatic fallback to another frameXTV provider never fights the room.
  const serverKey = room?.server ? `${room.server.sourceId}|${room.server.providerId || ''}` : null;
  const seenServer = useRef(undefined);
  useEffect(() => {
    if (!serverKey) return;
    if (seenServer.current === undefined) { seenServer.current = serverKey; return; }
    if (seenServer.current === serverKey) return;
    seenServer.current = serverKey;
    const mine = `${server?.sourceId}|${server?.providerId || ''}`;
    if (syncing && mine !== serverKey) onServerRef.current?.(room.server, expectedTime());
  }, [serverKey]);

  // --- SUBTITLES (spec 0007): they follow the control mode, like playback ---
  // 'local' (no live room: just this viewer), 'held' (this member may not control: the change stays
  // theirs alone), or 'shared' (published to the room, debounced).
  const subsTimer = useRef(null);
  const publishedSubsAt = useRef(null);
  useEffect(() => () => clearTimeout(subsTimer.current), [roomId]);
  const shareSubs = useCallback((next) => {
    if (!roomId || !room || !syncing) return 'local';
    if (!canControl(room, uid)) return 'held';
    const clean = cleanSubs(next);
    publishedSubsAt.current = clean.at;
    clearTimeout(subsTimer.current);
    subsTimer.current = setTimeout(() => {
      lastWrite.current = Date.now();
      publishSubs(roomId, user, clean).catch((err) => console.error('Room subtitles:', err));
    }, SUBS_DEBOUNCE_MS);
    return 'shared';
  }, [roomId, room, syncing, user, uid]);
  // Apply the room's subtitles when they change, and once on joining (a late joiner gets the
  // current ones). Never this device's own echo.
  const subsAt = room?.subs?.at || null;
  const appliedSubs = useRef(null);
  useEffect(() => {
    if (!syncing || !subsAt || appliedSubs.current === subsAt) return;
    appliedSubs.current = subsAt;
    if (subsAt !== publishedSubsAt.current) onSubsRef.current?.(room.subs);
  }, [subsAt, syncing]);

  // --- AUDIO LANGUAGE (spec 0007): the room's dub, applied when it changes and once on joining ---
  const audioAt = room?.audio?.at || null;
  const appliedAudio = useRef(null);
  useEffect(() => {
    if (!syncing || !audioAt || appliedAudio.current === audioAt) return;
    appliedAudio.current = audioAt;
    if (audioAt !== publishedAudioAt.current) onAudioRef.current?.(room.audio, expectedTime());
  }, [audioAt, syncing]);

  const send = useCallback((text) => (roomId && user ? sendMessage(roomId, user, text) : Promise.resolve()), [roomId, user]);
  const hostOnly = (fn) => (...args) => (roomId && isHost ? fn(roomId, ...args) : Promise.resolve());

  return {
    room,
    missing,
    isHost,
    isMember,
    syncing,
    allowed, // this member may drive playback right now
    following: syncing && !allowed, // a member who only follows (their controls are held)
    hostAway: away,
    ended,
    control: room?.control || 'host',
    members: liveMembers(room, now),
    pending: isHost ? pendingList(room) : [],
    messages,
    expectedTime,
    act,
    shareSubs,
    send,
    changeControl: hostOnly(setControl),
    letIn: hostOnly(admit),
    turnAway: hostOnly(deny),
    remove: hostOnly(removeMember),
    endForEveryone: hostOnly(endRoom),
  };
};
