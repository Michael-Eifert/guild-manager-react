# Alliance Guild Manager

WoW-inspired guild management game built with React + Vite.

## Quick Start

1. Install dependencies:
   - `npm install`
2. Run locally:
   - `npm run dev`

## Optional Gemini API Integration

To enable AI-generated backstories and missions, set:

- `VITE_GEMINI_API_KEY=your_key_here`

Without the key, the game still runs, but Oracle actions will show an error message.

## Progression Setup

- Current playable cap: `CONFIG.LEVEL_CAP` (currently 20)
- Future target cap: `CONFIG.MAX_SUPPORTED_LEVEL` (currently 60)

Core config lives in `/Users/shiro/Coding/guild-manager-react/guild-manager/src/constants.js`.

## Publish (GitHub Pages)

This repo already includes a workflow at:
`/Users/shiro/Coding/guild-manager-react/.github/workflows/deploy-pages.yml`

Steps:

1. Push this repo to GitHub.
2. In GitHub, go to **Settings > Pages** and set **Source** to **GitHub Actions**.
3. Optional: if you want Oracle AI features in production, add repo secret:
   - **Settings > Secrets and variables > Actions > New repository secret**
   - Name: `VITE_GEMINI_API_KEY`
   - Value: your Gemini API key
4. Push to `main` (or `master`) to trigger deployment.
5. Share the Pages URL with friends:
   - `https://<your-github-username>.github.io/<repo-name>/`

Notes:

- If `VITE_GEMINI_API_KEY` is not set, the app still works; only Oracle AI actions are disabled.
- The workflow builds from `guild-manager/` and publishes `guild-manager/dist`.
