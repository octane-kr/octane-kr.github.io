# UCPC Scoreboard Time Machine Plan

## Goal

Add a new blog tab for a static UCPC scoreboard time machine and commit only the files needed for that feature.

The page should let a visitor select a UCPC archive scoreboard, enter the freeze time and the time they want to inspect, and see standings for that point in time. It is meant for running UCPC virtual contests without being spoiled by the final scoreboard.

## User-Facing Notes

- The tool is for UCPC virtual contest practice.
- It uses UCPC Spotboard data published under `https://static.ucpc.me/archive/ucpc/`.
- The visitor enters a freeze time first, then the time to view.
- Team-name search should be available.
- The implementation was made with Codex, so users should treat results as best-effort and possibly buggy.

## Implementation Shape

- Add a nav tab in `src/layouts/BlogLayout.astro`.
- Add the tool page at `src/pages/ucpc-scoreboard.astro`.
- Keep the initial render spoiler-safe: when the page first opens, and when the selected contest changes, render `0:00`.
- Keep the data source UCPC-only. A fixed manifest of supported archive scoreboards is acceptable; generic Spotboard URL conversion is out of scope for this pass.
- Final implementation direction: commit the previously verified static UCPC snapshot under `public/ucpc-scoreboard/data/`. This avoids depending on runtime CORS during blog visits.
- Tiebreaking at `0:00` must avoid leaking final rank. Use visible score fields first, then stable team labels or ids.
- Use the existing editorial visual language: no hero marketing section, no nested cards, no decorative gradients.

## Progress Log

- Created `AGENTS.md` and this implementation note.
- Copied the verified 17-scoreboard UCPC data snapshot into `public/ucpc-scoreboard/data/`.
- Added the `/ucpc-scoreboard/` page, nav tab, and client renderer.
- The renderer resets each loaded contest to `0:00` and sorts full ties by team name/id rather than final rank.

## Verification

- Run `npm.cmd run build`.
- Run the site locally and verify with the Browser plugin:
  - the nav tab opens the UCPC page,
  - the first rendered view is `0:00`,
  - contest switching resets the view time to `0:00`,
  - freeze time and current time inputs do not overwrite each other,
  - team-name search filters rows,
  - no obvious console errors appear.
- Stage and commit only UCPC feature files and any generated Lens index changes required by the build.
