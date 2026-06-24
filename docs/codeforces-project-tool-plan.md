# Codeforces Project Tool Feasibility And Plan

Last checked: 2026-06-25.

## Scope

Add a Codeforces project tool to the blog Projects area. The first pass should stay close to the existing editorial style: simple text controls, underlined inputs, thin borders, no SaaS cards, no shadows, and no new heavy frontend framework unless the implementation genuinely needs it.

The requested feature set is feasible, but the performance graph needs to be presented as an estimate rather than an official Codeforces value. The main engineering constraint is the Codeforces public API limit of one request per two seconds.

## Existing Local References

- Blog landing point: `src/pages/projects.astro`.
- Existing static tool pattern: `src/pages/ucpc-scoreboard.astro` plus `public/ucpc-scoreboard/app.js`.
- Kokiri Zoo reference implementation:
  - `C:\octane\Project\Kokiri Zoo\src\features\codeforces\codeforces-api.ts`
  - `C:\octane\Project\Kokiri Zoo\src\features\codeforces\codeforces-comparison.ts`
  - `C:\octane\Project\Kokiri Zoo\src\features\codeforces\codeforces-types.ts`
  - `C:\octane\Project\Kokiri Zoo\src\features\codeforces\CodeforcesLabFeature.tsx`

Kokiri already verifies the simple public API path for `user.info` and `user.rating`, and has reusable head-to-head rating-history comparison logic. The React UI and CSS should not be copied directly into this blog because its visual language is much heavier than the current Projects/UCPC pages.

## Source Checks

Official Codeforces API docs:

- Introduction and request shape: https://codeforces.com/apiHelp
- Method list: https://codeforces.com/apiHelp/methods
- Return objects: https://codeforces.com/apiHelp/objects

Important API facts from the docs:

- All methods can be called anonymously for public data.
- The API returns JSON objects with `status`, `comment`, and `result`.
- Codeforces documents a limit of at most one request per two seconds.
- `contest.list` supports `gym=true/false`.
- `user.info` accepts semicolon-separated handles.
- `user.rating` returns public rating history.
- `user.status` returns a user's public submissions.
- `contest.ratingChanges` returns official post-contest rating changes.
- Regular public `contest.standings` currently has a strict public mode: anonymous GET with exactly one query parameter, `contestId`. Public calls with `from`, `count`, `handles`, `room`, `showUnofficial`, or similar filters fail.
- Gym and mashup standings require authenticated access when the contest is not publicly viewable by the caller.

Live probes on 2026-06-24:

- `contest.list?gym=false` returned `Access-Control-Allow-Origin: *`.
- `contest.list?gym=true` returned public Gym metadata, including many contests with `durationSeconds` and sometimes no `startTimeSeconds`.
- `user.rating?handle=tourist` returned 304 rating changes.
- `user.status?handle=tourist&from=1&count=3` returned public submissions.
- `contest.standings?contestId=2237&from=1&count=3&showUnofficial=false` failed with Codeforces' documented "exactly one query parameter" restriction.
- `contest.standings?contestId=2237` succeeded, with 10 problems and 14273 rows.
- `contest.ratingChanges?contestId=2237` succeeded, with 14454 rows.
- The tested API endpoints returned CORS `*`, so a static blog page can call them directly for now. Keep a fallback note because Codeforces/Cloudflare behavior can change.
- Mike Mirzayanov's "Codeforces: Soon We Will Change the Rating Calculation for New Accounts" was published on 2020-05-24 20:14 Codeforces time. It introduced displayed rating 0 for new accounts, calculation rating 1400, and displayed-rating promotions over the first 6 rated contests: 500, 350, 250, 150, 100, 50.
- API spot checks around the change:
  - contest 1355, Codeforces Round 643 (Div. 2), 2020-05-16, had no `oldRating: 0` rows in `contest.ratingChanges`.
  - contest 1360, Codeforces Round 644 (Div. 3), 2020-05-24, had many `oldRating: 0` rows with first displayed ratings around 500-900.
  - contest 1358, Codeforces Round 645 (Div. 2), 2020-05-26, also had many `oldRating: 0` rows, showing that contest id alone is not a safe policy cutoff because contest ids and start times are not strictly ordered.

Open-source rating/performance references inspected:

- Carrot userscript fork: https://github.com/Yan233th/carrot-but-userscript
- Original Carrot extension: https://github.com/meooow25/carrot
- Yan fork performance/rating code:
  - https://raw.githubusercontent.com/Yan233th/carrot-but-userscript/main/src/rating/codeforces.ts
  - https://raw.githubusercontent.com/Yan233th/carrot-but-userscript/main/src/rating/predict.ts
