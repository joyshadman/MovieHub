# 0006. Rationale: AI recommendation chat

Decision record for [index.md](index.md). `/develop` does not read this file.

## Context

> ⚠️ Premise note: the engineer chose free models only on a free tier account with no credit. Free OpenRouter models are frequently rate limited upstream, and the account's free daily request cap is shared by the whole site, so this feature can only be best effort available; lowering the per user limit spreads the cap across more people but does not fix upstream outages. The honest framing is "a free, sometimes resting helper", and the cheapest real fix is a one time credit purchase that raises the free cap without spending anything (see Follow-up in index.md).

MovieHub (React on Vite, Firebase Auth and Firestore, hosted on Vercel, see `AGENTS.md`) shipped an AI recommendation chat under an assumed spec during `/develop`. It works: one Vercel function holds the OpenRouter key, verifies the user through Firestore with their own ID token, counts messages in `ai_usage/{uid}` under an increment only rule, and matches the model's picks to TMDB titles.

Live checks on 2026-10-20 exposed forces the assumption did not account for:
- The key is on OpenRouter's free tier with 0 credit. The assumed default free model (`google/gemma-4-31b-it:free`) returned 429 "rate limited upstream" on every call, so every real answer came from the paid fallback, which will start failing (402) once the account's small grace is used.
- Free tier accounts have a small daily cap on free model requests for the whole account, so 10 messages per user only serves a handful of users per day.
- The engineer wants zero spend, the owner to test freely, the limit tunable, and chats kept per account.

Not deciding means the chat either silently bills (paid fallback) or goes dark, and users lose their conversations on every refresh.

## Options considered

### Option 1: Fix in place (chosen)
Keep the function, the Firestore enforced count, and TMDB matching; swap in a free only model chain, move the limit to `config/site`, exempt the owner, save chats per user.

**Pros**: smallest change to working code; no new infrastructure or credentials; every rule stays enforceable in Firestore.
**Cons**: availability limited by free model capacity; several small edits across server, rules, and UI.

### Option 2: Paid primary model with a small credit balance
Use `openai/gpt-4o-mini` (about $0.0005 per message in tests) as the main model, a free model as fallback.

**Pros**: reliable, faster (5 to 7 s), consistent JSON.
**Cons**: real, ongoing spend; the engineer wants zero cost.

### Option 3: Server admin SDK for counting and chats
Give the function a Firebase service account and let it own `ai_usage` and `ai_chats` writes.

**Pros**: one writer; rules can deny all browser writes.
**Cons**: a long lived admin secret on Vercel with full database power, a new dependency, and more to rotate; the user token approach already gives tamper proof counting.

### Option 4: Rebuild on another provider's free tier
Call a provider SDK directly instead of OpenRouter.

**Pros**: possibly higher free quotas for one vendor.
**Cons**: loses OpenRouter's automatic fallback across vendors; the provider was already chosen by the engineer.

## Rationale

Option 1 keeps what the live checks proved works (JSON answers, real picks that use taste, correct refusals, secret key, tamper proof count) and fixes exactly the forces that failed: the dead free default and the billing fallback. The chain uses the three free models that answered with valid JSON and good picks in the live test, behind an env override because free model ids churn. Keeping only `:free` ids in code makes "never billed" an invariant rather than a setting someone can get wrong.

The engineer preferred free only over a paid primary (Option 2). Option 2 is more reliable, but the engineer consciously accepts best effort availability for zero cost; the lower default limit (5) and the admin editable cap are how that cost shows up for users.

Storing the limit in `config/site` (already owner written, publicly read, spec 0003) lets the server and the rule read one value, so they never drift and no deploy is needed. The owner exemption trusts the token's email only after Firestore has accepted that token, avoiding admin credentials (Option 3). Saved chats are written by the browser into the user's own doc: the worst a user can do is edit their own history, so a server writer adds cost without protecting anything; a transaction keeps two tabs from losing a message, and the 50 message cap keeps the doc far below Firestore's 1 MiB limit.

## Evidence: live model check (2026-10-20)

Real system prompt, question "a mind bending sci fi movie like Inception", taste "Interstellar; Dark (series); Arrival":

| Model | Result |
|---|---|
| `nvidia/nemotron-3-ultra-550b-a55b:free` | OK, 8.8 s, valid JSON, 6 picks (Predestination, Coherence, The Prestige) |
| `minimax/minimax-m3.1-flash:free` | OK, 10.1 s, valid JSON, 6 picks (Dark City, Coherence, Predestination) |
| `poolside/laguna-s-2.1:free` | OK, 10.8 s, valid JSON, 6 picks (Tenet, Predestination, Coherence) |
| `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free` | 429, rate limited upstream |
| `dots-studio/dots-3-note-preview:free` | answered, broken JSON |
| `nvidia/nemotron-3.5-lightning:free`, `xingchen-agi/xing4.0-29b-a4b:free` | answered, no JSON |
| `nvidia/nemotron-3-super-120b-a12b:free` | 404 |
| `thinkingmachines/inkling:free`, `inkling-small:free` | 403, agentic harnesses only |
| `openai/gpt-4o-mini` (paid, through the built handler) | OK, 5 to 7 s, valid JSON, 5 to 6 picks; off topic refusal correct |

Account check: `is_free_tier: true`, `total_credits: 0`.
