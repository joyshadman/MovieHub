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

# Verify: Watch Together (lobby delta) · spec 0005 · updated 2026-10-20
_Steps derived from spec 0005 AC-1 to AC-14 after ratification. They replace the first build steps above where they differ (no lobby, `hostLeft`). `/check verify` runs these; `/test` locks the durable ones._

## Setup
- [ ] The `watch_rooms` rules from the /develop report are published together with this code (keep a copy of the old rules first) → AC-13
- [ ] Three signed in accounts: A (host, desktop), B (guest, desktop), C (guest, any); one phone account P for AC-8

## UI / manual
- [ ] A plays a title, presses the people button: link copied, sheet shows A as host and "1 of 10 seats" → AC-1
- [ ] Signed out, open the link → "Sign in to join" → AC-2
- [ ] B opens the link → waiting screen with the poster, A's name, "Waiting for A to let you in", Cancel; nothing plays → AC-2
- [ ] A (sheet closed) gets a toast "B wants to join" with Let in and Deny, and a yellow count badge on the people button → AC-3
- [ ] A presses Let in → B's player opens on the same title, episode and server within a few seconds of A's second → AC-3
- [ ] B refreshes → back in the player with no waiting screen → AC-4
- [ ] C knocks, A presses Deny → C sees "The host did not let you in"; C refreshes → same screen, no new knock in `pending` → AC-4
- [ ] With 10 in `members`, an 11th person opens the link → "This room is full" → AC-5
- [ ] A pauses, plays, skips 10 minutes, changes episode → B follows each within about 2 s → AC-6
- [ ] A switches server in settings → B switches to the same server at the room's second → AC-6
- [ ] Host mode: B presses pause, seek, episode or a server → held with "The host controls playback in this room" → AC-7
- [ ] A turns on "Let everyone control": B pauses → A pauses and sees "B paused"; B switches server → A follows → AC-7
- [ ] P (phone) is let in: Sync now reloads at the room's second; A changes episode → P reloads into it; A switches server → P reloads on it (or keeps its own with a note, if that server can not play on phones) → AC-8
- [ ] A presses End for me → B's sheet says "A is away. You are watching on your own" at once (host mode) → AC-9
- [ ] Everyone mode, A away → B and C still drive and follow each other → AC-9
- [ ] A opens the link again → away clears, A's player opens at the room's last spot, B snaps back to A → AC-9
- [ ] Kill A's tab (no clean close) → B sees A as away within about 150 s → AC-9
- [ ] A removes B (minus icon by B's name) → B drops to "You were removed from this room"; B can not knock again; seat count drops by one → AC-10
- [ ] A presses End room for everyone, then confirms → B and C see "The host ended the room" and keep watching on their own; opening the link now shows "This room has ended" → AC-11
- [ ] Chat between A and B shows for both, with the last 100 kept; the members list shows who is here now → AC-12

## Tamper (browser console as B, an approved guest, in host mode)
- [ ] `updateDoc(roomRef, {control: 'everyone'})` → refused → AC-13
- [ ] Add C to `members`, or remove `blocked.<C>`, or edit `members.<A>.lastSeen` → refused → AC-13
- [ ] Write `playing`, `position` or `server` in host mode → refused; in everyone mode → allowed, but `lastAction.uid` set to A's uid → refused → AC-13
- [ ] As C (denied), add `pending.<C>` again → refused; as an outsider, add `pending.<someone else>` → refused → AC-13
- [ ] As an outsider, read `messages` → refused; `getDocs(collection(db,'watch_rooms'))` (a list) → refused → AC-12, AC-13
- [ ] As an outsider of an ended room, knock → refused → AC-11, AC-13

## Commands
- [x] `npm run build` → succeeds (checked 2026-10-20, /check verify)
- [ ] Firebase console, Usage tab: a 2 hour room of 4 adds about 600 to 800 document writes → AC-14

## Value sourcing
- [ ] Waiting screen: poster, title and host name come from the room doc (change `hostName` in the console, the screen updates) → AC-2
- [ ] Which screen: as a member of an ended room you stay in the player; as an outsider you see "has ended"; blocked beats pending → AC-4, AC-11
- [ ] Knock list and badge count follow `pending` (handle a knock on a second device, the toast here closes) → AC-3
- [ ] Join second: set B's device clock 5 minutes wrong, join while A plays → B still starts within a few seconds of A (first snapshot age capped at 35 s, then the follow loop corrects) → AC-3, AC-6
- [ ] Follow clock: while A plays, B's presence beat lands between A's 30 s beats → B does not jump backwards → AC-6
- [ ] Host returns: A's player opens at the room's position, not A's own resume point → AC-9
- [ ] Host away: `hostAway` true, or A's `lastSeen` older than 150 s → AC-9
- [ ] Here now: a member silent for over 150 s shows greyed → AC-12
- [ ] Room closed: set `activeAt` to 13 h ago in the console → link shows "has ended", knock refused by rule → AC-11
- [ ] Who did what: the toast and the "Last:" line read `lastAction.name` and its verb, including "switched the server" → AC-7
- [ ] Room full: the count is the keys of `members`, host included → AC-5
- [ ] Phone Sync now: reloads at the room's second (same formula) → AC-8
- [ ] Chat: last 100 by `createdAt` → AC-12

## Acceptance-criteria coverage
- AC-1 start step · AC-2 sign in and waiting steps · AC-3 toast, badge, let in, join second · AC-4 refresh and deny steps · AC-5 full step · AC-6 sync and server steps · AC-7 control mode steps · AC-8 phone step · AC-9 away, everyone mode, return, crash · AC-10 remove step · AC-11 end and idle · AC-12 chat and members, chat tamper · AC-13 tamper section · AC-14 usage tab and the 604 write model check
