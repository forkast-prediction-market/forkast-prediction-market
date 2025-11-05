# Repository Guidelines

## Project Structure & Module Organization
This Next.js 16 app lives in `src/app`, where routes and layouts sit with their page components. Shared UI is in `src/components`; data helpers in `src/lib` and `src/stores`; reusable hooks/providers in `src/hooks` and `src/providers`. Types stay in `src/types`, static assets in `public/`, and Playwright specs in `tests/` with reports under `playwright-report/`. Docs ship from `docs/` (configured via `docs.config.ts`).

## Build, Test, and Development Commands
- `npm install` — Sync dependencies defined in `package-lock.json`.
- `npm run dev` — Launch the local dev server on http://localhost:3000.
- `npm run lint` — Run ESLint with autofix; required before opening a PR.
- `npm run build` — Produce an optimized production bundle.
- `npm start` — Serve the build output (useful for staging repros).
- `npm run test` — Execute Playwright specs; reports land in `playwright-report/`.
- `npm run db:push` — Apply pending Supabase migrations via `supabase/migrate.js`.

## Coding Style & Naming Conventions
Use TypeScript, functional React components (with func-style), and 2-space indentation, mirroring existing files. Components are PascalCase (`MarketChart.tsx`), hooks camelCase prefixed with `use`, and environment constants UPPER_SNAKE_CASE. Keep route segments in `src/app` kebab-case. Tailwind 4 utility classes follow layout → spacing → color ordering. ESLint (see `eslint.config.mjs`) and `lint-staged` enforce formatting on commit; run `npm run lint` after larger refactors.

## Testing Guidelines
Playwright drives acceptance tests in `tests/*.spec.ts`; name files after the user journey (`user-positions.spec.ts`). Keep tests idempotent and reset state via Supabase seeds or mocked data. Use `npm run test -- --project=chromium` for focused runs, and attach relevant screenshots or traces from `test-results/` when filing PRs.

## Commit & Pull Request Guidelines
Follow conventional commits (`feat:`, `fix:`, `refactor:`) as seen in git history (`feat: basic verison of user positions (#254)`). Reference issues or PR numbers with `(#123)` when applicable. Branch names mirror the work scope (`feat/user-positions`), and each PR should include a concise summary, screenshots for UI changes, test evidence (`npm run lint`, `npm run test`), and call out any env or migration adjustments.
