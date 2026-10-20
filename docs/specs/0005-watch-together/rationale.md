# 0005 · Watch Together: decision record

The reasoning behind [index.md](index.md). `/develop` builds from the index and skips this file.

## Context

> ⚠️ Premise note: the project is on Firebase Spark, where 20,000 Firestore writes a day are shared by the whole site (watch history, My List, the AI counter, and these rooms). A watch party is the most write heavy feature on the site because it keeps writing for the length of a movie. So the write rate per room is a design input, not a tuning detail. The design below budgets about 800 writes for a 2 hour room of 4, which still means roughly 20 such rooms would use most of a day's allowance. If rooms become popular, the right fix is moving to Blaze (pay as you go; the same free allowance, then a small per write cost), not squeezing the heartbeats further.

MovieHub shipped Watch Together under an assumed spec during `/develop`. One Firestore doc per room holds playback state and members, with chat in a subcollection. The host or, when the host allows it, everyone drives play, pause, seek and episode. Followers correct themselves from the time a snapshot arrived, not from another device's clock. Desktop uses our own controls on the frameXTV iframe (driven by postMessage), and phones use frameXTV's own player with a Sync now button.

Reading the built code showed real gaps. A host refresh ends the room for good: leaving sets `hostLeft: true` and nothing clears it. Anyone with the link joins with no say from the host, and there is no cap on room size. Backup servers report no playback time, so a member on a different server is silently out of sync. Rooms never end. And the heartbeats (host position every 8 s, members every 20 s) cost about 2,300 writes for a 2 hour room of 4, about a ninth of the site's free daily writes for one evening.

The engineer wants the host to approve each guest, a cap of 10, the server shared by the room, and the host able to return after leaving. They also want the room to close after 12 hours idle or when the host ends it, and everything to fit the free plan. Not deciding means the room keeps breaking on a refresh, and its cost grows with every member.

## Options considered

### Option 1: Fix in place on Firestore, with a host lobby and fewer writes

Keep the one doc per room model. Add `pending`, `blocked`, `server`, `hostAway`, `activeAt` and `endedAt` to it. Merge the presence and position beats into one write and slow them to 60 s and 30 s. Enforce roles and the cap of 10 in Firestore rules using map key diffs.

**Pros**:
- Reuses the working sync engine, service and UI; the delta is a few fields and screens.
- One database, one rules file, and one listener per member (the lobby lives on the doc everyone already watches).
- The rules can enforce the cap and every role exactly, because all the state sits on one doc.

**Cons**:
- Presence is a heartbeat, so a crashed tab shows as gone only after about 150 s.
- Each beat is still a counted write on Spark.
- The rules get long (five kinds of writer on one doc), so they need careful testing.

### Option 2: Firestore for the room and chat, Realtime Database for presence

Move "who is here" to Firebase Realtime Database, whose `onDisconnect` hook removes a closed or crashed tab within seconds and whose writes are not counted per operation on Spark.

**Pros**:
- Instant, accurate leave detection, including the host's.
- Removes most of the counted Firestore writes (the member beats).

**Cons**:
- A second database with its own rules language, console setup and connection limit (100 simultaneous connections on Spark).
- Room state is split across two stores, so a member's "approved" and "here" facts live in different places, and the rules can not see both.

### Option 3: All live state in Realtime Database

Room, playback, presence and chat all move to Realtime Database; Firestore keeps nothing for rooms.

**Pros**:
- The cheapest per room on Spark, and the lowest latency for playback updates.
- Presence comes built in.

**Cons**:
- Rewrites the built service and hooks: a big bang change to working code.
- Splits the app's data across two databases for one feature, a new pattern for the whole team to learn.

### Option 4: A hosted real time service

Use a third party room and presence service (a managed WebSocket or collaboration platform) for playback and presence.

**Pros**:
- Purpose built presence, broadcast and history, with good latency.

**Cons**:
- A new vendor, account, secret and free tier to watch, for a feature Firebase already covers.
- It needs a server or token endpoint to authorise users against Firebase Auth.

## Rationale

The forces are a working build, a free plan with a shared write budget, a small team, and five behavior gaps that are all about rules and state, not about transport speed. Option 1 fixes every gap where the state already lives. Keeping the lobby, the cap and the roles on one doc is what lets Firestore rules enforce them exactly: a rule can count `members` and diff map keys on the same document it guards. Option 2's split would put "approved" and "here" in two databases that can not check each other.

The write budget is met by cadence, not transport. Merging presence into the host's position write, and slowing members to one beat a minute, brings a 2 hour room of 4 from about 2,300 writes to about 750: the host writes about 240 (one every 30 s while playing), and 3 guests write about 120 each. The cost is slower crash detection (150 s). The engineer accepted that for a single database. Realtime Database presence (Option 2) is the natural next step if instant presence or Blaze ever matters, and it is recorded as a follow up rather than built now.

The host lobby was the engineer's call over "anyone with the link". It adds one wait per guest, but it keeps a forwarded link from bringing strangers in, and it makes removing someone meaningful. Approval sticks, so a guest's refresh never sends them back to the lobby. The room doc stays readable by any signed in user who has the link, because a knocking guest must see the title, the host and their own state. That was the engineer's pick over "members and knockers only", which would blank out the waiting screen. Listing is refused, so the unguessable id still keeps rooms private in practice.

Choices made in the design without asking (recommended, each with its runner up): a 150 s presence window (runner up 120 s, too tight against a 60 s beat on a slow tab); a guest's leave writes nothing (runner up: a `left` flag, one more write that adds nothing a stale `lastSeen` does not already show); a returning host opens at the room's second (engineer's pick); missing `activeAt` means closed, so old test rooms need no migration (runner up: a one off backfill, not worth it for test data); and phones follow server changes by reloading with the new `provider` (runner up: show a notice only, which would leave phone guests out of sync silently).
