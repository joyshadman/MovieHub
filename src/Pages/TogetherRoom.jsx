import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LogIn, Users } from 'lucide-react';
import { getRoom } from '../services/watchTogether';
import WatchPage from './Watch';
import Button from '../components/ui/Button';
import { EmptyState, PageLoader } from '../components/ui/feedback';

// A Watch Together invite link (spec 0005): signs the guest in if needed, then opens the player
// on the room's title and episode at the host's current second.
const TogetherRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ status: 'loading', room: null, t: 0 });

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    getRoom(roomId)
      .then((room) => {
        if (cancelled) return;
        // The host's second right now, worked out once when the room opens (the player then syncs).
        const pos = Number(room?.position) || 0;
        const t = room?.hostLeft ? 0 : room?.playing ? pos + Math.max(0, (Date.now() - (room.updatedAt || Date.now())) / 1000) : pos;
        setState({ status: room ? 'ready' : 'missing', room, t });
      })
      .catch((err) => { console.error('Open room:', err); if (!cancelled) setState({ status: 'error', room: null, t: 0 }); });
    return () => { cancelled = true; };
  }, [roomId, user]);

  const page = 'font-body min-h-screen flex items-center justify-center px-4 pt-24 pb-16';

  if (!user) {
    return (
      <div className={page}>
        <EmptyState
          icon={<Users size={26} aria-hidden="true" />}
          title="You are invited to watch together"
          message="Sign in to join the room. Playback stays in sync with the host, and you can chat while you watch."
          action={<Button to="/login" state={{ from: location.pathname }} icon={<LogIn size={16} aria-hidden="true" />}>Sign in to join</Button>}
        />
      </div>
    );
  }
  if (state.status === 'loading') return <PageLoader label="Joining the room" className="min-h-screen pt-20" />;
  if (state.status !== 'ready') {
    return (
      <div className={page}>
        <EmptyState
          icon={<Users size={26} aria-hidden="true" />}
          title={state.status === 'missing' ? 'This room does not exist' : 'We could not open this room'}
          message={state.status === 'missing' ? 'The link may be wrong, or the room was removed.' : 'Check your connection and try the link again.'}
          action={<Button to="/" variant="outline">Back to Home</Button>}
        />
      </div>
    );
  }

  const { room, t } = state;
  return (
    <WatchPage
      movie={room.title}
      user={user}
      roomId={room.id}
      resume={{ season: room.season, episode: room.episode, t }}
      onClose={() => navigate('/')}
    />
  );
};

export default TogetherRoom;
