# 0003 · Admin tab and maintenance mode

**Status**: Assumed
**Date**: 2026-10-20
**Authorized by**: joyshadman, during /develop

## Owed decision
Where the site wide maintenance switch lives, who can flip it, who gets past it, and where the owner only tools (visitor tracking) live in the app.

## Assumption built on
- One Firestore doc, `config/site`, holds `{ maintenance: boolean, message: string, updatedAt, updatedBy }`. Every visitor reads it live (onSnapshot). Only the owner writes it.
- The owner is the single account `joyshadman@gmail.com` (the same `OWNER_EMAIL` the About page already used for the tracker).
- When `maintenance` is true, every visitor except the owner sees a full screen maintenance page instead of the site. The owner sees the site normally plus a small "Maintenance is on" banner.
- If `config/site` cannot be read (missing doc, rules, offline), the site stays open (fail open), so a rules mistake never locks everyone out.
- A new route `/admin`, shown as an "Admin" tab in the navbar only for the owner, holds: the maintenance switch and message, and the Visitor tracking panel (moved off the About page). Any other user who opens `/admin` gets the 404 page.
- Page code only hides; Firestore rules must enforce it. Required rule:
  `match /config/{doc} { allow read: if true; allow write: if request.auth.token.email == 'joyshadman@gmail.com'; }`

## Code area
`src/Pages/Admin.jsx`, `src/components/Maintenance.jsx`, `src/services/siteConfig.js`, `src/config/owner.js`, `src/components/Navbar.jsx`, `src/App.jsx`, `src/Pages/About.jsx`

## Requirements
- AC-1: Only `joyshadman@gmail.com` sees the Admin tab (desktop and mobile) and can open `/admin`.
- AC-2: Visitor tracking no longer appears on About; it appears on `/admin` and works as before.
- AC-3: Turning maintenance on shows every other visitor (signed in or not) the maintenance screen within a second or two, without a reload. Turning it off restores the site.
- AC-4: The owner keeps full access while maintenance is on.
- AC-5: A failed read of `config/site` never blocks the site.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect admin tab and maintenance mode`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
