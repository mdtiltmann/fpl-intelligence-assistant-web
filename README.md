# FPL Intelligence Assistant — Web (Netlify)

A separate, from-scratch rewrite of the FPL Intelligence Assistant as a
React + Netlify Functions app, so it can be hosted publicly on Netlify.
The original Python/Streamlit app (in the parent directory) is untouched
and still works locally — this is an additional deliverable, not a
replacement.

## Why a rewrite, not a port

Netlify cannot run the original app's Python/Streamlit process or its
SQLite database. This version:

- Uses **Netlify Functions** (Node.js serverless) as a thin proxy to the
  official FPL API, so the browser never hits fantasy.premierleague.com
  directly (avoids CORS issues) and a shared retry policy lives in one
  place (`netlify/functions/_fplClient.js`).
- Has **no server-side database**. Since this is a single-user tool, your
  manager ID and any preferences are stored in your browser's
  `localStorage` (`src/lib/storage.js`) instead of a server-side DB —
  Netlify has no persistent database included by default, and adding one
  (Postgres/Fauna/etc.) would be unnecessary complexity for one user's
  settings.
- Ports the **core recommendation math** (expected points, team rating,
  fixture difficulty, captaincy ranking, single-transfer suggestions,
  greedy starting-XI/bench picker) from the Python `analytics`/
  `recommendations` modules into `src/lib/analytics.js`, run client-side
  in the browser rather than server-side.

## What's included (v1)

- Home (manager ID entry, overview)
- My Team (squad, team rating, starting XI/bench)
- Player Explorer (filter/sort all players)
- Captaincy (ranked options, safest vs. highest-upside)
- Fixtures (official + independently-calculated difficulty)
- Transfer Centre (single-swap suggestions with budget/hit-cost math)

## What's NOT included (deferred — see the Python app for these)

- News ingestion
- Predicted lineups / price-change heuristics
- The ILP (PuLP) squad optimiser for wildcard/free-hit planning
- Live Gameweek page
- Manual availability overrides
- Plain-English preferences file / `/fpl-change` workflow
- Player Comparison, History pages

These could be added in a follow-up pass; they were left out of v1 to
ship something real and tested rather than a half-built 13-page clone.

## Local development

```bash
npm install
npm install -g netlify-cli   # once, if you don't have it
netlify dev
```

`netlify dev` runs the Vite frontend and the Netlify Functions together
on http://localhost:8888, with hot reload.

Alternatively, run the frontend only (functions won't work without
`netlify dev` or a deploy):

```bash
npm run dev
```

## Deploying to Netlify

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In the Netlify dashboard: **Add new site → Import an existing project**.
3. Point it at this `netlify-app` folder as the **base directory** (if
   your repo root is the parent `Fantasy Football AI` folder rather than
   `netlify-app` itself).
4. Build command: `npm run build`. Publish directory: `dist`. Functions
   directory: `netlify/functions`. (All three are already set in
   `netlify.toml`, so Netlify should auto-detect them.)
5. Deploy. No environment variables or secrets are required — the app
   only calls the public, unauthenticated FPL API.

## Data and privacy

- Your manager ID and locally-set preferences live only in your own
  browser's `localStorage` — nothing is sent to or stored on a server
  other than the FPL API calls the Netlify Functions proxy on your
  behalf.
- Like the Python app, this is advisory-only and read-only: it never
  logs into or writes to the official FPL website.
