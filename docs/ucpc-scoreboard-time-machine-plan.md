# Projects / UCPC Dynamic Scoreboard Plan

## Goal

Maintain the deployed UCPC scoreboard tool as the first entry in a broader `Projects` area, under the project name `UCPC 동적 스코어보드`, then commit only the files needed for that feature.

The page should let a visitor select a UCPC archive scoreboard, enter the freeze time and the time they want to inspect, and see standings for that point in time. It is meant for running UCPC virtual contests without being spoiled by the final scoreboard.

## User-Facing Notes

- The tool is for UCPC virtual contest practice.
- It uses UCPC Spotboard data published under `https://static.ucpc.me/archive/ucpc/`.
- The visitor can either enter the contest elapsed time directly, or enter a real start time and current time so the page computes the elapsed contest time.
- Team-name search should be available.
- If the freeze time is left blank, the page should show an unfrozen scoreboard for the selected time.
- The implementation was made with Codex, so users should treat results as best-effort and possibly buggy.

## Implementation Shape

- Replace the direct `UCPC` nav tab in `src/layouts/BlogLayout.astro` with a `Projects` nav tab.
- Add a `src/pages/projects.astro` hub page.
- Put `UCPC 동적 스코어보드` as the first project entry on the hub, linking to `/ucpc-scoreboard/`.
- Keep `src/pages/ucpc-scoreboard.astro` as the actual tool page.
- Keep the initial render spoiler-safe: when the page first opens, and when the selected contest changes, render `0:00`.
- Keep the data source UCPC-only. A fixed manifest of supported archive scoreboards is acceptable; generic Spotboard URL conversion is out of scope for this pass.
- Final implementation direction: commit the previously verified static UCPC snapshot under `public/ucpc-scoreboard/data/`. This avoids depending on runtime CORS during blog visits.
- Tiebreaking at `0:00` must avoid leaking final rank. Use visible score fields first, then stable team labels or ids.
- Use the existing editorial visual language: no hero marketing section, no nested cards, no decorative gradients.

## Time Input Modes

Keep both modes available, because the new mode is a convenience layer over the existing elapsed-minute renderer.

1. Elapsed mode
   - This is the current behavior.
   - The user enters `경과 시간` as contest elapsed time, such as `0:00`, `2:17`, or `137`.
   - The renderer uses that value directly.

2. Clock mode
   - Add inputs for `시작 시각` and `현재 시각`.
   - The page computes `elapsed = current clock time - start clock time`.
   - The computed elapsed time is clamped to the selected contest length and then passed into the same renderer used by elapsed mode.
   - This should not change the scoreboard calculation core.
   - Support ordinary `HH:MM` values. If current time is earlier than start time, treat it as the next day so overnight virtual contests are not immediately broken.
   - Show the computed elapsed time in a small status line so the user can see what is being rendered.
   - Invalid or missing clock inputs should not mutate the previous valid rendered time.

The mode control should be low-chrome and consistent with the blog style. A small segmented text toggle is enough.

## Progress Log

- Created `AGENTS.md` and this implementation note.
- Copied the verified 17-scoreboard UCPC data snapshot into `public/ucpc-scoreboard/data/`.
- Added the `/ucpc-scoreboard/` page, nav tab, and client renderer.
- The renderer resets each loaded contest to `0:00` and sorts full ties by team name/id rather than final rank.
- User confirmed the deployed page works in the browser.
- Implementing the next patch now:
  - `Projects` nav/hub replaces the direct `UCPC` nav entry.
  - User-facing project name is `UCPC 동적 스코어보드`.
  - The tool keeps elapsed-time mode and adds clock-time mode as a UI layer.
- Implementation completed:
  - Added `src/pages/projects.astro`.
  - Reworked `/ucpc-scoreboard/` copy and layout so the intro, controls, and scoreboard share one centered working width.
  - Added elapsed/clock time mode controls.
  - Verified build and browser behavior on desktop and mobile widths.

## Completed Patch Checklist

1. Navigation
   - Changed the top nav label/link from `UCPC` to `Projects`.
   - `Projects` links to `/projects/`, not directly to the scoreboard tool.

2. Projects hub
   - Added `src/pages/projects.astro`.
   - Kept the page simple and editorial: a heading, a short note that this is where small toys/tools live, and a list of project entries.
   - The first entry is `UCPC 동적 스코어보드`.
   - Entry metadata describes it as a virtual contest project and links to `/ucpc-scoreboard/`.
   - Avoided marketing hero layout, heavy cards, gradients, or nested cards.

3. UCPC page wording
   - Explained that leaving `프리즈 시점` blank shows a scoreboard without freeze.
   - Renamed user-facing project/page wording to `UCPC 동적 스코어보드`.
   - Rephrased the intro without changing its requested meaning.

4. Time input modes
   - Added a mode toggle for elapsed mode versus clock mode.
   - Kept elapsed mode as the default.
   - In clock mode, collect `시작 시각` and `현재 시각`, compute elapsed minutes, and render via the existing `renderAt(elapsed)` path.
   - Kept freeze independent. Freeze remains an elapsed contest time field, and blank freeze remains unfrozen.

5. Text clipping / awkward wrapping
   - Gave the intro, controls, and scoreboard the same centered working width.
   - Kept the scoreboard's own horizontal overflow inside `.ucpc-table-wrap`.
   - Applied Korean word-boundary wrapping to the UCPC intro and Projects descriptions.

6. Verification
   - Ran `npm.cmd run build`.
   - Used the Browser plugin on the locally served page:
     - nav shows `Projects`,
     - `/projects/` opens,
     - first project links to `/ucpc-scoreboard/`,
     - UCPC page still starts at `0:00`,
     - blank freeze still shows unfrozen standings,
     - elapsed mode still accepts direct contest elapsed time,
     - clock mode computes elapsed time from `시작 시각` and `현재 시각`,
     - clock mode handles current time earlier than start time as next-day time,
     - intro text is not clipped at desktop and mobile widths.

## UCPC 2026 Qualifier Note

- Updated `UCPC 2026 예선` to use the archived `contest.json` and `runs.json` files after they became available.
- The payload now includes full accepted and rejected submission history, so the temporary AC-only notice was removed.

## UCPC 2026 Final Note

- Added `UCPC 2026 본선` from the archived `contest.json` and `runs.json` files.
- Placed it first in the manifest so the latest contest remains the default selection while the initial rendered time stays at `0:00`.

## Spoiler-Safe Input Patch (completed 2026-07-13)

- Keep time fields as drafts. Typing, changing focus, and switching modes must not render a different scoreboard.
- Apply the elapsed or clock time together with the freeze point only when the visitor presses Enter or selects `보기`.
- Keep the previous scoreboard when any draft value is invalid.
- In clock mode, fill the current clock value from the visitor's device without applying it automatically, and provide a manual refresh control.
- Keep clock values editable and preserve the existing next-day calculation when the current clock value is earlier than the start clock value.
- Use `경과 시간` for durations, `시작 시각` and `현재 시각` for clock points, and `프리즈 시점` for the freeze point on the contest timeline.
- Hide final submission counts and first/last submission metadata from the spoiler-safe initial view.
- Localize loading, error, metadata, tooltip, and accessibility copy while retaining the original scoreboard column vocabulary.
- Use native clock inputs on mobile and version static scoreboard assets per site build to avoid stale manifest and payload caches.
- Verified that draft typing leaves the rendered board unchanged, Enter and `보기` apply atomically, invalid drafts preserve the previous board, and overnight clock calculation still works.
- Verified the default `UCPC 2026 본선` view and responsive layouts at desktop, intermediate, and mobile widths with the Browser plugin.
