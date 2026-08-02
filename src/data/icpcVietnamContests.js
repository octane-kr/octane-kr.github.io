const ARCHIVE_ROOT = 'https://icpcvn.github.io';
const UPSOLVE_ROOT = 'https://oj.vnoi.info/contest';

const board = (slug, sourcePath, variant = '') => ({
  slug,
  sourceUrl: /^https?:\/\//u.test(sourcePath) ? sourcePath : `${ARCHIVE_ROOT}/${sourcePath}`,
  variant,
});

const contest = (year, stage, upsolveSlug, scoreboards) => ({
  year,
  stage,
  upsolveUrl: `${UPSOLVE_ROOT}/${upsolveSlug}`,
  contestMinutes: 300,
  scoreboards,
});

export const icpcVietnamContests = [
  contest(2025, 'Regional', 'icpc25_regional', [
    board('2025-regional', '2025/regional/scoreboard.html'),
    board('2025-regional-hsgs', '2025/regional/scoreboard-hsgs.html', 'HSGS'),
  ]),
  contest(2025, 'National', 'icpc25_national', [
    board('2025-national', '2025/national/scoreboard.html'),
  ]),
  contest(2025, 'Central', 'icpc25_mt', [
    board('2025-central', '2025/central/scoreboard.html'),
  ]),
  contest(2025, 'Northern', 'icpc25_mb', [
    board('2025-northern', '2025/northern/scoreboard.html'),
  ]),
  contest(2024, 'Regional', 'icpc24_regional', [
    board('2024-regional', '2024/regional/scoreboard.html'),
    board('2024-regional-hsgs', '2024/regional/scoreboard-hsgs.html', 'HSGS'),
  ]),
  contest(2024, 'National', 'icpc24_national', [
    board('2024-national', '2024/national/scoreboard.html'),
  ]),
  contest(2024, 'Central', 'icpc24_mt', [
    board('2024-central', '2024/central/scoreboard.htm'),
  ]),
  contest(2024, 'Northern', 'icpc24_mb', [
    board('2024-northern', '2024/northern/scoreboard.htm'),
  ]),
  contest(2023, 'Regional', 'icpc23_regional', [
    board('2023-regional', '2023/regional/scoreboard.html'),
  ]),
  contest(2023, 'National', 'icpc23_national', [
    board('2023-national', '2023/national/scoreboard.html'),
  ]),
  contest(2023, 'Northern', 'icpc23_mb', [
    board('2023-northern', '2023/northern/scoreboard.html'),
  ]),
  contest(2023, 'Southern', 'icpc23_mn', [
    board('2023-southern', '2023/southern/scoreboard.html'),
  ]),
  contest(2023, 'Central', 'icpc23_mt', [
    board('2023-central', '2023/central/scoreboard.html'),
  ]),
  contest(2022, 'Regional', 'icpc22_regional', [
    board('2022-regional', '2022/regional/scoreboard.html'),
    board('2022-regional-hsgs', '2022/regional/hsgs-scoreboard.html', 'HSGS'),
  ]),
  contest(2022, 'National', 'icpc22_national', [
    board('2022-national', '2022/national/scoreboard.html'),
  ]),
  contest(2022, 'Northern', 'icpc22_mb', [
    board('2022-northern', '2022/northern/scoreboard.html'),
  ]),
  contest(2022, 'Central', 'icpc22_mt', [
    board('2022-central', '2022/central/scoreboard.html'),
  ]),
  contest(2022, 'Southern', 'icpc22_mn', [
    board('2022-southern', '2022/southern/scoreboard.html'),
  ]),
  contest(2021, 'Regional', 'icpc21_regional_m', [
    board('2021-regional', '2021/regional/scoreboard.html'),
  ]),
  contest(2021, 'National', 'icpc21_national', [
    board('2021-national', '2021/national/scoreboard.html'),
  ]),
  contest(2021, 'Southern', 'icpc21_mn', [
    board('2021-southern', '2021/southern/scoreboard.html'),
  ]),
  contest(2021, 'Central', 'icpc21_mt', [
    board('2021-central', '2021/central/scoreboard.html'),
  ]),
  contest(2021, 'Northern', 'icpc21_mb', [
    board('2021-northern', '2021/northern/scoreboard.html'),
  ]),
  contest(2020, 'Regional', 'icpc20_regional', [
    board('2020-regional', 'https://cantho20.kattis.com/contests/cantho20/standings'),
  ]),
  contest(2020, 'National', 'icpc20_national', [
    board(
      '2020-national',
      'https://vietnam-national20.kattis.com/contests/vietnam-national20/standings',
    ),
  ]),
  contest(2019, 'Regional', 'icpc19_regional', [
    board('2019-regional', 'https://danang19.kattis.com/contests/danang19/standings'),
  ]),
  contest(2019, 'National', 'icpc19_national', [
    board(
      '2019-national',
      'https://vietnam-national19.kattis.com/contests/vietnam-national19/standings',
    ),
  ]),
];

export const icpcVietnamScoreboards = icpcVietnamContests.flatMap((entry) =>
  entry.scoreboards.map((scoreboard) => ({
    ...scoreboard,
    year: entry.year,
    stage: entry.stage,
    upsolveUrl: entry.upsolveUrl,
    contestMinutes: entry.contestMinutes,
    label: `${entry.year} ${entry.stage}${scoreboard.variant ? ` · ${scoreboard.variant}` : ''}`,
  })),
);