- Original Carrot predictor:
  - https://raw.githubusercontent.com/meooow25/carrot/master/carrot/src/background/predict.js
- TLE rating calculator fallback:
  - https://github.com/cheran-senthil/TLE
  - https://raw.githubusercontent.com/cheran-senthil/TLE/master/tle/util/ranklist/rating_calculator.py
- Single-contest performance estimator:
  - https://github.com/NUMBART/single-contest-performance-rating

Carrot's model is the best starting point. It computes Codeforces-like seeds, ranks, deltas, global delta adjustment, and then treats performance as the assumed rating at which adjusted delta becomes non-positive. It also has a final-results path that maps `oldRating === 0` to a default 1400 rating for modern contests. That is necessary but not sufficient for full early-contest accuracy: after the 2020-05-24 new-account policy change, contests 2 through 6 also have hidden calculation-rating offsets even when `oldRating` is no longer 0. If the JavaScript estimator starts disagreeing with known cases, use TLE's `rating_calculator.py` as the next reference implementation because it is a compact Codeforces-style rating calculator with FFT-based seed computation and the same correction phases.

## Feature Feasibility

### 1. Find contests none of the handles have run

Feasible.

Data plan:

- Fetch `contest.list?gym=false` for regular contests.
- Fetch `contest.list?gym=true` for Gym candidates.
- Fetch each handle's `user.rating` and paged `user.status`.
- Build a touched contest set per handle:
  - Include every contest id in `user.rating`.
  - Include every contest id seen in `user.status`, regardless of verdict, by default. This makes "not run" mean "no visible submission at all".
  - Offer a later mode that only counts `OK` submissions if wanted, but default should be conservative.
- A candidate contest is fresh for the group when no handle has that contest id in its touched set.

Official contest filters:

- Phase: `FINISHED`.
- Contest name regex buckets for:
  - `Div. 4`
  - `Div. 3`
  - `Div. 2`
  - `Div. 1`
  - `Div. 1 + Div. 2`
- Exclude obvious non-target names such as `unrated`, `April Fools`, `Kotlin`, team contests, and non-round specials unless explicitly enabled later.
- Do not use `contest.standings` for this feature; the current public API forces full standings downloads for regular contests.

Gym filters:

- Use `contest.list?gym=true`.
- Filter by `phase === "FINISHED"`.
- Filter by optional `durationSeconds` lower/upper bounds. Blank bounds mean no duration limit.
- Recommend only public gyms discoverable through anonymous metadata. Private or group-only gyms are out of scope without authentication.

Risks:

- `user.status` may require many paged requests for active users. Implement a queue, progress display, cancellation, and localStorage caching.
- Division detection by contest name will never be perfect. Show the detected category and keep filters transparent.

### 2. Combined rating-change graph for N handles

Feasible and straightforward.

Data plan:

- Use `user.rating` for each handle.
- Plot `newRating` over time.
- Optional secondary display: per-contest delta bars or table rows.
- Align graph by date as default; add a "contest count" x-axis mode later if useful.

Implementation notes:

- No chart dependency is required for the first pass. A responsive inline SVG polyline chart is enough.
- Cache each handle's rating history.

### 3. Combined performance graph for N handles

Feasible as an estimated metric, not an official Codeforces value.

Recommended model:

- Primary high-confidence path:
  - For each contest in the selected users' histories, fetch `contest.ratingChanges?contestId=...`.
  - Build rows from official post-contest ranks and pre-contest displayed ratings from `contest.ratingChanges`.
  - Compute Codeforces-like deltas and performance using the Carrot algorithm.
  - Use a date-aware new-account adjustment, not a contest-id-only adjustment:
    - before the 2020-05-24 policy change, use the API old rating as given;
    - after the policy change, if a participant's displayed old rating is 0, use 1400 for calculation;
    - for selected handles, use their `user.rating` history index to reconstruct contests 2 through 6 with hidden offsets `[900, 550, 300, 150, 50]` before the displayed rating stabilizes;
    - subtract displayed bonuses `[500, 350, 250, 150, 100, 50]` from displayed deltas when showing an estimated true delta for those first 6 contests.
  - Display rank 1 as capped or annotated, because the zero-delta performance search returns infinity.
- Fast approximate path:
  - Invert rating changes from `user.rating` only when full standings are not loaded.
  - Mark this mode as approximate.
  - Do not trust naive inversion for the first rated contests.

Early-contest bonus handling:

