# Verify: Watch Together · spec 0005 · updated 2026-10-20
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Setup
- [ ] Firestore rules for `watch_rooms` and its `messages` subcollection are in place (see the rules in the /develop report)

## UI / manual (two signed in accounts, two desktop browsers A = host, B = guest)
- [x] Signed out: the people icon in the player says "Sign in to watch together" → AC-1 (checked 2026-10-20)
- [x] Signed out: opening `/together/<id>` shows the invite screen with "Sign in to join" → AC-2 (checked 2026-10-20)
- [ ] A plays a title, presses the people icon: a toast says the invite link is copied, and the side sheet shows the link, A as host (crown), and an empty chat → AC-1
- [ ] B opens the link: the player starts on the same title and episode within a few seconds of A's time; both member lists show 2 → AC-2, AC-4
- [ ] A pauses: B pauses within about 2 s. A plays: B plays → AC-3
- [ ] A seeks forward 10 minutes: B jumps there within about 2 s → AC-3
- [ ] Show: A switches episode: B loads the same episode → AC-3
- [ ] B presses pause, seek or another episode: a toast says only the host controls playback, nothing changes → AC-5
- [ ] Chat: a message from either side appears for both → AC-4
- [ ] B presses Leave room: B's player keeps going on its own, and A's member list drops to 1 within a minute → AC-5
- [ ] A closes the player: B sees "left. You are watching on your own now" → spec assumption
- [ ] Phone guest: opens the link, sees frameXTV's own player; "Sync now" in the sheet reloads at the host's second → spec assumption
- [ ] An unknown room id: "This room does not exist" → AC-2

## Control switch (added 2026-10-20)
- [ ] A new room starts in host only mode: B's play, pause, skip and episode buttons show "The host controls playback in this room" and nothing moves → spec 0005 addendum
- [ ] A (host) turns on "Let everyone control playback" in the room sheet; B's sheet text changes to "lets everyone control" within a second → addendum
- [ ] B pauses: A pauses within about 2 s and sees a toast "B paused"; B skips 10 minutes: A jumps there; B picks another episode: A loads it from the start → addendum
- [ ] A and B press pause and play quickly in turn: both end in the same state, with no back and forth loop → addendum
- [ ] A turns the switch off: B is held again → addendum
- [ ] Only the host sees the switch; B can not change `control` (the Firestore rule refuses it) → addendum

## Commands
- [ ] `npm run build` → succeeds

## Acceptance-criteria coverage
- AC-1 … start a room · AC-2 … join by link · AC-3 … play, pause, seek, episode · AC-4 … members and chat · AC-5 … guest lock and leave
