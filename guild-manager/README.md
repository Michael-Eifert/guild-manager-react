# Guild Manager

Guild Manager is a World of Warcraft-inspired guild management game
built with React and Vite. You found a guild, recruit heroes, assign roles and
professions, send parties into zones, dungeons, raids, and PvP, then grow the
guild through loot, renown, talents, calendar planning, and realm simulation.

The app is intentionally static-first: the main game runs fully in the browser,
with optional server-side support only for Oracle/Gemini text generation.

## Quick Start

Requirements:

- Node.js `20.19+` or `22.12+` (required by the current Vite version).
- npm, which is included with Node.js.

All npm commands below must be run from the application directory. If you
cloned the complete repository, enter it first:

```bash
cd guild-manager
```

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run checks:

```bash
npm run check
```

`npm run check` runs linting, strict TypeScript checking, the complete test
suite, a production build, and the bundle-size regression check. Individual
commands such as `npm run lint`, `npm run typecheck`, `npm run test`, and
`npm run build` remain available.

Tailwind CSS and the Cinzel/Lato fonts are now installed locally and processed
by Vite. Starting a separate Tailwind process or loading the Tailwind CDN is no
longer required.

## What The App Contains

- Guild setup with faction, server, focus, and starting roster choices.
- Character simulation for leveling, professions, morale, personality traits,
  relationships, equipment, zone progress, and PvP state.
- Mission board for quests, dungeons, raids, keys, rewards, party selection,
  raid requirements, and lockouts.
- Adventure board and world map for zone progression and elite automation.
- Guild progression with renown, talents, roster cap, gold cap, and raid
  attunement unlocks.
- Calendar scheduling for planned dungeon and raid events.
- Realm simulation for population, rival NPC guilds, rankings, news, and
  recruitment market behavior.
- Session import/export so browser-only saves can be backed up as JSON files.
- Optional Oracle/Gemini backstory generation through a proxy.

## Project Structure

```text
src/
  app/             GameProvider, GameContext, and useGame hook
  pages/           Route-level screens for dashboard, guild, calendar, realm, etc.
  components/      Reusable cards, setup UI, notifications, and modal surfaces
  data/            Classes, races, names, config, item catalog, and loot manifests
  game/            Tick engine and character activity, morale, dungeon, leveling logic
  missions/        Mission templates, rewards, helpers, roster guards, dungeons
  loot/            Loot table helpers, dungeon loot config, world loot logic
  guild/           Guild setup, role summaries, member search
  zones/           Zone definitions, map layout, progression and automation helpers
  calendar/        Calendar state, event scheduling, and recurrence logic
  raids/           Raid lockouts and resume progress
  pvp/             PvP ranks, weekly rollover, world PvP, and gear unlocks
  server/          Browser-side realm simulation modules, not a hosted backend
  session/         Save/load normalization and file actions
  debug/           Debug menu actions and preset roster generation
  __tests__/       Vitest domain, route, component, and data tests
```

Important entry points:

- `src/main.jsx` mounts React and the router.
- `src/App.jsx` wires the top-level route shell.
- `src/routes.js` centralizes route constants.
- `src/app/GameProvider.tsx` is the typed context composition boundary.
- `src/app/useGameProviderController.js` coordinates the legacy state slices while
  provider behavior is moved into typed domain modules.
- `src/pages/home/HomeRoot.jsx` renders the main authenticated/started-game
  shell and route navigation.

## Routing

Routes are declared in `src/routes.js`:

- `/start` for guild setup.
- `/home` for the dashboard.
- `/home/guild` for guild talents and progression.
- `/home/calendar` for scheduled events.
- `/home/realm` for realm overview.
- `/home/mission-board` for missions, dungeons, and raids.
- `/home/adventure-board` for world map and zone activity.

Page components generally adapt existing modal-style tools into full route
views. The route constants should be used instead of hard-coded path strings.

## State And Data Flow

`GameProvider` is intentionally a small context boundary. The controller hook
coordinates roster state, missions, progression, calendar, realm simulation,
PvP, and notifications. Pure provider-facing calculations live in typed modules
such as `providerSelectors.ts`, `missionRuntime.ts`, and
`providerInventoryTransitions.ts`; session actions are isolated behind
`sessionActions.ts`.

Most gameplay helpers are pure or near-pure functions in domain folders such as
`missions/`, `game/`, `pvp/`, `zones/`, and `server/`. Prefer adding behavior
there before adding more logic directly to React components.

The browser save format is normalized through `src/session/`. When changing
persisted state, update the session normalization path so older saves continue
to load.

## Item Catalog

Item data lives in `src/data/items.js` and `src/data/imports/`, but runtime code
should access items through `src/data/itemCatalog.js`.

The catalog provides:

