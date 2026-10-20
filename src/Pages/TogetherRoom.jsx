import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Ban, Clock, LogIn, UserX, Users } from 'lucide-react';
import { cancelKnock, firstReceivedAt, knock, roomSecond, subscribeRoom, viewerState } from '../services/watchTogether';
import WatchPage from './Watch';
import Button from '../components/ui/Button';
import { EmptyState, PageLoader } from '../components/ui/feedback';

// A Watch Together invite link (spec 0005). Signed out: sign in first. Signed in: knock once and
// wait in the lobby until the host lets you in, then the player opens on the room's title,
// episode and server at the room's second. Once in, the player stays when the room ends (you keep
// watching on your own); being removed drops you to the removed screen.
const TogetherRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', room: null, view: null });
  const [entry, setEntry] = useState(null); // where the player starts, fixed when you got in
  const knocked = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const uid = user?.uid;

  // App remounts this page per path, so a new room id always starts with a fresh entry and knock.
  useEffect(() => {
    if (!uid) return undefined;
    let receivedAt = 0;
    let lastUpdatedAt = null;
    return subscribeRoom(roomId, (room) => {
      if (!room) { setState({ status: 'missing', room: null, view: null }); return; }
      if (room.updatedAt !== lastUpdatedAt) {
        receivedAt = receivedAt ? Date.now() : firstReceivedAt(room);
        lastUpdatedAt = room.updatedAt;
      }
      const view = viewerState(room, uid);
      setState({ status: 'ready', room, view });
      if (view === 'member') {
        setEntry((e) => e || { season: room.season, episode: room.episode, t: roomSecond(room, receivedAt), server: room.server || null });
      }
      if (view === 'outsider' && !knocked.current) {
        knocked.current = true;
        knock(roomId, userRef.current).catch((err) => {
          console.error('Knock:', err);
          setState((s) => ({ ...s, status: 'error' }));
        });
      }
    }, (err) => { console.error('Open room:', err); setState({ status: 'error', room: null, view: null }); });
  }, [roomId, uid]);

  const page = 'font-body min-h-screen flex items-center justify-center px-4 pt-24 pb-16';
  const screen = (icon, title, message, action) => (
    <div className={page}>
      <EmptyState icon={icon} title={title} message={message} action={action || <Button to="/" variant="outline">Back to Home</Button>} />
    </div>
  );
  const usersIcon = <Users size={26} aria-hidden="true" />;

  if (!user) {
    return screen(
      usersIcon,
      'You are invited to watch together',
      'Sign in to join the room. Playback stays in sync with the host, and you can chat while you watch.',
      <Button to="/login" state={{ from: location.pathname }} icon={<LogIn size={16} aria-hidden="true" />}>Sign in to join</Button>
    );
  }

  const { status, room, view } = state;
  // In the player already: stay there unless the host removed you.
  if (entry && room && view !== 'blocked') {
    return (
      <WatchPage
        movie={room.title}
        user={user}
        roomId={room.id}
        server={entry.server}
        resume={{ season: entry.season, episode: entry.episode, t: entry.t }}
        onClose={() => navigate('/')}
      />
    );
  }

  if (status === 'loading') return <PageLoader label="Opening the room" className="min-h-screen pt-20" />;
  if (status === 'missing') return screen(usersIcon, 'This room does not exist', 'The link may be wrong, or the room was removed.');
  if (status === 'error') return screen(usersIcon, 'We could not open this room', 'Check your connection and try the link again.');

  const host = room.hostName || 'the host';
  if (view === 'blocked') {
    return entry
      ? screen(<UserX size={26} aria-hidden="true" />, 'You were removed from this room', `${host} removed you, so you can not rejoin this room.`)
      : screen(<Ban size={26} aria-hidden="true" />, 'The host did not let you in', `${host} turned down your request for this room.`);
  }
  if (view === 'ended') return screen(usersIcon, 'This room has ended', 'Ask the host for a new invite link to watch together again.');
  if (view === 'full') return screen(usersIcon, 'This room is full', `Rooms hold up to 10 people. Ask ${host} to make room, or start your own.`);

  // Pending (or the knock is on its way): the waiting screen. Nothing plays until the host lets you in.
  const poster = room.title?.poster_path ? `https://image.tmdb.org/t/p/w342${room.title.poster_path}` : null;
  const cancel = () => {
    cancelKnock(roomId, uid).catch(() => {});
    navigate('/');
  };
  return (
    <div className={page}>
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-panel border border-line bg-card px-6 py-10 text-center" role="status" aria-live="polite">
        {poster
          ? <img src={poster} alt="" className="h-48 w-32 rounded-control object-cover shadow-card" />
          : <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-raised text-muted">{usersIcon}</div>}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-text">Watch together</p>
          <h1 className="mt-2 text-xl font-semibold text-white">{room.title?.title}</h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted"><Clock size={15} className="shrink-0 motion-safe:animate-pulse" aria-hidden="true" /> Waiting for {host} to let you in</p>
        <Button variant="outline" onClick={cancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default TogetherRoom;
