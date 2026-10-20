/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  DRIFT_SEC, MEMBER_HEARTBEAT_MS, actionLabel, canControl, heartbeat, joinRoom, leaveRoom,
  liveMembers, publishState, sendMessage, setControl, subscribeMessages, subscribeRoom,
} from '../../services/watchTogether';

const HOST_BEAT_MS = 8000; // the host re-publishes its position this often while playing
const ACTION_GAP_MS = 2500; // a follower waits this long between corrections (time reports lag)
const FRESH_ACTION_MS = 10000; // someone else acted this recently: the host's heartbeat waits

// One Watch Together room seen from the player (spec 0005). Members who may control (the host,
// or everyone when the host allows it) publish ONLY their own actions through `act`; every member
// follows the room. Following never publishes, so nobody bounces an update back. Times are
// measured from when a snapshot ARRIVED here, not from another device's clock, so devices with
// wrong clocks still line up (network delay is well under a second).
export const useWatchTogether = ({ roomId, user, player, season, episode, onEpisode }) => {
  const [room, setRoom] = useState(null);
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const receivedAt = useRef(0);
  const isHost = !!room && !!user && room.hostUid === user.uid;
  const allowed = !!room && !room.hostLeft && canControl(room, user?.uid);
  const syncing = !!room && !room.hostLeft;

  // Room doc + chat.
  useEffect(() => {
    if (!roomId) return undefined;
    setMissing(false);
    const unsubRoom = subscribeRoom(roomId, (r) => {
      receivedAt.current = Date.now();
      setRoom(r);
      setMissing(!r);
    }, () => setMissing(true));
    const unsubChat = subscribeMessages(roomId, setMessages);
    return () => { unsubRoom(); unsubChat(); setRoom(null); setMessages([]); };
  }, [roomId]);

  // Membership: join, heartbeat, leave on close.
  const hostRef = useRef(false);
  useEffect(() => { hostRef.current = isHost; }, [isHost]);
  useEffect(() => {
    if (!roomId || !user) return undefined;
    joinRoom(roomId, user).catch((err) => console.error('Join room:', err));
    const beat = setInterval(() => {
      heartbeat(roomId, user).catch(() => {});
      setNow(Date.now());
    }, MEMBER_HEARTBEAT_MS);
    return () => {
      clearInterval(beat);
      leaveRoom(roomId, user, hostRef.current).catch(() => {});
    };
  }, [roomId, user?.uid]);

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

  // Where the room is now, as seen from here.
  const expectedTime = useCallback(() => {
    if (!room) return 0;
    const pos = Number(room.position) || 0;
    return room.playing ? pos + (Date.now() - receivedAt.current) / 1000 : pos;
  }, [room]);

  // --- PUBLISH: a person's own action (Watch.jsx calls it from its buttons) ---
  // Returns false when this member may not control the room, so the caller can hold the action.
  const act = useCallback((action, state = {}) => {
    if (!roomId || !room || room.hostLeft) return true; // no live room: act locally as usual
    if (!canControl(room, user?.uid)) return false;
    // Followers correct themselves after ACTION_GAP_MS; mark ours so we do not "correct" our own
    // action before the room echoes it back.
    lastAction.current = Date.now();
    publishState(roomId, user, action, {
      playing: !player.paused,
      position: player.duration > 0 ? player.currentTime : 0,
      season,
      episode,
      ...state,
    }).catch((err) => console.error('Room update:', err));
    return true;
  }, [roomId, room, user, player.paused, player.currentTime, player.duration, season, episode]);

  // Host clock: re-publish its position while playing, only when it is in step with the room and
  // nobody else just acted (so a stale heartbeat can not undo someone's seek).
  const latest = useRef({});
  useEffect(() => { latest.current = { room, player, season, episode, expectedTime }; });
  useEffect(() => {
    if (!isHost || !syncing) return undefined;
    const t = setInterval(() => {
      const { room: r, player: p, season: s, episode: e, expectedTime: exp } = latest.current;
      if (!r || !(p.duration > 0) || p.paused || !r.playing) return;
      if (r.lastAction && r.lastAction.uid !== user?.uid && Date.now() - (r.lastAction.at || 0) < FRESH_ACTION_MS) return;
      if (Math.abs(p.currentTime - exp()) > DRIFT_SEC) return;
      publishState(roomId, user, null, { playing: true, position: p.currentTime, season: s, episode: e }).catch(() => {});
    }, HOST_BEAT_MS);
    return () => clearInterval(t);
  }, [isHost, syncing, roomId]);

  // --- FOLLOW: every member matches the room ---
  const episodeFor = useRef(null);
  const onEpisodeRef = useRef(onEpisode);
  useEffect(() => { onEpisodeRef.current = onEpisode; }, [onEpisode]);
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

  const send = useCallback((text) => (roomId && user ? sendMessage(roomId, user, text) : Promise.resolve()), [roomId, user]);
  const changeControl = useCallback((control) => {
    if (!roomId || !isHost) return Promise.resolve();
    return setControl(roomId, control);
  }, [roomId, isHost]);

  return {
    room,
    missing,
    isHost,
    allowed, // this member may drive playback right now
    following: syncing && !allowed, // a member who only follows (their controls are held)
    hostLeft: !!room?.hostLeft,
    control: room?.control || 'host',
    members: liveMembers(room, now),
    messages,
    expectedTime,
    act,
    send,
    changeControl,
  };
};
