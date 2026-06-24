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

## Improvement Review: 2026-06-25 Follow-up

User feedback came from the deployed performance tab screenshot with handles such as
`octane`, `annyeong1`, `parkky`, and `gs20036`.

### Findings

- `octane` does have old rated history in the public API. A live
  `user.rating?handle=octane` check returned 104 rated contests:
  2021: 9, 2022: 36, 2023: 17, 2024: 16, 2025: 16, 2026: 10.
- The missing 2022-looking points are caused by the current UI/control mismatch:
  - the performance input lets the visible value become `100`;
  - the JS clamps it with `clampInteger(..., 1, 30)`;
  - performance then uses `history.slice(-limit)`, so only the last 30 rated
    contests per handle are actually selected.
- For `octane`, the first contest in the last-30 slice is 2024-08-30. The
  screenshot's 2023-12 left edge likely comes from another handle's last-30
  slice, not from full-range data.
- This is not a Codeforces data absence. It is an implementation/UX issue.

### Source Review Notes

- Codeforces API docs confirm the available public primitives:
  - `user.rating` returns a user's rated history.
  - `user.status` returns a user's submissions sorted newest-first.
  - `contest.ratingChanges` returns post-contest rating changes.
  - public regular `contest.standings` is available only as a full anonymous
    `contestId` request; gym/mashup standings need authenticated access when
    not publicly viewable.
- Carrot remains the best browser-side performance reference. Its README says
  it runs in-browser, fetches Codeforces API data, and shows performance as the
  rating at which delta would be zero. Its `predict.js` calculates seeds,
  delta adjustments, and performance with FFT.
- TLE remains the best compact Python reference for Codeforces-style rating
  calculation. Its architecture names `tle/util/ranklist/rating_calculator.py`
  as the FFT-based CF rating calculator, and the file implements seed,
  rank-to-rating, and correction phases.
- Codeforces profile pages expose useful UX cues for graphs: "Click on the
  graph to enable the zoom feature", an Only rated / All toggle, and year
  selection. We should not copy the UI, but x-axis ticks, hover details, and
  optional zoom/year presets are aligned with normal Codeforces expectations.

### API Calling Patterns In Carrot And TLE

Carrot:

- `carrot/src/background/cf-api.js` exposes a small API wrapper for
  `contest.list`, `contest.standings`, `contest.ratingChanges`, and
  `user.ratedList`.
- Carrot does not simply `fetch()` Codeforces from the extension background
  script. It asks a Codeforces content script to perform the request, because
  a real Codeforces tab can carry the cookies needed to get past Cloudflare
  human checks.
- `cache/ratings.js` prefetches all rated users with `user.ratedList(false)`
  near contest start and keeps a handle-to-rating map in browser storage. This
  is a large request and is locked so it cannot run multiple times at once.
- `cache/contests.js` refreshes `contest.list` every 6 hours and stores contest
  metadata.
- `cache/contests-complete.js` fetches full contest standings first, then
  `contest.ratingChanges` for finished contests. It caches finished contest
  bundles for 1 day, keeping only a small number of recent finished contests.
- For finished rated contests, Carrot uses official final deltas from
  `contest.ratingChanges`, but computes performance from standings rows plus
  old ratings. For active contests, it predicts from current standings plus the
  cached current-rating map.
- Carrot still has the older `contestId >= 1360 && oldRating === 0 ? 1400`
  band-aid. We should not copy that cutoff; our later date/history-index
  reconstruction is more appropriate for historical profile graphs.
- Takeaway for this static blog: Carrot's UX/algorithm is useful, but its
  content-script request model is not portable to GitHub Pages. A public page
  must either call Codeforces directly, accept CORS/Cloudflare fragility, or add
  a proxy/import path later.

TLE:

- `tle/util/codeforces_api.py` wraps Codeforces API calls with an async
  `aiohttp` POST client, gzip accept headers, typed response objects, and
  explicit error classes.
- TLE rate-limits through a decorator, retries connection/call-limit failures,
  and serializes requests to avoid hammering the API.
- `user.info` is chunked by both handle count and request byte size before POST.
- `user.status`, `user.rating`, `contest.list`, `contest.ratingChanges`, and
  `contest.standings` are all wrapped in typed helpers.
- `tle/util/cache/rating_changes.py` persists rating changes in a database,
  fetches missing finished contests in batches, and monitors newly finished
  rated contests for delayed rating changes.
- `tle/util/cache/ranklist.py` fetches standings, then either attaches fetched
  final deltas from `contest.ratingChanges` or predicts deltas from current
  ratings. It can keep active contest ranklists warm in the background.
- Takeaway for this static blog: TLE's API discipline is the right model for a
  future server/proxy version. Without a server-side persistent cache, a
  long-range performance graph will necessarily make many slow public API
  requests in the user's browser.

Implementation implications:

- Keep the direct browser queue conservative and user-visible, but phrase it as
  "불러오는 중" rather than endpoint jargon.
- For performance history, prefer final `contest.ratingChanges` over full
  `contest.standings` as the default because it is smaller and works through
  anonymous public API calls. Add full-standing validation only as an advanced
  or server-backed path.
- Add a "selected contests / estimated time" pre-load summary before long
  performance fetches, because the all-contests-in-range request count can be
  large.
- If this tool outgrows static hosting, the first server-side feature should be
  a TLE-like cache for `contest.ratingChanges` and contest metadata.

### Feasibility Matrix

