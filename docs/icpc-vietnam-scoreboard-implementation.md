# Vietnam ICPC Archive / Dynamic Scoreboards

## Scope

- The Projects hub links to `/projects/icpc-vietnam/`.
- The archive lists only contests with both a working VNOJ upsolving contest and a replayable final scoreboard.
- Supported contests: 27 contests from 2019 through 2025.
- The 2022, 2024, and 2025 Regional contests also expose their HSGS scoreboard as a variant of the same contest.
- 2024 Southern is excluded because no VNOJ upsolving contest is listed.
- 2025 Southern is excluded because the linked VNOJ contest key does not exist.

## Data

- `src/data/icpcVietnamContests.js` is the source catalog.
- `npm.cmd run generate:icpc-vietnam` fetches the public final scoreboards and writes normalized payloads under `public/projects/icpc-vietnam/data/`.
- The generator supports VNOJ, DOMjudge, DNOJ, and Kattis snapshots.
- Generated payloads are committed. The normal Astro build does not fetch remote scoreboards.
- Each generated team is checked against the source final Solved and Penalty values before a payload is written.

## Replay Rules

- A solved problem appears at its recorded accepted time.
- Penalty uses the recorded accepted minute plus 20 minutes for each earlier attempt.
- Ranking uses Solved, Penalty, then the last accepted minute.
- Complete ties use a stable team label and id so the initial `0:00` view does not reveal final order.
- Failed-only cells are hidden before contest end because their individual attempt times are unavailable.
- At `5:00`, failed totals and the source final row order/ranks are shown.
- Freeze replay is intentionally omitted because individual submission times are unavailable.

## Verification

- Build with `npm.cmd run build`.
- Check the archive and at least one page from every source format in a browser.
- Verify `0:00`, an exact VNOJ accepted-time boundary, `5:00`, search, direct/clock modes, and mobile table overflow.
- After deployment, verify the Projects entry, archive, one VNOJ page, and one non-VNOJ page on the public site.
