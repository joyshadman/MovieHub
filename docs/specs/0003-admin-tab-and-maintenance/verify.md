# Verify: Admin tab and maintenance mode · spec 0003 · updated 2026-10-20
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Setup
- [ ] Firestore rule in place: `match /config/{doc} { allow read: if true; allow write: if request.auth.token.email == 'joyshadman@gmail.com'; }`

## UI / manual
- [x] Signed out: the navbar has no Admin link → AC-1 (checked 2026-10-20 in Brave)
- [x] Signed out: open `/admin` → the 404 page, no switch, no tracker → AC-1 (checked 2026-10-20)
- [ ] Signed in as another account: no Admin link (desktop navbar, account dropdown, mobile account sheet); `/admin` shows 404 → AC-1
- [ ] Signed in as joyshadman@gmail.com: Admin shows in the desktop navbar, the account dropdown and the mobile account sheet → AC-1
- [x] `/about` has no Visitor tracking section → AC-2 (checked 2026-10-20, signed out)
- [ ] Owner on `/admin`: Visitor tracking lists visitors, search, Online now filter and Remove record all work → AC-2
- [ ] Owner turns maintenance on with a message and saves; a second browser (signed out, or another account) switches to the maintenance screen with that message within about 2 s, no reload → AC-3
- [ ] Owner still browses the whole site and sees the "Maintenance is on" pill, which opens `/admin` → AC-4
- [ ] While on: `/login` still opens for everyone; the owner can sign in from the maintenance screen's link → AC-4
- [ ] Owner turns it off; the second browser gets the site back without a reload → AC-3
- [x] With no `config/site` doc (or a rule that denies reading it) the site opens normally → AC-5 (checked 2026-10-20: doc not readable, site loads)

## Commands
- [ ] `npm run build` → succeeds
- [ ] `npm run lint` → no errors in the files listed under the spec's Code area

## Acceptance-criteria coverage
- AC-1 … owner and visitor nav and /admin steps · AC-2 … About and tracker steps · AC-3 … on and off from a second browser · AC-4 … owner access and pill · AC-5 … unreadable doc
