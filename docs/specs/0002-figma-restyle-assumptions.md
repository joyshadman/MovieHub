# 0002 · Figma restyle: open decisions for features 7 to 14 and 16

**Status**: Assumed
**Date**: 2026-10-14
**Authorized by**: joyshadman, during /develop

## Owed decision
Scope features 7 to 14 and 16 were marked `needs a decision` with no spec: email auth routes and redirects, category filter set and state, Movies and TV Shows page content, regional collection definitions, Top 10 country source, and the layout of pages with no Figma frame (Search, My List, About, 404, empty and error states).

## Assumption built on
- **Email auth (7):** Firebase email/password via the existing `auth` from `src/components/firebase.jsx`, next to the existing Google popup sign in. Routes `/login`, `/signup`, `/forgot-password`. Sign up sets the display name from "Full name". Password minimum 8 characters, confirm must match, terms box must be ticked. Reset sends Firebase's password reset email. Signed in users visiting these routes are redirected to `/`. Apple sign in is not built (deferred). Needs Email/Password enabled in the Firebase console.
- **Category filters (8):** `/categories` shows the genre grid plus regional collections; `/categories/:genreId` shows one genre with filters for media type (movie or TV), year range, minimum rating, original language and sort (popularity, rating, newest), stored in URL query parameters, using TMDB `/discover`. Load more pages through results. Grid and list views.
- **Movies and TV Shows pages (9):** `/movies` and `/tv` show trending, popular and top rated rows for that media type, with a hero from the first trending item.
- **Regional collections (10):** TMDB `/discover/movie` by original language: Bangla `bn`, Hollywood `en` with region `US`, Bollywood `hi`, Korean `ko`, Japanese `ja`; Anime is `/discover/tv` with genre 16 and original language `ja`. Route `/collection/:slug`, paged with load more. Existing `getBanglaMovies`, `getBollywood`, `getAnime` are reused where they match.
- **Top 10 by country (11):** country from the region part of `navigator.language` (for example `en-BD` gives `BD`), else `US`. Data from TMDB `/movie/popular?region=XX`, first 10 results, labelled "Top 10 Movies in <country name> Today" using `Intl.DisplayNames`.
- **Pages with no Figma frame (12, 13, 14, 16):** the Figma design system (spec 0001 tokens, cards, chips, buttons, glass panels) applied to the existing behavior of Search, My List, About (updates feed, online users, admin center) and new 404, empty and error states. No behavior is removed.

## Code area
`src/App.jsx`, `src/Pages/*`, `src/components/*` (except the frozen `LoadingScreen.jsx` and `Loadingscreen.css`), `src/services/movieApi.js` (new read only TMDB calls added; existing calls unchanged).

## Requirements
Seeds from the scope `Done when` lines of features 7 to 14 and 16 in `docs/scope/scope.md`.

## Ratify
This decision was recorded by /develop, not deliberated. Run `/architect <feature>`
to deliberate and ratify it. Until then it stays flagged as an owed decision; it does not block marking the feature `done`.
