# 0005 · Watch Together: synced rooms on Firestore with a host lobby

**Date**: 2026-10-20 (assumed during /develop; ratified by /architect the same day)
**Status**: In Progress

## Summary

Signed in friends can watch the same movie or episode in sync from a shared link, with a members list and chat beside the player. Everything runs on the Firestore database the site already uses, with no new service. This ratifies the first build, which was built on assumptions, and changes five things. The host now lets each guest in from a lobby. A room holds at most 10 people. The whole room follows one server. A host who refreshes no longer ends the room. Rooms close after 12 hours with no activity, or when the host ends them. Heartbeats are slowed so a room fits the free Spark plan's daily write allowance.

## Requirements

**User stories**:
- As a host, I want to start a room from the player and share a link, so my friends watch the same thing with me at the same second.
- As a host, I want to let each person in myself, so a forwarded link does not bring strangers into my room.
- As a guest, I want playback, the episode and the server to follow the room on their own, so I never fiddle to stay in sync.
- As a host, I want a refresh or a dropped connection not to end the room, so one glitch does not send everyone home.
- As a member, I want to see who is here and chat, so it feels like watching on one couch.

**Acceptance criteria**:
- **AC-1**: A signed in user can start a room from the player (the people button) and copy an invite link. The room starts in "host controls" mode on the host's title, episode, server and second.
- **AC-2**: A signed out visitor opening the link sees "Sign in to join". A signed in, never approved visitor sees a waiting screen with the title's poster, the host's name and "Waiting for <host> to let you in", plus a Cancel button. Nothing plays while waiting.
- **AC-3**: When someone knocks, the host gets a toast with Let in and Deny, and a count badge on the people button until every knock is handled, even with the room sheet closed. On Let in, the guest's player opens on the room's title, episode and server at the room's second within a few seconds.
- **AC-4**: Approval sticks for the life of the room: an approved person who refreshes or reopens the link rejoins without waiting. A denied person sees "The host did not let you in" and can not knock again in that room.
- **AC-5**: A room holds at most 10 approved people, host included. An 11th knock is refused with "This room is full", and Firestore refuses it too.
- **AC-6**: On desktop (our own controls on frameXTV), a play, pause, seek, episode change or server change by someone allowed to control reaches every other member within about 2 s. Members correct only when more than 3 s off.
- **AC-7**: In "host controls" mode only the host's actions move the room. A guest's play, pause, seek, episode or server action is held, with "The host controls playback in this room". In "everyone controls" mode any member's action moves the room, and the others see a toast saying who did what ("Sara paused"). Only the host can flip the mode.
- **AC-8**: Phone guests (frameXTV's own player) get a "Sync now" button that reloads at the room's second. Episode and server changes reload the phone player automatically.
- **AC-9**: When the host closes the player or presses End for me, the room shows the host as away at once. When the host's tab crashes or loses its connection, it shows within about 150 s. While the host is away: in "host controls" mode every member watches on their own with a notice, and in "everyone controls" mode members keep syncing with each other. Knocks wait. When the host opens the link again, the away state clears, the host's player opens at the room's last spot, and everyone follows the host again.
- **AC-10**: The host can remove an approved member. That person drops to "You were removed from this room", can not knock again, and their seat frees up.
- **AC-11**: The host can End room for everyone. Every member then sees "The host ended the room" and keeps watching on their own. A room with no playback change and no member heartbeat for 12 h is closed. Opening the link of an ended or closed room shows "This room has ended" and allows no knock and no join.
- **AC-12**: The members list (with who is here now) and chat update live for every approved member. Chat shows the last 100 messages. Only approved members can read or send chat.
- **AC-13**: Nobody can list or search rooms. Each person can change only what their role allows (see the Security model). Every tamper attempt from the browser console is refused by Firestore.
- **AC-14**: A 2 hour room of 4 people writes about 800 Firestore documents or fewer (the built version wrote about 2,300), so normal use fits Spark's 20,000 writes a day.

## Decision

**Chosen option**: Option 1: Fix in place on Firestore, with a host lobby and fewer writes.

Keep the built Firestore room (one doc per room, chat in a subcollection, receive time based sync, host or everyone control). Add the lobby, the cap, the shared server and the room lifetime as fields on that same doc. Merge and slow the heartbeats.

## Rationale

Reasoning, options and the write budget math: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (confirmed with the engineer):

`watch_rooms/{roomId}` (Firestore auto id, can not be guessed; kept after the room ends, because Spark has no free cleanup):

| Field | Type | Required | Notes |
|---|---|---|---|
| `hostUid`, `hostName` | string | yes | set at create, never change |
| `title` | `{ id, type: 'movie' \| 'tv', title, poster_path, backdrop_path, first_air_date }` | yes | fixed for the room's life |
| `season`, `episode` | int | null for movies | |
| `server` | `{ sourceId: string, providerId: string \| null }` | yes | the server everyone plays on |
| `playing` | bool | yes | |
| `position` | number (seconds) | yes | where playback was at `updatedAt` |
| `updatedAt` | int ms | yes | last playback publish |
| `control` | `'host' \| 'everyone'` | yes, default `'host'` | host only |
| `lastAction` | `{ uid, name, action: 'play' \| 'pause' \| 'seek' \| 'episode' \| 'server', at }` | null until someone acts | shown as "who did what" |
| `members` | map uid → `{ name, photo \| null, joinedAt: int ms, lastSeen: int ms }` | yes, host always in it | **approved** people, 1 to 10; an entry stays when the person leaves, so approval sticks |
| `pending` | map uid → `{ name, photo \| null, at: int ms }` | yes, may be empty | the lobby |
| `blocked` | map uid → `{ name, at: int ms }` | yes, may be empty | denied or removed |
| `hostAway` | bool | yes, default false | **replaces `hostLeft`**; set on the host's explicit leave, cleared when the host returns |
| `activeAt` | int ms | yes | bumped by every playback publish and every member heartbeat (inside the same write, no extra cost) |
| `endedAt` | int ms | null while open | host pressed End room for everyone |
| `createdAt` | server timestamp | yes | |

`watch_rooms/{roomId}/messages/{messageId}` (1:N under the room, create only): `{ uid, name, photo | null, text: string 1 to 500, createdAt: server timestamp }`.

Relationships and constraints: a room has exactly 1 host (who is always in `members`) and 1 to 10 members. A uid appears in at most one of `members`, `pending`, `blocked` for a given room. A room has N messages, and members see the last 100.

**State transitions**:
- Room: `open` → `ended` (host presses End room, sets `endedAt`). `open` → `closed` (derived: `activeAt` older than 12 h). Ended and closed are final.
- Host presence: `here` ⇄ `away`. Away when `hostAway` is true, or the host's `members.lastSeen` is older than 150 s. Back when the host's join write clears `hostAway` and bumps `lastSeen`.
- A person in a room: `outsider` → `pending` (knock) → `member` (host lets in) or `blocked` (host denies). `pending` → `outsider` (Cancel). `member` → `blocked` (host removes). `blocked` is final for that room.
- Sync on a member's device: `syncing` while the room is open and (the host is here, or `control` is `'everyone'`). Otherwise `solo`.

**API surface** (all Firestore browser SDK calls from `src/services/watchTogether.js`; no server code):

| Action | Op | Who | Writes | Key errors |
|---|---|---|---|---|
| `createRoom` | add `watch_rooms` | signed in | full doc, host in `members`, empty `pending` and `blocked`, `control: 'host'`, `hostAway: false`, `endedAt: null`, `activeAt: now` | rule refusal |
| `getRoom` / `subscribeRoom` | get / listen one doc by id | signed in | none | not found → "This room does not exist" |
| `knock` | update | signed in outsider | `pending.{uid}` | full → "This room is full"; blocked, ended or closed → their screens |
| `cancelKnock` | update | the knocker | delete `pending.{uid}` | |
| `admit(uid)` | update | host | move `pending.{uid}` into `members.{uid}` (`joinedAt`, `lastSeen` = now) | full → toast "Room is full" |
| `deny(uid)` | update | host | move `pending.{uid}` into `blocked.{uid}` | |
| `removeMember(uid)` | update | host | move `members.{uid}` into `blocked.{uid}` (never the host) | |
| `rejoin` | update | approved member | `members.{uid}.lastSeen`, `activeAt`; for the host also `hostAway: false` | blocked → removed screen |
| `beat` | update | approved member | every 60 s: `members.{uid}.lastSeen`, `activeAt`. The host while playing and in step: every 30 s, also `position`, `playing`, `updatedAt` in the same write | |
| `publishState(action)` | update | whoever may control | `playing`, `position`, `season`, `episode`, `server`, `updatedAt`, `activeAt`, `lastAction` | held when not allowed (AC-7) |
| `setControl` | update | host | `control` | |
| `leaveRoom` | update | member | none for a guest (their `lastSeen` simply ages); the host sets `hostAway: true`, `playing: false` | |
| `endRoom` | update | host | `endedAt: now`, `playing: false` | |
| `subscribeMessages` | listen, last 100 by `createdAt` | approved member | none | |
| `sendMessage` | add message | approved member | `{ uid, name, photo, text, createdAt }` | |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Waiting screen | poster, title, host name | `title.poster_path`, `title.title`, `hostName` on the room doc |
| Every screen | which screen to show (invite, waiting, denied, removed, full, ended, player) | signed in state, then the viewer's uid in `blocked` / `members` / `pending`, then `endedAt`, then `activeAt` against 12 h, then `members` size against 10 |
| Host toast and badge | the knock list and its count | `pending` entries, oldest `at` first |
| Player on join | title, episode, server, start second | `title`, `season`, `episode`, `server`; start = `position + (now − receivedAt)` when `playing`, else `position` (`receivedAt` = when this device received the snapshot) |
| Follow loop | the room's second right now | same formula, run every 1 s; correct when more than 3 s off (`DRIFT_SEC`) |
| Host returns | where the host's player opens | the room's second (same formula), not the browser's resume point |
| Host away | away or here | `hostAway`, or `now − members[hostUid].lastSeen > 150 s` (local clock against a `lastSeen` written by the host's clock; a skew of a minute only shifts the 150 s window) |
| Here now | each member live or not | `now − lastSeen < 150 s` |
| Room closed | open or closed | `now − activeAt ≥ 12 h`; the rule checks the same against `request.time` |
| Who did what toast | name and verb | `lastAction.name`, `lastAction.action` |
| Room full | the count | number of keys in `members` (10 max, host included) |
| Phone Sync now | reload second | the room's second (same formula) |
| Chat | messages and times | `messages` subcollection, last 100 by `createdAt` |

**Key invariants**:
- `members` never holds more than 10 entries, and `hostUid` is always one of them.
- A uid is never in two of `members`, `pending`, `blocked` at once.
- Following never publishes: only a person's own action, or the host's in step heartbeat, writes playback. So members never bounce updates back and forth.
- Ended and closed rooms accept no knock, no join and no playback write.
- A guest's leave writes nothing. Their presence just ages out, so a crashed tab and a closed tab behave the same.

**Security model** (Firestore rules to publish; signed in users only):
- `watch_rooms/{roomId}`:
  - `get`: any signed in user (a knocking guest must see the title and their own state). **No `list`**, so rooms can not be listed or searched.
  - `create`: `hostUid == auth.uid`. `members` has only the host's key. `pending` and `blocked` are empty, `control == 'host'`, `hostAway == false`, `endedAt == null`.
  - `update` by the **host** (`auth.uid == resource.data.hostUid`): any field except `hostUid`, `title`, `createdAt`. `members.size() <= 10`, and the host's own key stays in `members`.
  - `update` by an **outsider** (not in `members`, `pending` or `blocked`), only while open (`endedAt == null` and `request.time` within 12 h of `activeAt`) and `members.size() < 10`: the only change is adding their own `pending.{uid}`.
  - `update` by a **knocker**: the only change is removing their own `pending.{uid}`.
  - `update` by an **approved member** (in `members`), only while open: changed keys limited to `members` (their own entry only, `lastSeen` only) and `activeAt`. When `control == 'everyone'`, also `playing`, `position`, `season`, `episode`, `server`, `updatedAt`, `lastAction`, where `lastAction.uid` must be their own. Never `control`, `hostUid`, `pending`, `blocked`, `hostAway`, `endedAt`.
  - A **blocked** user can not update at all.
  - Delete: nobody.
- `watch_rooms/{roomId}/messages/{id}`: read and create only for a uid in that room's `members` (rules `get()` the room). On create: `uid == auth.uid`, `text` is a string of 1 to 500 characters, `createdAt == request.time`. No update and no delete.
- Message text is rendered as plain text, never as HTML.

**Configuration required**: none (no new env vars). The Firestore rules above must be published in the Firebase console, at the same time as the code (see Migration plan).

**Critical test scenarios**:
- Happy path: A starts a room, B opens the link, waits, A lets B in, and B lands at A's second. A pauses and B pauses within 2 s. A switches server and B switches too. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-6**.
- Sticky approval: B refreshes and is back without waiting. C is denied, refreshes, and still sees "did not let you in". Verifies **AC-4**.
- Cap: with 10 members, an 11th knock is refused in the app and by the rule. Verifies **AC-5**.
- Host refresh: A refreshes mid movie. B sees "host away" and goes solo in host mode. A returns at the room's spot and B snaps back. In everyone mode B and C keep syncing while A is away. Verifies **AC-9**.
- Crash: kill A's tab. Within 150 s B sees the host as away. Verifies **AC-9**.
- Remove: A removes B. B sees the removed screen and can not knock or read chat. Verifies **AC-10**, **AC-12**.
- End and idle: A ends the room and everyone sees it ended. A room doc with `activeAt` 13 h old refuses a knock. Verifies **AC-11**.
- Tamper: from B's console, set `control`, add someone else to `members`, edit another member's entry, remove `blocked.{self}`, or write playback in host mode. All are refused. A list query on `watch_rooms` is refused. Verifies **AC-13**.
- Budget: count writes for a 2 hour, 4 person room (Firebase usage tab, or a counter in dev). The total is at most about 800. Verifies **AC-14**.
- Phone: a phone guest uses Sync now and lands at the room's second. The host changes the episode and the phone reloads into it. Verifies **AC-8**.

## Build plan

Tracer bullet on the working thread: each step keeps rooms usable, so the app works after every task. Tasks are the delta from the built code.

1. Service: new create fields (`server`, `pending`, `blocked`, `hostAway`, `activeAt`, `endedAt`). Merge each presence beat into one write (60 s for everyone, plus the host's 30 s position beat that also carries `lastSeen` and `activeAt`). Set `MEMBER_LIVE_MS` to 150 s. Make a guest's leave write nothing. Satisfies **AC-14**, **AC-9**.
2. Host away and return: replace `hostLeft` with `hostAway` (set on the host's explicit leave, cleared on the host's rejoin), derive away from the host's `lastSeen`, apply the syncing rule per mode, and open a returning host at the room's second. Satisfies **AC-9**.
3. Lobby, guest side: `TogetherRoom.jsx` works out which screen to show (invite, waiting, denied, removed, full, ended, player). Add `knock` and `cancelKnock`. The player mounts only once the viewer is in `members`. Satisfies **AC-2**, **AC-4**, **AC-5**, **AC-11**.
4. Lobby, host side: `admit` and `deny`, a toast with Let in and Deny per knock, a count badge on the people button, and a pending list in the sheet. Satisfies **AC-3**, **AC-4**, **AC-5**.
5. Remove member: a remove button by each member in the host's sheet, moving them to `blocked`. The removed person's view switches to the removed screen. Satisfies **AC-10**.
6. Shared server: publish `server` (action `'server'`) from the server switcher through `act`, so it is held like other actions per AC-7. Followers switch `sourceId` and `providerId`, and phones reload with the new server. Satisfies **AC-6**, **AC-7**, **AC-8**.
7. Room end: End room for everyone (host), the ended notice for members, and a closed check (12 h idle) on open and while subscribed. Satisfies **AC-11**.
8. Firestore rules: write and publish the rules in the Security model, together with the deploy of tasks 1 to 7. Satisfies **AC-5**, **AC-12**, **AC-13**.
9. Recheck the built behavior against the new code: start and copy link, the control switch and who did what toasts, chat and members, Sync now on phones. Satisfies **AC-1**, **AC-6**, **AC-7**, **AC-8**, **AC-12**.

## Migration plan

**Strategy**: no data migration. Ship the code and the rules together.
**Phases**:
1. Deploy tasks 1 to 7 and publish the task 8 rules in the same sitting. The old client deletes `members.{uid}` on leave and writes `hostLeft`, and the new rules refuse both, so mixing an old client with new rules would break leaving. Users with an old tab open get the new code on their next load.
2. Rooms created before this change have no `activeAt` and no `pending` or `blocked`. The client and the rules treat a missing `activeAt` as closed, so old test rooms simply show "This room has ended".
**Rollback**: revert the commit and publish the previous rules again (keep a copy of the current rules text before publishing).
**Risks**: forgetting to publish the rules leaves the lobby enforced only in the app. Publishing the rules before the deploy breaks leaving for a few minutes.

## Consequences

**Positive**:
- Strangers with a forwarded link can not get in, and the host stays in charge of the room.
- A host refresh or a dropped connection no longer kills the room.
- About a third of the writes, so many rooms a day fit the free plan.
- No new service, database or env var, and the room logic stays in one doc and one service file.

**Negative / tradeoffs**:
- Every guest now waits for the host once, and if the host is away, knocks wait too.
- Leaving and crashes are noticed slowly (up to 150 s) instead of at once, because presence is a heartbeat, not a live connection.
- Room data and chat stay in Firestore forever (no free cleanup on Spark), so storage grows slowly.
- Approved people who left still hold a seat. A full room of past guests needs the host to remove someone.
- The room doc is readable by any signed in user who has the link, member names included.
- Phones still can not be driven second by second. They rely on Sync now.
- The Spark write allowance is shared by the whole site. A very busy day of rooms could crowd out history and My List saves.

**Neutral**:
- `hostLeft` is renamed to `hostAway`. Old rooms read as ended.
- `lastAction.action` gains `'server'`.

## Follow-up

- [ ] Refresh `verify.md` from AC-1 to AC-14 when this delta is built (it still describes the first build).
- [x] Enrolled on the scope as feature 19 (Slice 5).
- [ ] If the site moves to Blaze, consider a Firestore TTL (time to live) policy on `watch_rooms.activeAt` to delete closed rooms, plus Realtime Database presence for instant leave detection.
- [ ] Spec 0003's `config` rule and spec 0006's rules live in the same rules file. Publish them together and keep one copy of the full rules text, so no publish drops another feature's rules.