- `loadItemCatalog()` for cached lazy loading.
- `createItemCatalog(items)` for tests and future data backends.
- `catalog.all()` for compatibility with older array-based logic.
- `catalog.query(filters)` for source, quality, level, class, slot, set-piece,
  world-only, and dungeon-only filters.
- `catalog.byId(id)` for stable lookups.
- `catalog.getLootLevelRangesBySource()` for mission and loot UI summaries.

This keeps the app static-hosting friendly while leaving a clean path to a JSON
asset or API later if item data outgrows the bundled source.

## Optional Gemini API Integration

The browser app does not accept a Gemini API key directly. To enable Oracle
actions, run the server-side proxy and expose only the proxy URL to Vite.

The proxy is optional and is only needed for Oracle/Gemini-generated text. The
game itself still starts with just `npm run dev`.

On PowerShell, start the proxy in terminal 1:

```powershell
$env:GEMINI_API_KEY="your_key_here"
npm run proxy:gemini
```

Then start the app in terminal 2:

```powershell
$env:VITE_GEMINI_PROXY_URL="http://localhost:8787/api/gemini"
npm run dev
```

On macOS, Linux, Git Bash, or another POSIX-compatible shell, use:

```bash
GEMINI_API_KEY=your_key_here npm run proxy:gemini
```

```bash
VITE_GEMINI_PROXY_URL=http://localhost:8787/api/gemini npm run dev
```

The proxy listens on port `8787` by default and exposes a health endpoint at
`http://localhost:8787/health`. Set `PORT` to use a different port and update
`VITE_GEMINI_PROXY_URL` accordingly.

For a hosted proxy, set `NODE_ENV=production` and an explicit comma-separated
`ALLOWED_ORIGINS` list. Optional controls include `MAX_CONCURRENT_REQUESTS`,
`RATE_LIMIT_CAPACITY`, `RATE_LIMIT_REFILL_PER_MINUTE`, and `TRUST_PROXY=true`
when the service is behind a trusted reverse proxy. The built-in limits reduce
accidental abuse, but a public production deployment should still be protected
by authenticated access or an API gateway.

Without `VITE_GEMINI_PROXY_URL`, the game still runs. Oracle actions will show
an error message instead of generating text.

## Testing

The test suite uses Vitest and covers:

- Domain rules for missions, rewards, guild progression, sessions, calendar,
  realm simulation, PvP, raids, dungeons, zones, and item tuning.
- Component rendering for cards, modals, setup screen, notifications, and route
  contracts.
- Item catalog behavior.

Run all tests with:

```bash
npm run test
```

When changing gameplay rules, prefer adding focused domain tests first. When
changing page or modal behavior, add or update the matching component test under
`src/__tests__/components/`.

## Configuration

Core gameplay configuration is split between:

- `src/constants.js` for compatibility re-exports and shared constants.
- `src/data/gameConfig.js` for game tuning.
- `src/data/classes.js`, `src/data/races.js`, and `src/data/names.js` for
  character generation data.
- `src/missions/dungeonDefinitions.js` and `src/missions/missionTemplates.js`
  for mission content.

Current progression constants:

- `CONFIG.LEVEL_CAP`: current playable cap, currently 60.
- `CONFIG.MAX_SUPPORTED_LEVEL`: future supported cap, currently 60.

## Deployment

The repository includes a GitHub Pages workflow at:

```text
../.github/workflows/deploy-pages.yml
```

The workflow:

1. Runs from the `guild-manager/` working directory.
2. Installs dependencies with `npm ci`.
3. Runs linting, strict TypeScript checking, tests, and a production build.
4. Checks the generated JavaScript against the checked-in bundle budget.
5. Sets `VITE_BASE_PATH` to the repository name for GitHub Pages.
6. Publishes `guild-manager/dist`.

The app router also uses Vite's base URL as its basename, so deployed routes
resolve under the repository path, such as `/guild-manager-react/start` for a
repository named `guild-manager-react`. The build copies `dist/index.html` to
`dist/404.html` so direct loads and refreshes on nested routes keep serving the
React app.

To publish:

1. Push the repo to GitHub.
2. In GitHub, go to Settings > Pages and set Source to GitHub Actions.
3. Push to `main` or `master`, or run the workflow manually.

Optional production Oracle support requires deploying the Gemini proxy
separately and setting the `VITE_GEMINI_PROXY_URL` secret for the workflow.

## Development Notes

- Keep runtime item access behind `itemCatalog.js`; avoid importing
  `DB_ITEMS` directly outside canonical data tests.
- Keep route paths in `src/routes.js`.
- Prefer domain helpers for gameplay rules and keep React components focused on
  rendering and user interaction.
- Use existing normalization helpers when adding saved state.
- Run `npm run lint`, `npm run test`, and `npm run build` before shipping larger
  changes.
