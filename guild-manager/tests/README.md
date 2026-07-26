# Extended tests

The default `npm run test` and `npm run check` commands intentionally run only
the fast Vitest suite under `src/__tests__`.

- `npm run test:soak` advances deterministic domain simulations without real
  timers.
- `npm run test:e2e` builds the production app and runs Chromium at desktop and
  mobile viewports.
- `npm run test:e2e:ui` opens Playwright UI mode for local debugging.
- `npm run test:extended` type-checks and runs both extended suites.

Install the local Chromium binary once with:

```sh
npx playwright install chromium
```

The GitHub Actions workflow **Extended Tests** has only a manual
`workflow_dispatch` trigger. It is not part of deployment or pull-request
checks.
