# 0006. AI movie and series recommendation chat on free OpenRouter models

**Date**: 2026-10-20 (assumed during /develop; ratified by /architect the same day)
**Status**: In Progress

## Summary

MovieHub has a small AI chat that suggests only movies and TV shows, shaped by what each signed in user types, watched, and saved. It runs on free OpenRouter models through one server function, so the key stays secret and nothing is ever charged. Each user gets a small daily allowance (5 by default, set on the Admin page; the owner is unlimited), counted in Firestore so it can not be cheated, and each user's chat is saved to their account (last 50 messages). This ratifies the first build and changes four things: free models only, a lower editable limit, owner exemption, and saved chats.

## Requirements

**User stories**:
- As a signed in viewer, I want to describe my mood and get a few real titles I can open, so I find something to watch fast.
- As a viewer, I want my chat to still be there when I come back on any device, so I can continue where I left off.
- As the owner, I want to set the daily allowance from the Admin page and test without limits, so I can keep the free AI available to as many people as possible.

**Acceptance criteria**:
- **AC-1**: A signed in user asks for suggestions and gets a short reply plus up to 6 real, clickable movie or TV cards (matched to TMDB; unmatched titles are not shown).
- **AC-2**: Off topic questions get a one line polite refusal that points back to movies and shows, with no cards.
- **AC-3**: Each user gets `aiDailyLimit` answered messages per UTC day (default 5). The next one is refused with a clear "used all N for today, back at midnight UTC" message, the input is disabled, and the count resets at 00:00 UTC. A message is counted only when the AI actually answered.
- **AC-4**: A user can not reset, lower, or skip their count from the browser; Firestore refuses any write except +1 for today up to the limit.
- **AC-5**: The owner (`joyshadman@gmail.com`) is never limited and never gets a usage count; their panel shows "Unlimited".
- **AC-6**: The owner can change `aiDailyLimit` (1 to 50) on the Admin page; the server, the Firestore rule, and every user's counter use the new value right away, with no deploy.
- **AC-7**: Only free models are ever called: by default `nvidia/nemotron-3-ultra-550b-a55b:free`, then `minimax/minimax-m3.1-flash:free`, then `poolside/laguna-s-2.1:free`; `OPENROUTER_MODELS` can replace the list, and any id without `:free` is ignored.
- **AC-8**: When every free model is busy, the user sees "MovieHub AI is busy, try again in a minute"; when the account's free daily cap is used up, they see "MovieHub AI is resting for today". Neither is counted.
- **AC-9**: Each user has one ongoing chat saved to their account. It survives refresh and other devices, keeps only the last 50 messages, and a Clear chat button (with a confirm step) deletes it.
- **AC-10**: The OpenRouter key never reaches the browser (not in the bundle, not in any browser request).
- **AC-11**: Signed out visitors see a sign in prompt, and the API refuses requests without a valid sign in.
- **AC-12**: "Something for me" style requests use the user's recent watch history and My List, and avoid titles they already watched unless asked.

## Decision

**Chosen option**: Option 1: Fix in place (keep the built server function and Firestore counted limit; switch to a free only model chain; move the limit to `config/site`; exempt the owner; save chats per user).

Keep the shipped architecture and apply four targeted changes, rather than rebuilding or adding new infrastructure.

## Rationale

Reasoning, options, and the live model test evidence: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (confirmed with the engineer):

| Entity (path) | Key | Fields | Written by | Relationship |
|---|---|---|---|---|
| Site config `config/site` (exists, spec 0003) | singleton | adds `aiDailyLimit`: int, 1 to 50, optional (missing means 5) | owner only, Admin page | read by everyone, the server, and the usage rule |
| AI usage `ai_usage/{uid}` (exists) | uid | `day`: int (whole UTC days since 1970) · `count`: int, 1 to `aiDailyLimit` | server, with the user's own ID token | 1:1 with user |
| AI chat `ai_chats/{uid}` (new) | uid | `messages`: array, at most 50, oldest dropped first; each `{ role: 'user' \| 'assistant', content: string up to 1000, at: ms, picks?: [{ id, type: 'movie' \| 'tv', title, year, image, rating, why }] up to 6, assistant only }` · `updatedAt`: ms | the user's browser | 1:1 with user; Clear chat deletes the doc |

