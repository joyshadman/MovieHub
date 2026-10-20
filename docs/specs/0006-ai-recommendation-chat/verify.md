# Verify: AI movie and series recommendation chat · spec 0006 · updated 2026-10-20
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Setup
- [ ] `.env` (local) and Vercel project env (live) have `OPENROUTER_API_KEY` (no `VITE_` prefix); optional `OPENROUTER_MODEL`
- [ ] Firestore rule for `ai_usage/{uid}` is published (see the /develop report)

## UI / manual
- [x] Signed out: "Ask AI" opens a panel with a sign in prompt, on desktop and phone → AC-5 (checked 2026-10-20 in Brave)
- [x] Escape closes the panel; the button sits above the phone tab bar → UI (checked 2026-10-20)
- [ ] Signed in: header says "10 of 10 messages left today" on a fresh day → AC-3
- [ ] Ask "a mind bending sci fi movie": a short reply plus up to 6 cards with poster, year, type and a reason; a card opens the right details page → AC-1
- [ ] Ask "help me with my homework": a polite one line refusal pointing back to movies, no cards → AC-2
- [ ] With some watch history and My List items, ask "something for me": picks relate to them and skip what you already watched → AC-6
- [ ] Send 10 messages: the count drops each time; the 11th is refused with "used all 10 AI messages for today", and the input is disabled → AC-3
- [ ] Firestore `ai_usage/{uid}` shows `day` = today's UTC day number and `count` = 10 → AC-3
- [ ] From the browser console, try `setDoc(doc(db,'ai_usage',uid), {day, count: 0})`: Firestore refuses it → AC-3
- [ ] Next UTC day: the counter is back to 10 → AC-3
- [ ] DevTools Network while chatting: requests go only to `/api/recommend`; nothing contains the OpenRouter key; search the built `dist/assets` for `OPENROUTER` → no match → AC-4

## Commands
- [x] `node api-test.mjs` (scratchpad harness, fake Firestore and OpenRouter): 18 of 18 pass (limit, reset, no count on AI failure, rules refusal, 401 paths, injection guard) → AC-3, AC-5 (2026-10-20)
- [x] `npm run build`, then search `dist/assets/*.js` for `OPENROUTER` / `openrouter.ai` → none → AC-4 (2026-10-20)
- [ ] `curl -X POST <site>/api/recommend -d '{}'` without a token → 401 → AC-5

## Value sourcing
- [ ] Messages left = `10 - count` when `ai_usage.day` equals today's UTC day, else 10; check just before and after 00:00 UTC → AC-3
- [ ] Picks = model titles matched through TMDB search by type and year (±1); a made up title shows no card → AC-1

## Acceptance-criteria coverage
- AC-1 … picks and cards · AC-2 … off topic · AC-3 … limit, reset, tamper · AC-4 … key never in browser · AC-5 … signed out and no token · AC-6 … taste from history and My List

# Verify: AI recommendation chat (free only delta) · spec 0006 · updated 2026-10-20
_Steps derived from spec 0006 AC-1 to AC-12 after the free only rebuild. They replace the first build steps above (10 messages, paid fallback). `/check verify` runs these; `/test` locks the durable ones._

## Setup
- [ ] The three Firestore rule blocks from the /develop report (`config/{doc}`, `ai_usage/{uid}`, `ai_chats/{uid}`) are published in the Firebase console → AC-4, AC-6, AC-9
- [ ] `OPENROUTER_API_KEY` is set in `.env` and in Vercel; `OPENROUTER_MODEL` is removed; `OPENROUTER_MODELS` is unset or lists only `:free` ids → AC-7, AC-10

