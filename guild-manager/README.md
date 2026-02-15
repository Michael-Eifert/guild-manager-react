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
