# 0004 · Watch progress in Continue Watching and details

**Status**: Assumed
**Date**: 2026-10-20
**Authorized by**: joyshadman, during /develop

## Owed decision
Where the resume point (second, duration, season, episode) lives, so Continue Watching and the details page can show real progress on every device.

## Assumption built on
- The existing Firestore doc `history/{uid}` with its `items` array stays the one store. Each item keeps its current fields and gains `progress` (seconds), `duration` (seconds), `season`, `episode`, `updatedAt`.
- One item per title (movie or show). For a show, the item holds the last watched episode and that episode's progress.
- The Watch player saves progress to Firestore at most every 15 s while time moves, and once on close. localStorage (`mh:progress:*`) stays as the fast, per browser copy and the fallback when signed out.
- Progress is only known for the frameXTV source (the only one that reports time). Backup sources still write history (title, season, episode), with no progress bar.
- Continue Watching shows a progress bar from `progress / duration`, and "S2 · E5" for shows.
- The details page shows, for a title in history: "Resume S2 E5" (or "Resume"), with time left and a progress bar, and the play button starts at that episode and second.
- Opening a Continue Watching card resumes at the saved episode and second.

## Code area
`src/services/watchHistory.js`, `src/Pages/Watch.jsx`, `src/Pages/ContinueWatching.jsx`, `src/Pages/MovieDetails.jsx`, `src/Pages/Home.jsx`

## Requirements
- AC-1: Watching a movie for a while, then leaving, shows that movie in Continue Watching with a progress bar matching where you stopped.
- AC-2: Watching S2 E5 of a show shows "S2 · E5" and that episode's progress in Continue Watching.
- AC-3: The details page of a watched title shows Resume with the episode and time left; pressing it opens the player at that episode and second.
- AC-4: Progress follows the account to another browser or device.
- AC-5: Finishing a movie (or within 90 s of the end) clears its progress.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect watch progress sync`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
