# Verify: Watch progress in Continue Watching and details · spec 0004 · updated 2026-10-20
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual (signed in, desktop, MovieHub Server)
- [ ] Play a movie, watch 2 minutes or more, close the player. Home's Continue Watching shows it first, with a progress bar near where you stopped and "Movie · N min left" → AC-1
- [ ] Firestore `history/{uid}`: that item has `progressSec`, `duration`, `progress` (percent), and no `cast`, `similar` or `videos` fields → AC-1
- [ ] Play a show, pick S2 E5 in the episode list, watch a bit, close. Continue Watching shows "S2 · E5" with that episode's progress → AC-2
- [ ] Open the show's details page: the button reads "Resume S2 E5", with "S2 · E5 · N min left" and a progress bar under it → AC-3
- [ ] Press Resume: the player opens directly on S2 E5 at about that second, never on S1 E1 first → AC-3
- [ ] Press "Start over": the same episode starts at 0:00 → AC-3
- [ ] Click a Continue Watching card: the player opens at the saved episode and second → AC-1, AC-2
- [ ] Sign in to the same account in another browser: Continue Watching and the details Resume show the same episode and progress → AC-4
- [ ] Seek a movie into its last 90 seconds and close: the progress resets, and Resume no longer shows for it → AC-5
- [ ] A backup source (VidLink or VidSrc) still records the title and episode, with no progress bar → spec assumption
- [x] Signed out: details shows Play, the player opens and streams (checked 2026-10-20 in Brave: Fight Club streamed within 6 s)

## Value sourcing
- [ ] Progress percent = `progressSec / duration` from the history item (compare the bar to the player time) → AC-1
- [ ] Episode label = `lastSeason` / `lastEpisode` of the item; change episodes twice quickly and confirm the last one wins → AC-2

## Commands
- [ ] `npm run build` → succeeds

## Acceptance-criteria coverage
- AC-1 … movie progress steps · AC-2 … show episode steps · AC-3 … details Resume and Start over · AC-4 … second browser · AC-5 … near the end
