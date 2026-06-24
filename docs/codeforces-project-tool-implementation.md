# Codeforces Project Tool Implementation Log

Started: 2026-06-25.

## Working Rules

- Keep all edits inside `C:\octane\Project\2026May blog`.
- Do not stage or revert unrelated post edits already present in the worktree.
- Use the existing Astro static-page pattern: page shell under `src/pages/`, browser app under `public/`.
- Keep UI quiet and editorial: text controls, underlined inputs, thin borders, no SaaS-style cards or shadows.
- Verify with `npm.cmd run build`.
- Verify the UI directly in the Browser plugin before deployment.
- Deployment path is GitHub Pages via `.github/workflows/deploy.yml`; pushing `main` triggers the build and deploy job.

## Implementation Target

- `src/pages/codeforces-lab.astro`
- `public/codeforces-lab/app.js`
- `src/pages/projects.astro`
- `docs/codeforces-project-tool-plan.md`
- `docs/codeforces-project-tool-implementation.md`

## Feature Targets

1. Multi-handle fresh contest finder.
   - Official filters: Div. 4, Div. 3, Div. 2, Div. 1, Div. 1 + Div. 2.
   - Gym filter with duration range.
   - Uses `user.rating` plus paged `user.status` to mark touched contest ids.

2. Multi-handle rating graph.
   - Uses `user.rating`.
   - Renders an inline SVG chart and recent table.

3. Multi-handle estimated performance graph.
   - Uses `contest.ratingChanges` for each selected contest.
   - Uses date-aware adjusted old ratings for the 2020-05-24 new-account policy.
   - Reconstructs selected handles' first-six-contest hidden calculation offsets from their `user.rating` history index.
   - Builds Codeforces-like expected ranks, delta adjustment, and zero-delta performance estimate.
   - Labels values as estimates, not official Codeforces fields.

4. Two-handle head-to-head.
   - Intersects `user.rating` by `contestId`.
   - Lower rank wins; equal rank ties.

## Progress

- Goal created for full implementation and deployment.
- Read repo instructions, prior Codeforces plan, deploy workflow, and Kokiri Codeforces reference.
- Rechecked Codeforces new-account rating policy:
  - official 2020-05-24 post says new accounts display 0 but calculate from 1400;
  - first 6 displayed bonuses are 500, 350, 250, 150, 100, 50;
  - API samples show contest-id-only cutoff is unsafe (`1358` is after the change despite id `< 1360`);
  - performance implementation must reconstruct selected-handle early hidden offsets from `user.rating` history order and keep the graph labeled as estimated.
- Added `cheran-senthil/TLE` as a fallback reference. Its `tle/util/ranklist/rating_calculator.py` is useful if the current JavaScript estimator needs a Python/FFT reference for Codeforces-style seed, need-rating, and correction phases.
- Implemented the static page and browser app:
  - `src/pages/codeforces-lab.astro`
  - `public/codeforces-lab/app.js`
  - `src/pages/projects.astro`
- Updated the UI plan after interactive review:
  - Korean page copy and tool messages.
  - One shared comma/newline-separated handle input.
  - Four tabs: 안 친 셋, 레이팅 그래프, 퍼포먼스, 맞대결.
  - Blank Gym duration bounds, with `HH:MM` validation only when a bound is entered.
  - Date ranges on rating and performance graphs.
  - Automatic chart colors by handle and smaller point/stroke rendering for dense graphs.
- Local verification:
  - `node --check public\codeforces-lab\app.js` passed.
  - `npm.cmd run build` passed and generated `/codeforces-lab/index.html`.
  - Browser checked `/projects/`; the Codeforces Lab entry links to `/codeforces-lab/` and uses the expected quiet Projects style.
  - Browser checked `/codeforces-lab/` with `tourist, Petr`; loaded 2 handles, rendered rating SVG, rating table, and 143 shared head-to-head rows.
  - Browser checked the Korean tab UI: 안 친 셋, 레이팅 그래프, 퍼포먼스, 맞대결.
  - Browser checked rating date range filtering and dense chart point scaling.
  - Browser checked fresh contest finder with blank Gym duration bounds, scan depth 1 page, and result limit 8; returned 8 rows without requiring arbitrary duration defaults.
  - Browser checked performance estimates with a date range and 1 contest per handle; rendered SVG and table rows.
  - Browser checked mobile viewport; controls and text did not overlap, and chart/table overflow stayed in their tool areas visually.

## Commit And Deploy Workflow

- Stage only the Codeforces Lab files and docs listed above.
- Leave unrelated `src/pages/posts/` edits unstaged and unreverted.
- Commit the staged implementation.
- Push `main`.
- Verify the GitHub Pages deployment URL after the workflow publishes.
