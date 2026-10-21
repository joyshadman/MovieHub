import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Crown, LogOut, Power, RefreshCcw, Send, UserMinus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MAX_MEMBERS, actionVerb, roomLink } from '../../services/watchTogether';
import { dicebearAvatarUrl, profileImgAttrs } from '../../utils/avatarUrls';

const avatar = (m) => m.photo || dicebearAvatarUrl(m.name || m.uid || 'guest');
const timeOf = (msg) => {
  const d = msg.createdAt?.toDate?.();
  return d ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
};

// The host's toast for one knock (Watch.jsx shows one per guest until it is handled).
export const KnockToast = ({ guest, onLetIn, onDeny }) => (
  <div className="flex items-center gap-3 font-body">
    <img src={avatar(guest)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" {...profileImgAttrs} />
    <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{guest.name}</span> wants to join</p>
    <button type="button" onClick={onDeny} className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10">Deny</button>
    <button type="button" onClick={onLetIn} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover">Let in</button>
  </div>
);

// Watch Together side sheet (spec 0005): share link, the host's lobby, who is here, chat, and the
// member's controls.
const TogetherPanel = ({ together, user, onClose, onLeave, onEnd, onSyncNow, style }) => {
  const reduce = useReducedMotion();
  const { room, isHost, hostAway, ended, members, pending, messages, send, control, changeControl, letIn, turnAway, remove } = together;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!room) return null;
  const link = roomLink(room.id);
  const copy = () => navigator.clipboard?.writeText(link).then(() => toast.success('Invite link copied'), () => toast.error('Could not copy the link'));
  const everyone = control === 'everyone';
  const host = room.hostName || 'the host';
  const status = ended ? 'The host ended the room. You are watching on your own now.'
    : isHost ? (everyone ? 'You are the host. Everyone in the room can play, pause, skip, and change the episode or server.' : 'You are the host. Everyone follows your play, pause, skip, episode and server.')
    : hostAway ? (everyone ? `${host} is away. Everyone can still control playback.` : `${host} is away. You are watching on your own until they come back.`)
    : everyone ? `${host} lets everyone control. Your play, pause and skips move the whole room.`
    : `Following ${host}. Only the host controls playback right now.`;
  const full = members.length >= MAX_MEMBERS;
  const handle = (fn, guest, failText) => fn(guest.uid, guest).catch(() => toast.error(failText));
  const toggleControl = async () => {
    setSwitching(true);
    try { await changeControl(everyone ? 'host' : 'everyone'); } catch { toast.error('Could not change who controls'); } finally { setSwitching(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try { await send(text); setText(''); } catch { toast.error('Message not sent'); } finally { setSending(false); }
  };

  return (
    <Motion.aside
      initial={reduce ? false : { x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reduce ? { opacity: 0 } : { x: 40, opacity: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Watch together"
      style={style}
      className="fixed inset-y-0 right-0 z-[520] flex w-[min(360px,100vw)] flex-col border-l border-white/10 bg-[#0d0d12]/95 font-body text-white shadow-card backdrop-blur-xl"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-accent-text" aria-hidden="true" /> Watch together</h2>
        <button type="button" onClick={onClose} aria-label="Close watch together" className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><X size={18} aria-hidden="true" /></button>
      </header>

      <div className="space-y-3 border-b border-white/10 px-4 py-4">
        <p className="text-xs leading-5 text-white/60" role="status">{status}</p>
        {isHost && !ended && (
          <div className="flex items-center justify-between gap-3 rounded-control border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <span id="together-control-label" className="text-xs font-medium text-white/85">Let everyone control playback</span>
            <button
              type="button"
              role="switch"
              aria-checked={everyone}
              aria-labelledby="together-control-label"
              disabled={switching}
              onClick={toggleControl}
              className={`relative h-6 w-11 shrink-0 rounded-full border motion-safe:transition-colors disabled:opacity-50 ${everyone ? 'border-accent bg-accent' : 'border-line-strong bg-white/10'}`}
            >
              <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white motion-safe:transition-all ${everyone ? 'left-[22px]' : 'left-0.5'}`} aria-hidden="true" />
            </button>
          </div>
        )}
        {room.lastAction && !ended && (
          <p className="text-[11px] text-white/40">Last: {room.lastAction.uid === user?.uid ? 'You' : room.lastAction.name} {actionVerb(room.lastAction)}</p>
        )}
        <div className="flex items-center gap-2">
          <input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.target.select()} className="h-9 min-w-0 flex-1 rounded-control border border-line-strong bg-white/[0.06] px-3 font-mono text-[11px] text-white/80 focus:outline-none focus:border-accent-text" />
          <button type="button" onClick={copy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-black hover:bg-white/90"><Copy size={13} aria-hidden="true" /> Copy</button>
        </div>
        <div className="flex gap-2">
          {!isHost && together.syncing && (
            <button type="button" onClick={onSyncNow} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 text-xs font-semibold hover:bg-white/10"><RefreshCcw size={13} aria-hidden="true" /> Sync now</button>
          )}
          <button type="button" onClick={onLeave} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/20 text-xs font-semibold text-accent-text hover:bg-white/10"><LogOut size={13} aria-hidden="true" /> {isHost ? 'End for me' : 'Leave room'}</button>
        </div>
        {isHost && !ended && (
          confirmEnd ? (
            <div role="alertdialog" aria-labelledby="together-end-title" className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-accent/40 bg-accent/10 px-3 py-2.5">
              <p id="together-end-title" className="text-xs text-white/85">End the room for everyone? Nobody can rejoin.</p>
              <div className="flex gap-2">
                <button type="button" autoFocus onClick={() => setConfirmEnd(false)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/85 hover:bg-white/10">Cancel</button>
                <button type="button" onClick={onEnd} className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover">End room</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmEnd(true)} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white"><Power size={13} aria-hidden="true" /> End room for everyone</button>
          )
        )}
      </div>

      {isHost && !ended && pending.length > 0 && (
        <div className="border-b border-white/10 bg-rating/[0.06] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rating">Waiting to join · {pending.length}{full ? ' · room is full' : ''}</p>
          <ul className="mt-2 space-y-2">
            {pending.map((p) => (
              <li key={p.uid} className="flex items-center gap-2 text-xs">
                <img src={avatar(p)} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" {...profileImgAttrs} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <button type="button" onClick={() => handle(turnAway, p, 'Could not turn them away. Try again.')} aria-label={`Deny ${p.name}`} className="rounded-full border border-white/20 px-2.5 py-1 font-semibold hover:bg-white/10">Deny</button>
                <button type="button" onClick={() => handle(letIn, p, 'Could not let them in. The room may be full.')} disabled={full} aria-label={`Let ${p.name} in`} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 font-semibold text-white hover:bg-accent-hover disabled:opacity-40"><Check size={12} aria-hidden="true" /> Let in</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Here now · {members.filter((m) => m.live).length} <span className="font-normal normal-case tracking-normal">({members.length} of {MAX_MEMBERS} seats)</span></p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {members.map((m) => (
            <li key={m.uid} className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${m.live ? 'border-white/15 bg-white/[0.05]' : 'border-white/5 text-white/40'}`}>
              <img src={avatar(m)} alt="" className="h-5 w-5 rounded-full object-cover" {...profileImgAttrs} />
              <span className="max-w-[110px] truncate">{m.uid === user?.uid ? 'You' : m.name}</span>
              {m.uid === room.hostUid && <Crown size={12} className="text-rating" aria-label="Host" />}
              {isHost && !ended && m.uid !== room.hostUid && (
                <button type="button" onClick={() => handle(remove, m, 'Could not remove them. Try again.')} aria-label={`Remove ${m.name} from the room`} title="Remove from the room" className="-mr-0.5 rounded-full p-0.5 text-white/50 hover:bg-white/10 hover:text-white"><UserMinus size={12} aria-hidden="true" /></button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <ol ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-label="Chat" aria-live="polite">
        {messages.length === 0 && <li className="pt-6 text-center text-xs text-white/40">Say hi. Messages show for everyone in the room.</li>}
        {messages.map((msg) => (
          <li key={msg.id} className="flex gap-2.5">
            <img src={avatar({ ...msg, uid: msg.uid })} alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover" {...profileImgAttrs} />
            <div className="min-w-0">
              <p className="text-[11px] text-white/45"><span className="font-semibold text-white/80">{msg.uid === user?.uid ? 'You' : msg.name}</span> · {timeOf(msg)}</p>
              <p className="break-words text-sm leading-5 text-white/90">{msg.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-white/10 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <label htmlFor="together-message" className="sr-only">Message</label>
        <input id="together-message" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Send a message" autoComplete="off" className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-white/[0.06] px-4 text-sm focus:outline-none focus:border-accent-text" />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"><Send size={16} aria-hidden="true" /></button>
      </form>
    </Motion.aside>
  );
};

export default TogetherPanel;
