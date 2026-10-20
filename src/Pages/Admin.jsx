import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Save, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { isOwner } from '../config/owner';
import { DEFAULT_AI_DAILY_LIMIT, DEFAULT_MAINTENANCE_MESSAGE, saveAiDailyLimit, saveSiteConfig } from '../services/siteConfig';
import VisitorTracker from '../components/VisitorTracker';
import Button from '../components/ui/Button';
import NotFound from './NotFound';

const EYEBROW = 'text-[10px] font-bold uppercase tracking-[0.3em]';

// Owner only (spec 0003): the maintenance switch, the MovieHub AI daily allowance (spec 0006) and
// the visitor tracker (moved here from About). Anyone else gets the 404 page. Firestore rules must
// enforce the same.
const Admin = ({ user, site }) => {
  const [on, setOn] = useState(!!site?.maintenance);
  const [message, setMessage] = useState(site?.message || '');
  const [saving, setSaving] = useState(false);
  const liveLimit = site?.aiDailyLimit ?? DEFAULT_AI_DAILY_LIMIT;
  const [aiLimit, setAiLimit] = useState(String(liveLimit));
  const [savingLimit, setSavingLimit] = useState(false);

  // Follow the live value whenever it changes (a save here, or another tab or device).
  const [synced, setSynced] = useState(site);
  if (site !== synced) {
    setSynced(site);
    setOn(!!site?.maintenance);
    setMessage(site?.message || '');
    setAiLimit(String(site?.aiDailyLimit ?? DEFAULT_AI_DAILY_LIMIT));
  }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!isOwner(user)) return <NotFound />;

  const dirty = on !== !!site?.maintenance || message.trim() !== (site?.message || '');
  const save = async (next = { maintenance: on, message }) => {
    setSaving(true);
    try {
      await saveSiteConfig(user, next);
      toast.success(next.maintenance ? 'Maintenance mode is on' : 'The site is open to everyone');
    } catch (err) {
      console.error('Save site config:', err);
      toast.error('Could not save. Check the Firestore rule for config/site.');
    } finally {
      setSaving(false);
    }
  };

  const limitNumber = Number(aiLimit);
  const limitValid = Number.isInteger(limitNumber) && limitNumber >= 1 && limitNumber <= 50;
  const saveLimit = async (e) => {
    e.preventDefault();
    if (!limitValid) return;
    setSavingLimit(true);
    try {
      await saveAiDailyLimit(user, limitNumber);
      toast.success(`Everyone now gets ${limitNumber} AI messages a day`);
    } catch (err) {
      console.error('Save AI limit:', err);
      toast.error('Could not save. Check the Firestore rule for config/site.');
    } finally {
      setSavingLimit(false);
    }
  };

  const container = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16';

  return (
    <div className="font-body text-white pt-28 md:pt-32">
      <Helmet><title>Admin · MovieHub</title></Helmet>
      <header className={`${container} mb-10`}>
        <p className={`flex items-center gap-2 text-accent-text ${EYEBROW}`}><ShieldCheck size={14} aria-hidden="true" /> Only visible to you</p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-[-0.04em]">Admin</h1>
        <p className="mt-3 text-sm text-muted">Site switches and who is on MovieHub right now.</p>
      </header>

      <section aria-labelledby="maintenance-title" className={`${container} pb-16`}>
        <div className={`rounded-panel border p-5 md:p-6 ${site?.maintenance ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-card'}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="maintenance-title" className="flex items-center gap-2 text-xl font-semibold"><Wrench size={18} className="text-accent-text" aria-hidden="true" /> Maintenance mode</h2>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                When it is on, every visitor sees a maintenance screen instead of the site. You still see everything.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium" role="status">
                <span className={`h-2 w-2 rounded-full ${site?.maintenance ? 'bg-accent motion-safe:animate-pulse' : 'bg-emerald-400'}`} aria-hidden="true" />
                {site?.maintenance ? 'Live now: visitors see the maintenance screen' : 'Live now: the site is open to everyone'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label="Maintenance mode"
              onClick={() => setOn((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full border motion-safe:transition-colors ${on ? 'border-accent bg-accent' : 'border-line-strong bg-white/10'}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow motion-safe:transition-all ${on ? 'left-7' : 'left-1'}`} aria-hidden="true" />
            </button>
          </div>

          <label htmlFor="maintenance-message" className="mt-6 block text-sm text-white/85">Message visitors see</label>
          <textarea
            id="maintenance-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={DEFAULT_MAINTENANCE_MESSAGE}
            className="mt-2 w-full rounded-control border border-line-strong bg-white/[0.06] px-4 py-3 text-sm resize-none focus:outline-none focus:border-accent-text"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => save()} loading={saving} disabled={!dirty} icon={<Save size={16} aria-hidden="true" />}>
              {on && !site?.maintenance ? 'Turn on maintenance' : !on && site?.maintenance ? 'Open the site' : 'Save'}
            </Button>
            {dirty && <span className="text-xs text-white/50">Not saved yet</span>}
          </div>
        </div>
      </section>

      <section aria-labelledby="ai-limit-title" className={`${container} pb-16`}>
        <form onSubmit={saveLimit} className="rounded-panel border border-white/10 bg-card p-5 md:p-6">
          <h2 id="ai-limit-title" className="flex items-center gap-2 text-xl font-semibold"><Sparkles size={18} className="text-accent-text" aria-hidden="true" /> MovieHub AI</h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted">
            How many answered AI messages each signed in user gets per day. It resets at midnight UTC. You are never limited.
            A lower number spreads the shared free AI allowance across more people.
          </p>
          <label htmlFor="ai-limit" className="mt-6 block text-sm text-white/85">AI messages per user per day (1 to 50)</label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id="ai-limit"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              step={1}
              value={aiLimit}
              onChange={(e) => setAiLimit(e.target.value)}
              aria-invalid={!limitValid}
              aria-describedby={limitValid ? undefined : 'ai-limit-error'}
              className="h-11 w-28 rounded-control border border-line-strong bg-white/[0.06] px-4 text-sm focus:outline-none focus:border-accent-text"
            />
            <Button type="submit" loading={savingLimit} disabled={!limitValid || limitNumber === liveLimit} icon={<Save size={16} aria-hidden="true" />}>Save</Button>
            {limitValid && limitNumber !== liveLimit && <span className="text-xs text-white/50">Not saved yet · live now: {liveLimit}</span>}
          </div>
          {!limitValid && <p id="ai-limit-error" className="mt-2 text-xs text-accent-text">Pick a whole number from 1 to 50.</p>}
        </form>
      </section>

      <VisitorTracker className={`${container} scroll-mt-20 pb-24`} />
    </div>
  );
};

export default Admin;
