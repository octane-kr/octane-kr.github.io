import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

import { icpcVietnamScoreboards } from '../src/data/icpcVietnamContests.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, 'public', 'projects', 'icpc-vietnam', 'data');
const shouldWrite = process.argv.includes('--write');
const requestedId = process.argv.find((argument) => argument.startsWith('--id='))?.slice(5);
const selected = requestedId
  ? icpcVietnamScoreboards.filter((entry) => entry.slug === requestedId)
  : icpcVietnamScoreboards;

if (requestedId && selected.length === 0) {
  throw new Error(`Unknown scoreboard id: ${requestedId}`);
}

const generatedAt = new Date().toISOString();
const reports = [];

for (const entry of selected) {
  const response = await fetch(entry.sourceUrl);
  if (!response.ok) {
    throw new Error(`${entry.slug}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const payload = parseScoreboard(html, entry);
  validatePayload(payload);

  if (shouldWrite) {
    await mkdir(outputRoot, { recursive: true });
    await writeFile(
      resolve(outputRoot, `${entry.slug}.json`),
      `${JSON.stringify(makePublicPayload(payload))}\n`,
      'utf8',
    );
  }

  reports.push({
    id: entry.slug,
    format: payload.verification.sourceFormat,
    teams: payload.teams.length,
    problems: payload.problems.length,
    solved: payload.verification.solvedCells,
  });
}

console.table(reports);
console.log(shouldWrite ? `Wrote ${reports.length} payload(s).` : `Checked ${reports.length} payload(s).`);

function parseScoreboard(html, entry) {
  const document = parse(html);
  const sourceTitle = cleanSourceTitle(textContent(findFirst(document, (node) => node.tagName === 'title')));
  const vnojRows = findAll(document, (node) => node.tagName === 'tr' && /^user-/u.test(attribute(node, 'id')));
  const domjudgeRows = findAll(
    document,
    (node) => node.tagName === 'tr' && /^team:\d+$/u.test(attribute(node, 'id')),
  );
  const dnojRows = findAll(
    document,
    (node) => node.tagName === 'tr' && /^standing-/u.test(attribute(node, 'id')),
  );
  const kattisRows = findAll(
    document,
    (node) => node.tagName === 'tr'
      && directChildren(node, 'td').some((cell) => hasClass(cell, 'standings-cell-score')),
  );

  let parsed;
  if (vnojRows.length > 0) {
    parsed = parseVnoj(document, vnojRows);
  } else if (domjudgeRows.length > 0) {
    parsed = parseDomjudge(document, domjudgeRows);
  } else if (dnojRows.length > 0) {
    parsed = parseDnoj(document, dnojRows);
  } else if (kattisRows.length > 0) {
    parsed = parseKattis(document, kattisRows, entry.sourceUrl);
  } else {
    throw new Error(`${entry.slug}: unsupported scoreboard markup`);
  }

  const solvedCells = parsed.teams.reduce(
    (sum, team) => sum + team.results.filter((result) => result.status === 'solved').length,
    0,
  );
  const failedCells = parsed.teams.reduce(
    (sum, team) => sum + team.results.filter((result) => result.status === 'failed').length,
    0,
  );

  return {
    schemaVersion: 1,
    generatedAt,
    contest: {
      id: entry.slug,
      label: entry.label,
      year: entry.year,
      stage: entry.stage,
      variant: entry.variant,
      contestMinutes: entry.contestMinutes,
      sourceTitle,
      sourceUrl: entry.sourceUrl,
      upsolveUrl: entry.upsolveUrl,
      replayAccuracy: 'accepted-only',
    },
    problems: parsed.problems,
    teams: parsed.teams,
    verification: {
      sourceFormat: parsed.sourceFormat,
      teamCount: parsed.teams.length,
      problemCount: parsed.problems.length,
      solvedCells,
      failedCells,
    },
  };
}

function parseVnoj(document, rows) {
  const headerRow = findFirst(
    document,
    (node) => node.tagName === 'tr'
      && Boolean(findFirst(node, (child) => hasClass(child, 'problem-code'))),
  );
  const headerCells = directChildren(headerRow, 'th');
  const problemColumns = headerCells
    .map((header, columnIndex) => ({ header, columnIndex }))
    .filter(({ header }) => findFirst(header, (child) => hasClass(child, 'problem-code')));
  const problems = problemColumns.map(({ header }, index) => {
    const codeNode = findFirst(header, (node) => hasClass(node, 'problem-code'));
    const link = findFirst(header, (node) => node.tagName === 'a');
    return {
      id: normalizeText(textContent(codeNode)) || String(index + 1),
      label: problemLabel(index),
      title: normalizeText(textContent(codeNode)),
      sourceUrl: absoluteUrl(attribute(link, 'href')),
    };
  });

  const teams = rows.map((row, sourceOrder) => {
    const cells = directChildren(row, 'td');
    const pointsCell = cells.find((cell) => hasClass(cell, 'user-points'));
    const penaltyCell = cells.find((cell) => hasClass(cell, 'user-penalty'));
    const profileLink = findFirst(
      cells[1],
      (node) => node.tagName === 'a' && /\/user\//u.test(attribute(node, 'href')),
    );
    const userTagNode = findFirst(cells[1], (node) => attribute(node, 'data-user-tag') !== '');
    const organizationNode = findFirst(cells[1], (node) => hasClass(node, 'uni-name'))
      || findFirst(cells[1], (node) => hasClass(node, 'organization'));
    const rankText = normalizeText(textContent(cells[0]));
    const finalRank = parseInteger(rankText);
    const disqualified = hasClass(row, 'disqualified');
    const results = problems.map((problem, problemIndex) => {
      const cell = cells[problemColumns[problemIndex].columnIndex];
      const attempts = parseAttempts(textContent(cell));
      const submissionsLink = findFirst(cell, (node) => node.tagName === 'a');

      if (hasClass(cell, 'full-score')) {
        const exactTime = normalizeText(
          textContent(findFirst(cell, (node) => hasClass(node, 'solving-time'))),
        );
        const minuteText = normalizeText(
          textContent(findFirst(cell, (node) => hasClass(node, 'solving-time-minute'))),
        );
        const acceptedAtSeconds = parseClockDuration(exactTime);
        return {
          problemId: problem.id,
          status: 'solved',
          attempts,
          acceptedMinute: parseInteger(minuteText) ?? Math.floor(acceptedAtSeconds / 60),
          acceptedAtSeconds,
          firstSolve: hasClass(cell, 'first-solve'),
          submissionsUrl: absoluteUrl(attribute(submissionsLink, 'href')),
        };
      }

      if (hasClass(cell, 'failed-score')) {
        return {
          problemId: problem.id,
          status: 'failed',
          attempts,
          acceptedMinute: null,
          acceptedAtSeconds: null,
          firstSolve: false,
          submissionsUrl: absoluteUrl(attribute(submissionsLink, 'href')),
        };
      }

      return emptyResult(problem.id);
    });

    const computedSolved = results.filter((result) => result.status === 'solved').length;
    const computedPenalty = results
      .filter((result) => result.status === 'solved')
      .reduce(
        (sum, result) => sum + result.acceptedMinute + 20 * Math.max(0, result.attempts - 1),
        0,
      );

    return {
      id: attribute(row, 'id').replace(/^user-/u, '') || `team-${sourceOrder + 1}`,
      name: normalizeText(textContent(profileLink)) || `Team ${sourceOrder + 1}`,
      organization: normalizeText(textContent(organizationNode)),
      category: normalizeText(attribute(userTagNode, 'data-user-tag')).replace(/^None$/u, ''),
      profileUrl: absoluteUrl(attribute(profileLink, 'href')),
      ranked: finalRank != null && !disqualified,
      disqualified,
      finalRank: disqualified ? null : finalRank,
      finalSolved: disqualified
        ? computedSolved
        : (parseInteger(normalizeText(textContent(pointsCell))) ?? 0),
      finalPenalty: disqualified
        ? computedPenalty
        : (parseInteger(normalizeText(textContent(penaltyCell))) ?? 0),
      sourceOrder,
      results,
    };
  });

  return { sourceFormat: 'vnoj', problems, teams };
}

function parseDomjudge(document, rows) {
  const problemHeaders = findAll(document, (node) => {
    if (node.tagName !== 'th') return false;
    return /^problem\s+/iu.test(attribute(node, 'title'));
  });
  const problems = problemHeaders.map((header, index) => {
    const badge = findFirst(header, (node) => hasClass(node, 'problem-badge'));
    const title = normalizeText(attribute(header, 'title').replace(/^problem\s+/iu, ''));
    const label = normalizeText(textContent(badge))
      || title.match(/^([A-Z0-9]+)(?:\s|$)/u)?.[1]
      || problemLabel(index);
    const link = findFirst(header, (node) => node.tagName === 'a');
    return {
      id: label,
      label,
      title: title === label ? '' : title,
      sourceUrl: absoluteUrl(attribute(link, 'href')),
    };
  });

  const teams = rows.map((row, sourceOrder) => {
    const cells = directChildren(row, 'td');
    const rankCell = cells.find((cell) => hasClass(cell, 'scorepl'));
    const teamCell = cells.find((cell) => hasClass(cell, 'scoretn'));
    const solvedCell = cells.find((cell) => hasClass(cell, 'scorenc'));
    const penaltyCell = cells.find((cell) => hasClass(cell, 'scorett'));
    let problemCells = cells.filter((cell) => hasClass(cell, 'score_cell'));
    if (problemCells.length !== problems.length) {
      const penaltyIndex = cells.indexOf(penaltyCell);
      problemCells = cells.slice(penaltyIndex + 1, penaltyIndex + 1 + problems.length);
    }
    const teamLink = findFirst(teamCell, (node) => node.tagName === 'a');
    const teamNameNode = findFirst(
      teamCell,
      (node) => hasClass(node, 'forceWidth') && !hasClass(node, 'univ'),
    );
    const organizationNode = findFirst(teamCell, (node) => hasClass(node, 'univ'));
    const categoryNode = findFirst(teamCell, (node) => hasClass(node, 'badge'));
    const finalRank = parseInteger(normalizeText(textContent(rankCell)));
    const results = problems.map((problem, problemIndex) => {
      const cell = problemCells[problemIndex];
      const correct = findFirst(
        cell,
        (node) => hasClass(node, 'score_correct') || hasClass(node, 'score_first'),
      );
      const incorrect = findFirst(cell, (node) => hasClass(node, 'score_incorrect'));
      const resultText = normalizeText(textContent(correct || incorrect || cell));
      const legacyNumbers = resultText.match(/\d+/gu)?.map(Number) || [];
      const attempts = parseAttempts(resultText) || legacyNumbers[0] || 0;

      if (correct) {
        const acceptedMinute = /tr(?:y|ies)/iu.test(resultText)
          ? legacyNumbers[0]
          : legacyNumbers[1];
        return {
          problemId: problem.id,
          status: 'solved',
          attempts,
          acceptedMinute,
          acceptedAtSeconds: acceptedMinute * 60,
          firstSolve: hasClass(correct, 'score_first')
            || Boolean(findFirst(cell, (node) => /first solved/iu.test(attribute(node, 'title')))),
          submissionsUrl: absoluteUrl(attribute(findFirst(cell, (node) => node.tagName === 'a'), 'href')),
        };
      }

      if (incorrect) {
        return {
          problemId: problem.id,
          status: 'failed',
          attempts,
          acceptedMinute: null,
          acceptedAtSeconds: null,
          firstSolve: false,
          submissionsUrl: absoluteUrl(attribute(findFirst(cell, (node) => node.tagName === 'a'), 'href')),
        };
      }

      return emptyResult(problem.id);
    });

    return {
      id: attribute(row, 'id').replace(/^team:/u, '') || `team-${sourceOrder + 1}`,
      name: normalizeText(attribute(teamCell, 'title'))
        || normalizeText(textContent(teamNameNode))
        || normalizeText(textContentSkipping(teamLink, (node) => hasClass(node, 'univ')))
        || `Team ${sourceOrder + 1}`,
      organization: normalizeText(textContent(organizationNode)),
      category: normalizeText(textContent(categoryNode)),
      profileUrl: absoluteUrl(attribute(teamLink, 'href')),
      ranked: finalRank != null,
      finalRank,
      finalSolved: parseInteger(normalizeText(textContent(solvedCell))) ?? 0,
      finalPenalty: parseInteger(normalizeText(textContent(penaltyCell))) ?? 0,
      sourceOrder,
      results,
    };
  });

  return { sourceFormat: 'domjudge', problems, teams };
}

function parseDnoj(document, rows) {
  const headerRow = findFirst(
    document,
    (node) => node.tagName === 'tr' && directChildren(node, 'th').some((cell) => hasClass(cell, 'th-p-best')),
  );
  const problemHeaders = directChildren(headerRow, 'th').filter((cell) => hasClass(cell, 'th-p-best'));
  const problems = problemHeaders.map((header, index) => {
    const label = normalizeText(textContent(header)).split(/\s+/u)[0] || problemLabel(index);
    return {
      id: label,
      label,
      title: '',
      sourceUrl: '',
    };
  });

  const teams = rows.map((row, sourceOrder) => {
    const cells = directChildren(row, 'td');
    const rankCell = cells.find((cell) => hasClass(cell, 'td-rank'));
    const participantCell = cells.find((cell) => hasClass(cell, 'td-participant'));
    const totalCell = cells.find((cell) => hasClass(cell, 'td-total'));
    const problemCells = cells.filter((cell) => hasClass(cell, 'td-p-best'));
    const nameNode = findFirst(participantCell, (node) => hasClass(node, 'acc-realname'));
    const usernameNode = findFirst(participantCell, (node) => hasClass(node, 'username'));
    const organizationNode = findFirst(participantCell, (node) => hasClass(node, 'acc-org'));
    const totalPointsNode = findFirst(totalCell, (node) => hasClass(node, 'points'));
    const totalTimeNode = findFirst(totalCell, (node) => hasClass(node, 'time'));
    const finalRank = parseInteger(normalizeText(textContent(rankCell)));

    const results = problems.map((problem, problemIndex) => {
      const cell = problemCells[problemIndex];
      const container = findFirst(cell, (node) => hasClass(node, 'points-container'));
      const attempts = parseInteger(
        normalizeText(textContent(findFirst(cell, (node) => hasClass(node, 'tries')))),
      ) ?? 0;

      if (container && hasClass(container, 'full-points')) {
        const acceptedMinute = parseInteger(
          normalizeText(textContent(findFirst(cell, (node) => hasClass(node, 'time')))),
        );
        return {
          problemId: problem.id,
          status: 'solved',
          attempts,
          acceptedMinute,
          acceptedAtSeconds: acceptedMinute * 60,
          firstSolve: false,
          submissionsUrl: '',
        };
      }

      if (container && attempts > 0) {
        return {
          problemId: problem.id,
          status: 'failed',
          attempts,
          acceptedMinute: null,
          acceptedAtSeconds: null,
          firstSolve: false,
          submissionsUrl: '',
        };
      }

      return emptyResult(problem.id);
    });

    return {
      id: attribute(row, 'id').replace(/^standing-/u, '') || `team-${sourceOrder + 1}`,
      name: normalizeText(textContent(nameNode))
        || normalizeText(textContent(usernameNode))
        || `Team ${sourceOrder + 1}`,
      organization: normalizeText(textContent(organizationNode)),
      category: '',
      profileUrl: '',
      ranked: finalRank != null,
      disqualified: false,
      finalRank,
      finalSolved: parseInteger(normalizeText(textContent(totalPointsNode))) ?? 0,
      finalPenalty: parseInteger(normalizeText(textContent(totalTimeNode))) ?? 0,
      sourceOrder,
      results,
    };
  });

  return { sourceFormat: 'dnoj', problems, teams };
}

function parseKattis(document, rows, sourceUrl) {
  const problemHeaders = findAll(
    document,
    (node) => node.tagName === 'th' && hasClass(node, 'standings-cell-problem'),
  );
  const problems = problemHeaders.map((header, index) => {
    const label = normalizeText(textContent(header)) || problemLabel(index);
    return {
      id: label,
      label,
      title: '',
      sourceUrl: '',
    };
  });

  const teams = rows.map((row, sourceOrder) => {
    const cells = directChildren(row, 'td');
    const teamCell = cells.find((cell) => hasClass(cell, 'standings-cell--expand'));
    const scoreCell = cells.find((cell) => hasClass(cell, 'standings-cell-score'));
    const timeCell = cells.find((cell) => hasClass(cell, 'standings-cell-time'));
    const problemCells = cells.filter((cell) => hasClass(cell, 'standings-cell-problem'));
    const teamLink = findFirst(
      teamCell,
      (node) => node.tagName === 'a' && /\/teams\//u.test(attribute(node, 'href')),
    );
    const imageTitles = cells
      .flatMap((cell) => findAll(cell, (node) => node.tagName === 'img'))
      .map((image) => normalizeText(attribute(image, 'title')))
      .filter(Boolean);
    const finalRank = parseInteger(normalizeText(textContent(cells[0])));

    const results = problems.map((problem, problemIndex) => {
      const cell = problemCells[problemIndex];
      const solved = findFirst(
        cell,
        (node) => hasClass(node, 'solved') || hasClass(node, 'first'),
      );
      const attempted = findFirst(cell, (node) => hasClass(node, 'attempted'));
      const attempts = parseInteger(
        normalizeText(
          textContent(
            findFirst(cell, (node) => hasClass(node, 'standings-table-result-cell-primary')),
          ),
        ),
      ) ?? 0;

      if (solved) {
        const acceptedMinute = parseInteger(
          normalizeText(
            textContent(
              findFirst(cell, (node) => hasClass(node, 'standings-table-result-cell-time')),
            ),
          ),
        );
        return {
          problemId: problem.id,
          status: 'solved',
          attempts,
          acceptedMinute,
          acceptedAtSeconds: acceptedMinute * 60,
          firstSolve: hasClass(solved, 'first'),
          submissionsUrl: '',
        };
      }

      if (attempted && attempts > 0) {
        return {
          problemId: problem.id,
          status: 'failed',
          attempts,
          acceptedMinute: null,
          acceptedAtSeconds: null,
          firstSolve: false,
          submissionsUrl: '',
        };
      }

      return emptyResult(problem.id);
    });

    return {
      id: attribute(teamLink, 'href').split('/').filter(Boolean).at(-1) || `team-${sourceOrder + 1}`,
      name: normalizeText(textContent(teamLink)) || `Team ${sourceOrder + 1}`,
      organization: imageTitles.at(-1) || '',
      category: '',
      profileUrl: relativeUrl(attribute(teamLink, 'href'), sourceUrl),
      ranked: finalRank != null,
      disqualified: false,
      finalRank,
      finalSolved: parseInteger(normalizeText(textContent(scoreCell))) ?? 0,
      finalPenalty: parseInteger(normalizeText(textContent(timeCell))) ?? 0,
      sourceOrder,
      results,
    };
  });

  return { sourceFormat: 'kattis', problems, teams };
}

function validatePayload(payload) {
  const { contest, problems, teams } = payload;
  if (problems.length === 0 || teams.length === 0) {
    throw new Error(`${contest.id}: empty scoreboard`);
  }

  const teamIds = new Set();
  const errors = [];
  for (const team of teams) {
    if (teamIds.has(team.id)) errors.push(`duplicate team ${team.id}`);
    teamIds.add(team.id);
    if (team.results.length !== problems.length) errors.push(`${team.id}: result count`);

    const solved = team.results.filter((result) => result.status === 'solved');
    const penalty = solved.reduce(
      (sum, result) => sum + result.acceptedMinute + 20 * Math.max(0, result.attempts - 1),
      0,
    );
    if (solved.length !== team.finalSolved) errors.push(`${team.id}: solved`);
    if (penalty !== team.finalPenalty) errors.push(`${team.id}: penalty ${penalty}/${team.finalPenalty}`);
  }

  if (errors.length > 0) {
    throw new Error(`${contest.id}: ${errors.slice(0, 8).join(', ')}`);
  }
}

function makePublicPayload(payload) {
  return {
    schemaVersion: payload.schemaVersion,
    generatedAt: payload.generatedAt,
    contest: payload.contest,
    problems: payload.problems.map((problem) => ({
      id: problem.id,
      label: problem.label,
      ...(problem.title ? { title: problem.title } : {}),
    })),
    teams: payload.teams.map((team) => ({
      id: team.id,
      name: team.name,
      ...(team.organization ? { organization: team.organization } : {}),
      ...(team.category ? { category: team.category } : {}),
      ...(team.ranked === false ? { ranked: false } : {}),
      ...(team.disqualified ? { disqualified: true } : {}),
      finalRank: team.finalRank,
      sourceOrder: team.sourceOrder,
      results: team.results.map((result) => ({
        status: result.status,
        ...(result.attempts > 0 ? { attempts: result.attempts } : {}),
        ...(result.status === 'solved'
          ? {
              acceptedMinute: result.acceptedMinute,
              acceptedAtSeconds: result.acceptedAtSeconds,
            }
          : {}),
      })),
    })),
    verification: payload.verification,
  };
}

function emptyResult(problemId) {
  return {
    problemId,
    status: 'empty',
    attempts: 0,
    acceptedMinute: null,
    acceptedAtSeconds: null,
    firstSolve: false,
    submissionsUrl: '',
  };
}

function findAll(root, predicate, output = []) {
  if (!root) return output;
  if (predicate(root)) output.push(root);
  for (const child of root.childNodes || []) findAll(child, predicate, output);
  return output;
}

function findFirst(root, predicate) {
  if (!root) return null;
  if (predicate(root)) return root;
  for (const child of root.childNodes || []) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return null;
}

function directChildren(node, tagName) {
  return (node?.childNodes || []).filter((child) => child.tagName === tagName);
}

function attribute(node, name) {
  return node?.attrs?.find((item) => item.name === name)?.value || '';
}

function hasClass(node, className) {
  return attribute(node, 'class').split(/\s+/u).includes(className);
}

function textContent(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(textContent).join(' ');
}

function textContentSkipping(node, shouldSkip) {
  if (!node || shouldSkip(node)) return '';
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map((child) => textContentSkipping(child, shouldSkip)).join(' ');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/gu, ' ').trim();
}

function parseInteger(value) {
  const match = String(value || '').match(/-?\d+/u);
  return match ? Number(match[0]) : null;
}

function parseAttempts(value) {
  return parseInteger(String(value || '').match(/\d+\s+tr(?:y|ies)/iu)?.[0]) ?? 0;
}

function parseClockDuration(value) {
  const parts = String(value || '').split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function problemLabel(index) {
  return String.fromCharCode(65 + index);
}

function absoluteUrl(value) {
  if (!value) return '';
  try {
    return new URL(value, 'https://icpcvn.github.io/').href;
  } catch {
    return '';
  }
}

function relativeUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return '';
  }
}

function cleanSourceTitle(value) {
  return normalizeText(value)
    .replace(/\s+Rankings\s+-\s+VNOJ(?::\s*VNOI Online Judge)?$/iu, '')
    .replace(/\s+-\s+DOMjudge$/iu, '');
}