| Improvement | Feasible? | Plan |
| --- | --- | --- |
| Treat start and end dates as independently optional | Yes | Keep both date inputs blankable. If only start is set, use `[start, +inf)`. If only end is set, use `(-inf, end]`. Add placeholder/quiet helper copy such as "전체" only if needed. |
| Remove per-handle contest count | Yes | Delete `data-performance-limit` UI and JS. Build the contest set from every selected-handle `user.rating` row inside the optional date range. |
| Fix the missing 2022 performance points | Yes | Removing the count limit fixes the root cause. Add a guard that shows selected contest count before loading so users understand long ranges. |
| Render performance graph only after all contest requests finish | Yes | Accumulate rows in a local array, update only progress text while loading, then set `state.performanceRows` and render once at the end. Keep a cancel token for future interruption. |
| Remove the heavy performance table | Yes | Do not render the full table by default. Replace it with hover/focus tooltips and optionally a small summary line or a collapsible "details / export" section later. |
| Custom floating tooltip on graph points | Yes | Replace SVG-only `<title>` with an absolutely-positioned tooltip. Each point should carry handle, date, contest name, performance, rank, participant count, and Codeforces contest link. Support pointer hover, keyboard focus, and click/tap. |
| Show rank as "rank / rated users" | Yes | Already have `rank` and `participantCount` from `contest.ratingChanges`; expose them in tooltip. |
| Add x-axis ticks | Yes | Extend `renderLineChart` with 4-7 time ticks chosen from span length: yearly for multi-year spans, quarterly/monthly for shorter spans. Draw vertical grid lines and labels. |
| Make the site feel less like an API UI | Yes | Rename technical controls/statuses. For fresh search, replace "submission pages" with a mode selector such as "빠르게 / 보통 / 꼼꼼히 / 전체 제출". Hide endpoint names from user-facing progress. |
| Default fresh search to all submissions | Partially feasible | `user.status` can page until empty, so complete visible-submission scanning is possible. It may be very slow for active users because of the 1 request / 2 seconds limit. Use "보통" or cached complete mode by default only after UX work for progress, cancel, and estimated time. |
| Detect "ran a contest" without submissions | Limited | Public API has no direct per-user "opened/registered but submitted nothing" endpoint. `user.rating` detects rated participation. `user.status` detects any visible submission. Full `contest.standings` can sometimes verify regular official contests, but it requires downloading full standings per contest and is not practical as the default; gym/private cases are limited by authentication. |

### Recommended Next Implementation Slice

1. Performance tab data semantics:
   - remove the contest-count input;
   - select all contests in the optional date range;
   - show a pre-load summary: distinct contests, estimated minimum API time,
     cached count if known;
   - render once after all selected contests have loaded.
2. Performance graph UX:
   - add x-axis ticks;
   - add custom point tooltip with contest, performance, rank / rated users;
   - remove the default performance table;
   - keep legend and color assignment.
3. Fresh finder UX:
   - replace API-shaped "status pages" with an intent-shaped scan-depth control;
   - keep current conservative semantics: any visible submission means touched;
   - add an advanced complete scan option with clear time estimate and caching.
4. Validation:
   - test `octane` with a full range including 2022;
   - test a one-ended start date and one-ended end date;
   - test long-range load progress and final-only render;
   - test hover/focus tooltip on desktop and mobile;
   - run `node --check public\codeforces-lab\app.js`;
   - run `npm.cmd run build`;
   - verify with the Browser plugin before deploy.

## Follow-up Implementation: 2026-06-25

Implemented the first follow-up slice after the analysis above.

Performance tab:

- Removed the per-handle contest-count input.
- Start and end dates are independently optional. Blank dates mean an open
  range, and both blank means the full public rated history for the loaded
  handles.
- The performance loader now selects every distinct rated contest in the
  current date range from the loaded handles' `user.rating` histories.
- The loader no longer renders partial graphs after each successful API call.
  It updates progress text and renders the graph once all selected
  `contest.ratingChanges` requests have finished.
- The heavy performance table was removed from the default UI.
- The graph now carries point-level hover/focus details: handle, date, contest
  name, estimated performance, and rank / rated participant count.
- The graph renderer now adds x-axis time ticks in addition to first/last date
  labels.
- A compact summary below the graph shows loaded contest count, visible points,
  handle count, and tooltip guidance.

Fresh contest finder:

- Replaced the API-shaped "status pages per handle" numeric control with a
  user-facing scan-depth selector:
  - `빠르게`: recent 1,000 visible submissions per handle.
  - `보통`: recent 20,000 visible submissions per handle.
  - `꼼꼼히`: recent 100,000 visible submissions per handle.
  - `전체 제출`: all visible submissions until `user.status` returns a short page.
- The conservative touched-contest rule remains the same: a rated history entry
  or any visible submission marks a contest as touched.
- User-facing progress text no longer exposes endpoint names like
  `contest.ratingChanges` or `user.status`.

Implementation notes:

- `contest.ratingChanges` remains the default performance source because it is
  much lighter than full `contest.standings` and works through anonymous public
  calls.
- The current implementation still labels performance as estimated. It does not
  fetch full standings for every historical contest.
- Complete visible-submission scan is implemented but intentionally not the
  default because public API throttling makes it slow for active users.

Verification plan for this slice:

- `node --check public\codeforces-lab\app.js`.
- `npm.cmd run build`.
- Browser-check the deployed-style flow locally:
  - performance with `octane` and a 2022 date window;
  - performance with only a start date;
  - performance with only an end date;
  - point tooltip on desktop;
  - x-axis ticks;
  - fresh finder scan-depth selector;
  - mobile layout.
