# Alliance Guild Manager

WoW-inspired guild management game built with React + Vite.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Run locally:
   - `npm run dev`

## Optional Gemini API Integration

The browser app no longer accepts a Gemini API key directly. To enable Oracle
actions, run a server-side proxy that owns the real key and expose only the proxy
URL to Vite:

- Terminal 1: `GEMINI_API_KEY=your_key_here npm run proxy:gemini`
- Terminal 2: `VITE_GEMINI_PROXY_URL=http://localhost:8787/api/gemini npm run dev`

Without `VITE_GEMINI_PROXY_URL`, the game still runs, but Oracle actions will
show an error message.

## Progression Setup

- Current playable cap: `CONFIG.LEVEL_CAP` (currently 60)
- Future target cap: `CONFIG.MAX_SUPPORTED_LEVEL` (currently 60)

Core config and large data tables live in `src/data/`; `src/constants.js`
keeps compatibility re-exports plus smaller shared constants.

## Publish (GitHub Pages)

This repo already includes a workflow at:
`/Users/shiro/Coding/guild-manager-react/.github/workflows/deploy-pages.yml`

Steps:

1. Push this repo to GitHub.
2. In GitHub, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Optional: if you want Oracle AI features in production, deploy the Gemini
   proxy separately and set `VITE_GEMINI_PROXY_URL` to that endpoint during the
   frontend build.
4. Push to `main` (or `master`) to trigger deployment.
5. Share the Pages URL with friends:
   - `https://<your-github-username>.github.io/<repo-name>/`

Notes:

- If `VITE_GEMINI_PROXY_URL` is not set, the app still works; only Oracle AI actions are disabled.
- The workflow builds from `guild-manager/` and publishes `guild-manager/dist`.