- The implementation must include a validation harness before enabling the graph by default.
- Test against historical users' first several contests.
- Reconstruct official deltas from `contest.ratingChanges` plus standings.
- Compare reconstructed deltas to official `newRating - oldRating`.
- For modern new-account contests, test both the first-contest `oldRating === 0 -> 1400` rule and the first-six-contest displayed bonus schedule.
- Opponent seed distribution remains approximate unless the tool fetches every contestant's `user.rating` history, which is too slow for a static public API tool. The deployed graph should therefore label performance as estimated even after selected-handle early bonus reconstruction.

Practical UI plan:

- Use one shared comma-separated handle input.
- Split the four requested workflows into tabs: fresh contests, rating graph, performance graph, and head-to-head.
- Use Korean UI copy in the blog page, keeping Codeforces contest names/ranks as API-provided values.
- Add date range inputs to the rating and performance graph tabs.
- Start with a small per-handle performance contest limit to keep API time reasonable.
- Show endpoint progress because two seconds per request is visible.
- Cache standings and ratingChanges by contest id for at least 24 hours.

Risks:

- Full performance for handles with hundreds of contests can take a long time on the public API.
- Some very old contests or team/unrated contests may not produce usable performance. Mark them `N/A`.
- The metric is a reconstructed performance estimate, not a Codeforces-published field.

### 4. Two-handle historical head-to-head

Feasible and mostly already implemented in Kokiri Zoo.

Data plan:

- Fetch both `user.rating` histories.
- Intersect by `contestId`.
- For each shared rated contest:
  - Lower rank wins.
  - Equal rank is a tie.
  - Also show rating delta difference and rating movement.
- Summarize wins, ties, average rank difference, largest rank gap, and largest delta gap.

Scope note:

- "Together played rounds" should mean shared rated contests in public rating histories for the first pass.
- Practice/virtual shared attempts are harder to compare fairly because there is no official shared rank from `user.rating`.

## Implementation Shape In This Blog

Target files for a future implementation:

- Add a Projects entry in `src/pages/projects.astro`.
- Add `src/pages/codeforces-lab.astro`.
- Add `public/codeforces-lab/app.js`.
- Add optional `public/codeforces-lab/styles.css`, or keep page-scoped CSS in the Astro file if small.

Keep the page static and public-only:

- No API keys.
- No user login.
- No server-side proxy in the first pass.
- Direct Codeforces API calls through a throttled request queue.
- If CORS starts failing, show a clear fallback message and consider a later proxy/manual JSON import path.

Core modules inside `public/codeforces-lab/app.js`:

1. `parseHandles`
2. `fetchCodeforces`
3. `CodeforcesQueue`, enforcing one request per two seconds
4. `localCache`, with TTLs by endpoint
5. `loadUsers`
6. `loadRatingHistories`
7. `loadUserSubmissionsPaged`
8. `loadContests`
9. `findUntouchedContests`
10. `buildRatingSeries`
11. `buildHeadToHead`
12. `buildPerformanceSeries`
13. `renderSvgLineChart`
14. `renderTables`

Suggested cache TTLs:

- `contest.list`: 24 hours
- `user.info`: 1 hour
- `user.rating`: 1 hour
- `user.status` pages: 6 hours
- `contest.ratingChanges`: 24 hours when non-empty
- `contest.standings`: 24 hours for finished contests

## Build Order

1. Add the static Codeforces page shell and Projects link.
2. Port the Kokiri public API wrapper and head-to-head logic into vanilla browser JS.
3. Add merged rating graph.
4. Add untouched-contest search for regular official rounds.
5. Add Gym search and duration filter.
6. Add performance engine and validation harness.
7. Add performance graph with clear estimated labeling and first-six-contest bonus reconstruction for selected handles.
8. Run `npm.cmd run build`.
9. Verify with the Browser plugin on localhost:
   - Projects link opens.
   - Handle parsing works for comma-separated and newline-separated input.
   - The UI is Korean and the four feature tabs switch without overlap.
   - Blank Gym duration bounds do not force arbitrary defaults.
   - Rating and performance date ranges filter visible graph/table data.
   - API queue visibly throttles requests.
   - Rating graph renders for sample handles.
   - Head-to-head matches Kokiri behavior for a known pair.
   - Untouched contest search excludes contests with any visible submissions.
   - Performance graph labels approximate/final states correctly.

## Current Recommendation

Implement features 2 and 4 first because they rely only on `user.rating` and reuse Kokiri logic. Then add feature 1 with `user.status` paging and candidate contest filters. Implement feature 3 last, behind a clear "estimated performance" label and a validation harness, because it is the only part that can be subtly wrong if the early-contest rating behavior is oversimplified.
