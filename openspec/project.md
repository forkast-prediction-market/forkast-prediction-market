# Project Context

## Purpose
Open-source project to launch and monetize Web3 prediction markets, inspired by Polymarket, but with full transparency and control.

## Tech Stack
- **Frontend:** Next.js 16 (React 19, TS, Tailwind, Zustand, @visx)
- **Backend/DB:** Supabase (Postgres, Drizzle)
- **Auth:** Better Auth + SIWE
- **Blockchain:** Polygon (viem, wagmi)

## Project Conventions

### Code Style
Use TypeScript, functional React components (with func-style), and 2-space indentation, mirroring existing files. Components are PascalCase (`MarketChart.tsx`), hooks camelCase prefixed with `use`, and environment constants UPPER_SNAKE_CASE. Keep route segments in `src/app` kebab-case. Tailwind 4 utility classes follow layout → spacing → color ordering. ESLint (see `eslint.config.mjs`) and `lint-staged` enforce formatting on commit; run `npm run lint` after larger refactors.

### Architecture Patterns
This Next.js 16 app lives in `src/app`, where routes and layouts sit with their page components. Shared UI is in `src/components`; data helpers in `src/lib` and `src/stores`; reusable hooks/providers in `src/hooks` and `src/providers`. Types stay in `src/types`, static assets in `public/`, and Playwright specs in `tests/e2e` with reports under `playwright-report/`. Unit tests are in `tests/unit`. Docs ship from `docs/` (configured via `docs.config.ts`).

### Testing Strategy
Unit tests drive acceptance tests in `tests/unit/*.test.ts`
Playwright drives acceptance tests in `tests/e2e/*.spec.ts`; name files after the user journey (`user-positions.spec.ts`). Keep tests idempotent and reset state via Supabase seeds or mocked data. Use `npm run test -- --project=chromium` for focused runs, and attach relevant screenshots or traces from `test-results/` when filing PRs.

### Git Workflow
Follow conventional commits (`feat:`, `fix:`, `refactor:`) as seen in git history (`feat: basic verison of user positions (#254)`). Reference issues or PR numbers with `(#123)` when applicable. Branch names mirror the work scope (`feat/user-positions`), and each PR should include a concise summary, screenshots for UI changes, test evidence (`npm run lint`, `npm run test`), and call out any env or migration adjustments.

## Domain Context
[Add domain-specific knowledge that AI assistants need to understand]

## Important Constraints
[List any technical, business, or regulatory constraints]

## External Dependencies
[Document key external services, APIs, or systems]