## UI / manual
- [ ] Signed in, open Ask AI, send "a mind bending sci fi movie" → short reply plus up to 6 cards; open one, it goes to `/movie/<id>` or `/tv/<id>` → AC-1
- [ ] Refresh the page, open Ask AI → the same chat is still there; open it on a second device or browser with the same account → same chat → AC-9
- [ ] Ask "write me a python script" → one line refusal pointing back to movies and shows, no cards → AC-2
- [ ] Ask "something for me" with a few titles in history and My List → picks fit that taste and skip titles already watched → AC-12
- [ ] As a normal user with the limit at 5, send 5 messages → header counts 4, 3, 2, 1, 0 left; the 6th is refused with "used all 5 ... midnight UTC" and the input disables → AC-3
- [ ] As the owner, send 8 messages → all answer, header says "Unlimited", no `ai_usage/<owner uid>` doc appears → AC-5
- [ ] On `/admin`, set "AI messages per user per day" to 2 → a user at count 2 is blocked at once (counter shows 0 of 2); set it to 6 → they can send again without a refresh → AC-6
- [ ] On `/admin`, type 0 or 51 → Save stays disabled with "Pick a whole number from 1 to 50" → AC-6
- [ ] Send messages until the chat passes 50 entries → `ai_chats/<uid>.messages` stays at 50, oldest gone → AC-9
- [ ] Press the bin icon, then Cancel → chat stays; press it again, then Clear chat → chat empties here and on the other device, `ai_chats/<uid>` is deleted → AC-9
- [ ] Signed out, open Ask AI → sign in prompt only, no input → AC-11
- [ ] Network tab: the only AI request goes to `/api/recommend`; no request or bundle contains the key → AC-10
- [ ] A failed answer (busy) shows in the chat, disappears after a refresh, and does not change the counter → AC-8, AC-9

## Commands
- [ ] `curl -X POST <site>/api/recommend -H "Content-Type: application/json" -d "{}"` → 401 → AC-11
- [ ] Same with `-H "Authorization: Bearer x.eyJ1c2VyX2lkIjoieCJ9.y"` (forged) → 401 → AC-11
- [ ] Set `OPENROUTER_MODELS=openai/gpt-4o-mini,a/b:free` locally, send a message, check the server log or a request proxy → only `a/b:free` is sent → AC-7
- [ ] With all free models rate limited (or a fake id like `x/none:free` only) → reply "MovieHub AI is busy, try again in a minute", `ai_usage` count unchanged → AC-8
- [ ] When OpenRouter returns its `free-models-per-day` error → reply "MovieHub AI is resting for today", count unchanged → AC-8
- [ ] `grep -ri openrouter dist/` after `npm run build` → no matches → AC-10

## Tamper (browser console, signed in as a normal user)
- [ ] `setDoc(doc(db,'ai_usage',uid), {day: today, count: 0})` → refused → AC-4
- [ ] Write `count: current + 2` → refused; write `day: today - 1` → refused; add an extra field → refused → AC-4
- [ ] Write `count: limit + 1` (current = limit) → refused → AC-4
- [ ] Write `config/site` with `aiDailyLimit: 999` as a normal user → refused; as the owner with `aiDailyLimit: 999` → refused; with `7` → allowed → AC-6
- [ ] Read or write another user's `ai_chats/<other uid>` → refused; write own doc with 51 messages → refused → AC-9

## Value sourcing
- [ ] today: check just before and after 00:00 UTC (not local midnight) → the count resets at UTC midnight on both server and rule → AC-3
- [ ] the user's limit: delete `aiDailyLimit` from `config/site` → server and counter both use 5 → AC-3, AC-6
- [ ] used today: an `ai_usage` doc with yesterday's `day` and count 5 → user starts at 5 left → AC-3
- [ ] uid and email: a token for another email can not get the owner exemption; an expired token gets 401 → AC-5, AC-11
- [ ] owner exemption: owner email signs in with Google (verified) → Unlimited → AC-5
- [ ] models tried: unset `OPENROUTER_MODELS` → request lists the nemotron, minimax, laguna `:free` chain in that order → AC-7
- [ ] taste: empty history and My List → still answers; full lists → only the first 15 of each sent → AC-12
- [ ] cards: a pick with the wrong year by 1 still matches; a made up title is dropped (fewer cards, no blank card) → AC-1
- [ ] "N of M left today": M follows `config/site.aiDailyLimit` live; owner shows Unlimited → AC-3, AC-5
- [ ] saved history and message time: messages appear in `at` order across two tabs sending at once, none lost → AC-9
- [ ] Admin limit field: shows the live `config/site.aiDailyLimit` and follows a change made in another tab → AC-6

## Acceptance-criteria coverage
- AC-1 card step, cards value step · AC-2 refusal step · AC-3 limit, UTC reset, default steps · AC-4 tamper steps · AC-5 owner steps · AC-6 admin, rule, limit value steps · AC-7 free only commands · AC-8 busy, resting, failed message steps · AC-9 refresh, 50 cap, clear, tamper on chats · AC-10 network, dist grep · AC-11 signed out, curl · AC-12 taste steps