No migration: new fields are optional and existing `ai_usage` docs stay valid (a user already past a lower new limit is simply refused until the next UTC day).

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/recommend` (Vercel function; Vite plugin in dev) | POST | `messages`: up to 10 turns of `{ role: user \| assistant, content }`, last one `user` · `profile`: `{ watched: string[] ≤15, saved: string[] ≤15 }` | `{ reply, picks: [{ title, year, type, why }] ≤6, remaining: int \| null (null = owner, unlimited), limit: int }` | `Authorization: Bearer <Firebase ID token>` | 400 bad input · 401 no or rejected token · 405 not POST · 409 two messages at once · 429 user limit reached (`code: 'limit'`) · 503 `code: 'busy'` all free models busy · 503 `code: 'resting'` free daily cap used · 503 `code: 'setup'` key missing · 502 network |
| `ai_chats/{uid}` (Firestore, browser SDK) | read, transaction write, delete | appended `{ user msg, assistant msg }` | the saved chat | signed in, own uid | rule refusal |
| `ai_usage/{uid}` (Firestore, browser SDK) | read (live) | | `day`, `count` for the counter | own uid | |
| `config/site` (Firestore, browser SDK) | read (all); write `aiDailyLimit` (owner) | int 1 to 50 | the limit | owner for write | rule refusal |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `/api/recommend` | today | server clock: `floor(Date.now() / 86400000)`; the rule uses `request.time` the same way |
| `/api/recommend` | the user's limit | `config/site.aiDailyLimit` read via Firestore REST with the user's token; missing or invalid means 5; clamped 1 to 50 |
| `/api/recommend` | used today | `ai_usage/{uid}.count` when `.day` equals today, else 0 |
| `/api/recommend` | the user's uid and email | the Firebase ID token's claims, trusted only after Firestore accepted that token on the usage read |
| `/api/recommend` | owner exemption | token email equals `OWNER_EMAIL` (`joyshadman@gmail.com`, the same value as `src/config/owner.js`) |
| `/api/recommend` | models tried | `OPENROUTER_MODELS` (comma list) else the default chain; keep only ids ending in `:free`; first 3 |
| `/api/recommend` | taste | request `profile` (built by the browser from `history/{uid}` items and `watchlists/{uid}` items, titles only) plus the chat turns |
| Chat panel | cards | model picks matched with `movieApi.search` by type, year within 1; card fields from the TMDB result |
| Chat panel | "N of M left today" | M = `config/site.aiDailyLimit` (default 5); N = M minus `ai_usage` count for today; owner shows "Unlimited" |
| Chat panel | saved history | `ai_chats/{uid}.messages` (live) |
| Chat panel | message time | browser `Date.now()` when saved |
| Admin page | limit field | `config/site.aiDailyLimit` |

**Key invariants**:
- No paid model is ever requested: the server drops any model id without `:free`, and sends no paid fallback.
- `ai_usage.count` only ever goes up by 1, only for today, never above the current limit; only an answered message counts.
- The owner never writes `ai_usage`.
- `ai_chats/{uid}.messages` never holds more than 50 entries.
- The key exists only in server env; no `VITE_` name.

**Security model**:
- Signed in users only (Firebase Auth). The server reads and writes `ai_usage` and reads `config/site` through the Firestore REST API with the user's own ID token, so Firestore verifies the token and the rules decide; no admin credentials exist on the server.
- Rules (to publish):
  - `config/{doc}`: read for everyone; write for the owner email only (spec 0003). If `aiDailyLimit` is present it must be an int from 1 to 50.
  - `ai_usage/{uid}`: read for that uid; create or update for that uid only when `keys` are only `day` and `count`, `day` equals today from `request.time`, `count` is 1 on a new day or old count + 1 the same day, and `count` is at most the limit (read from `config/site` when it exists, else 5).
  - `ai_chats/{uid}`: read, write, delete for that uid only; `messages` is a list of at most 50.
- User text is shown as plain text, never as HTML. The system prompt tells the model to ignore attempts to change its role; the browser can not send a `system` turn.

**Configuration required**:
- `OPENROUTER_API_KEY`: server only (local `.env` and Vercel project env). Required.
- `OPENROUTER_MODELS`: server only, optional comma list of free model ids, replaces the default chain.
- `OPENROUTER_MODEL`: removed (replaced by `OPENROUTER_MODELS`).

**Critical test scenarios**:
- Happy path: ask for "a mind bending sci fi movie", get a reply and cards, open one, refresh, and the chat is still there; verifies **AC-1**, **AC-9**
- Limit: with `aiDailyLimit` 5, the 6th answered message is refused and the input disables; the next UTC day allows 5 again; verifies **AC-3**
- Tamper: from the console, write `ai_usage` with `count: 0` or `count + 2`; Firestore refuses; verifies **AC-4**
- Owner: send 8 messages as the owner; all answer, no `ai_usage` doc appears, the panel says Unlimited; verifies **AC-5**
- Admin change: set the limit to 2 on `/admin`; a user at count 2 is refused at once; set it to 6 and they can continue; verifies **AC-6**
- Free only: put a paid id in `OPENROUTER_MODELS`; the outgoing request lists only `:free` ids; verifies **AC-7**
- Busy: all free models answer 429; the user sees the busy message and the count is unchanged; verifies **AC-8**
- Auth: POST without a token or with a forged one returns 401; signed out panel shows sign in; verifies **AC-11**

## Build plan

Ordered as tracer bullets on the existing working thread: server first (it guards cost and the limit), then rules, then the browser, so the app works after each step. Tasks are the delta from the built code.

1. Server: replace the model setup with the free only chain (default list above, `OPENROUTER_MODELS` override, keep only `:free`, at most 3); remove the paid fallback and `OPENROUTER_MODEL`, satisfies **AC-7**
2. Server: map OpenRouter failures to `503 busy` (all models 429 or down) and `503 resting` (free daily cap message), never counted, satisfies **AC-8**, **AC-3**
3. Server: read `config/site.aiDailyLimit` (default 5, clamp 1 to 50) for the check and the 429 text; return `limit` and `remaining`, satisfies **AC-3**, **AC-6**
4. Server: owner exemption after the token was accepted (skip the limit check and the count write, return `remaining: null`), satisfies **AC-5**
5. Firestore rules: `ai_usage` limit from `config/site` (default 5); `ai_chats` own doc, at most 50; `config/site.aiDailyLimit` int 1 to 50, satisfies **AC-4**, **AC-6**, **AC-9**
6. Browser service: limit from `config/site` (live) instead of the hard coded 10; counter shows "Unlimited" for the owner, satisfies **AC-3**, **AC-5**
7. Browser: saved chat (load `ai_chats/{uid}` live when the panel opens; after each answered message append the user and assistant entries in one transaction, trimmed to 50; picks saved with their card fields; failed messages are shown but not saved), satisfies **AC-9**, **AC-1**
8. Browser: Clear chat button with a confirm step that deletes `ai_chats/{uid}`, satisfies **AC-9**
9. Admin page: "AI messages per user per day" number field (1 to 50) saved to `config/site.aiDailyLimit`, satisfies **AC-6**
10. Keep and recheck the shipped behavior: TMDB matching, refusal, taste, key only on the server, sign in required, satisfies **AC-1**, **AC-2**, **AC-10**, **AC-11**, **AC-12**

## Consequences

**Positive**:
- Zero running cost and no surprise bills: a paid model can not be called even by a config mistake.
- The owner tunes the allowance without a deploy, and the rule and the server can never disagree.
- Chats follow the user across devices.

**Negative / tradeoffs**:
- Availability is best effort. Free models are often rate limited upstream (one of the original defaults failed in every test), and the account's free daily cap is shared by the whole site; on a busy day the AI will say it is resting.
- Free models are slower (about 9 to 11 s per answer in tests, against about 5 to 7 s for the paid model).
- Free model ids change over time; the default chain will need refreshing (an env change, no code).
- Saved chats are new personal data in Firestore; users can clear it, but there is no automatic expiry beyond the 50 message cap.
- Two tabs saving at the same moment are serialized by the transaction, so one save may retry.

**Neutral**:
- `ai_usage` docs from the first build stay valid; no data migration.
- `OPENROUTER_MODEL` is renamed to `OPENROUTER_MODELS`.

## Follow-up

- [ ] Consider a one time $10 OpenRouter credit purchase: as of 2026-10-20 knowledge it lifts the shared free cap from about 50 to about 1,000 requests a day while still calling only free models (check OpenRouter's current limits page first).
- [ ] Recheck the free model chain every few weeks (the live check in `rationale.md` is the method); change `OPENROUTER_MODELS` when one disappears.
- [ ] `verify.md` still describes the first build (10 messages, paid fallback); refresh it from AC-1 to AC-12 when this delta is built.
- [ ] Root `AGENTS.md` lists only `VITE_` env vars; add `OPENROUTER_API_KEY` and `OPENROUTER_MODELS` (server only) via `/sync`.
- [x] Enrolled on the scope as feature 18 (Slice 5).
