(function () {
  "use strict";

  const root = document.querySelector("[data-vietnam-scoreboard]");
  if (!root) return;

  const payloadUrl = root.dataset.payloadUrl;
  const modeButtons = Array.from(root.querySelectorAll("[data-time-mode]"));
  const timePanels = Array.from(root.querySelectorAll("[data-time-panel]"));
  const currentInput = root.querySelector("[data-current-time]");
  const freezeInput = root.querySelector("[data-freeze-time]");
  const startClockInput = root.querySelector("[data-start-clock-time]");
  const currentClockInput = root.querySelector("[data-current-clock-time]");
  const freezeClockInput = root.querySelector("[data-freeze-clock-time]");
  const refreshCurrentTimeButton = root.querySelector("[data-refresh-current-time]");
  const applyTimeButton = root.querySelector("[data-apply-time]");
  const searchInput = root.querySelector("[data-team-search]");
  const metaNode = root.querySelector("[data-scoreboard-meta]");
  const appliedTimeNode = root.querySelector("[data-applied-time]");
  const tableNode = root.querySelector("[data-scoreboard-table]");
  const headNode = root.querySelector("[data-scoreboard-head]");
  const bodyNode = root.querySelector("[data-scoreboard-body]");
  const noteNode = root.querySelector("[data-scoreboard-note]");
  const errorNode = root.querySelector("[data-scoreboard-error]");

  let payload = null;
  let contest = null;
  let problems = [];
  let teams = [];
  let contestSeconds = 0;
  let currentSeconds = 0;
  let freezeSeconds = null;
  let timeMode = "elapsed";

  bindControls();
  loadPayload().catch(showFatalError);

  async function loadPayload() {
    const response = await fetch(payloadUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다. (${response.status})`);

    payload = await response.json();
    contest = payload.contest;
    problems = Array.isArray(payload.problems) ? payload.problems : [];
    teams = Array.isArray(payload.teams) ? payload.teams : [];
    contestSeconds = Number(contest.contestMinutes || 300) * 60;

    if (problems.length === 0 || teams.length === 0) {
      throw new Error("순위표 데이터가 비어 있습니다.");
    }

    metaNode.textContent = `${teams.length}팀 · ${problems.length}문제 · ${formatDuration(contestSeconds)}`;
    tableNode.style.minWidth = `${Math.max(920, 460 + problems.length * 46)}px`;
    renderAt(0);
  }

  function bindControls() {
    for (const button of modeButtons) {
      button.addEventListener("click", () => setTimeMode(button.dataset.timeMode));
    }

    for (const input of [currentInput, freezeInput, startClockInput, currentClockInput, freezeClockInput]) {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        applyDraftTime();
      });
      input.addEventListener("input", () => setInputInvalid(input, false));
    }

    applyTimeButton.addEventListener("click", applyDraftTime);
    refreshCurrentTimeButton.addEventListener("click", setCurrentClockToNow);
    searchInput.addEventListener("input", () => {
      if (payload) renderAt(currentSeconds, { syncInput: false });
    });
  }

  function setTimeMode(nextMode) {
    if (nextMode !== "elapsed" && nextMode !== "clock") return;
    timeMode = nextMode;
    if (timeMode === "elapsed") {
      currentInput.value = formatDuration(currentSeconds);
      freezeInput.value = freezeSeconds == null ? "" : formatDuration(freezeSeconds);
    }
    if (timeMode === "clock") {
      syncClockInputs();
      if (!currentClockInput.value) setCurrentClockToNow();
    }

    for (const button of modeButtons) {
      const active = button.dataset.timeMode === timeMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const panel of timePanels) panel.hidden = panel.dataset.timePanel !== timeMode;
    clearInputErrors();
  }

  function applyDraftTime() {
    if (!payload) return;

    let nextSeconds;
    let nextFreezeSeconds = null;
    let freezeInvalid = false;
    if (timeMode === "elapsed") {
      nextSeconds = parseDuration(currentInput.value);
      setInputInvalid(currentInput, nextSeconds == null);

      const freezeText = freezeInput.value.trim();
      nextFreezeSeconds = freezeText ? parseDuration(freezeText) : null;
      freezeInvalid = Boolean(freezeText)
        && (nextFreezeSeconds == null || nextFreezeSeconds > contestSeconds);
      setInputInvalid(freezeInput, freezeInvalid);
    } else {
      const startMinute = parseClock(startClockInput.value);
      const nowMinute = parseClock(currentClockInput.value);
      const freezeText = freezeClockInput.value.trim();
      const freezeMinute = freezeText ? parseClock(freezeText) : null;
      setInputInvalid(startClockInput, startMinute == null);
      setInputInvalid(currentClockInput, nowMinute == null);
      freezeInvalid = Boolean(freezeText) && freezeMinute == null;
      setInputInvalid(freezeClockInput, freezeInvalid);
      if (startMinute != null && nowMinute != null) {
        nextSeconds = ((nowMinute - startMinute + 24 * 60) % (24 * 60)) * 60;
        if (freezeMinute != null) {
          nextFreezeSeconds = ((freezeMinute - startMinute + 24 * 60) % (24 * 60)) * 60;
          freezeInvalid = nextFreezeSeconds > contestSeconds;
          setInputInvalid(freezeClockInput, freezeInvalid);
        }
      }
    }

    if (nextSeconds == null || freezeInvalid) return;
    freezeSeconds = nextFreezeSeconds == null ? null : clampSeconds(nextFreezeSeconds);
    renderAt(nextSeconds, { syncInput: false });
    if (timeMode === "elapsed") {
      currentInput.value = formatDuration(currentSeconds);
      freezeInput.value = freezeSeconds == null ? "" : formatDuration(freezeSeconds);
    }
  }

  function renderAt(seconds, options = {}) {
    currentSeconds = clampSeconds(seconds);
    const query = normalizeSearch(searchInput.value);
    const rows = computeStandings(currentSeconds, freezeSeconds);
    const visibleRows = query ? rows.filter((row) => row.searchText.includes(query)) : rows;
    const fragment = document.createDocumentFragment();

    for (const row of visibleRows) fragment.appendChild(renderTeam(row));
    if (visibleRows.length === 0) fragment.appendChild(renderEmptyRow("검색 결과가 없습니다."));

    headNode.replaceChildren(renderHeader());
    bodyNode.replaceChildren(fragment);
    appliedTimeNode.textContent = freezeSeconds == null
      ? `경과 ${formatDuration(currentSeconds)}`
      : `경과 ${formatDuration(currentSeconds)} · 프리즈 ${formatDuration(freezeSeconds)}`;
    const freezeActive = freezeSeconds != null && freezeSeconds < currentSeconds;
    noteNode.textContent = freezeActive
      ? "프리즈 이후 결과는 숨깁니다. 오답 제출 시각은 원본에 없습니다."
      : "AC 시각과 최종 시도 횟수 기준입니다. 풀지 못한 문제의 시도 수는 종료 시점에 표시됩니다.";
    if (options.syncInput !== false && timeMode === "elapsed") {
      currentInput.value = formatDuration(currentSeconds);
    }
  }

  function computeStandings(seconds, freezeAtSeconds) {
    const atFinal = seconds >= contestSeconds;
    const freezeActive = freezeAtSeconds != null && freezeAtSeconds < seconds;
    const visibleSeconds = freezeActive ? freezeAtSeconds : seconds;
    const firstSolvedByProblem = new Map();
    const rows = teams.map((team) => {
      const states = new Map();
      let solved = 0;
      let penalty = 0;
      let lastSolvedMinute = 0;

      for (const [resultIndex, result] of team.results.entries()) {
        const problemId = String(problems[resultIndex]?.id ?? resultIndex);
        const acceptedAtSeconds = Number(result.acceptedAtSeconds);
        const accepted = result.status === "solved" && acceptedAtSeconds <= visibleSeconds;
        const state = {
          result,
          accepted,
          firstSolved: false,
          showFailed: !freezeActive && atFinal && result.status === "failed" && result.attempts > 0,
        };
        states.set(problemId, state);

        if (!accepted) continue;
        solved += 1;
        penalty += Number(result.acceptedMinute) + 20 * Math.max(0, Number(result.attempts) - 1);
        lastSolvedMinute = Math.max(lastSolvedMinute, Number(result.acceptedMinute));

        if (team.ranked !== false) {
          const previous = firstSolvedByProblem.get(problemId);
          if (!previous || Number(result.acceptedAtSeconds) < previous.time) {
            firstSolvedByProblem.set(problemId, {
              teamId: String(team.id),
              time: Number(result.acceptedAtSeconds),
            });
          }
        }
      }

      return {
        team,
        id: String(team.id),
        name: String(team.name || ""),
        organization: String(team.organization || ""),
        ranked: team.ranked !== false,
        states,
        solved,
        penalty,
        lastSolvedMinute,
        rank: null,
        searchText: normalizeSearch(`${team.name || ""} ${team.organization || ""} ${team.category || ""}`),
      };
    });

    for (const row of rows) {
      for (const [problemId, state] of row.states) {
        if (!state.accepted || !row.ranked) continue;
        state.firstSolved = firstSolvedByProblem.get(problemId)?.teamId === row.id;
      }
    }

    if (atFinal && !freezeActive) {
      rows.sort((a, b) => Number(a.team.sourceOrder) - Number(b.team.sourceOrder));
      for (const row of rows) row.rank = row.team.finalRank ?? "-";
      return rows;
    }

    rows.sort((a, b) => {
      const byScore = b.solved - a.solved
        || a.penalty - b.penalty
        || a.lastSolvedMinute - b.lastSolvedMinute;
      if (byScore !== 0) return byScore;
      return a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id);
    });

    let rankedIndex = 0;
    let previousRanked = null;
    for (const row of rows) {
      if (!row.ranked) {
        row.rank = "-";
        continue;
      }
      rankedIndex += 1;
      const tied = previousRanked
        && previousRanked.solved === row.solved
        && previousRanked.penalty === row.penalty
        && previousRanked.lastSolvedMinute === row.lastSolvedMinute;
      row.rank = tied ? previousRanked.rank : rankedIndex;
      previousRanked = row;
    }

    return rows;
  }

  function renderHeader() {
    const row = document.createElement("tr");
    row.appendChild(makeHeaderCell("#", "vietnam-scoreboard-rank"));
    row.appendChild(makeHeaderCell("Team", "vietnam-scoreboard-team"));
    row.appendChild(makeHeaderCell("Solved", "vietnam-scoreboard-solved"));
    row.appendChild(makeHeaderCell("Penalty", "vietnam-scoreboard-penalty"));
    for (const problem of problems) {
      const cell = makeHeaderCell(problem.label, "vietnam-scoreboard-problem");
      cell.title = problem.title || problem.label;
      row.appendChild(cell);
    }
    return row;
  }

  function renderTeam(row) {
    const tr = document.createElement("tr");
    tr.dataset.teamId = row.id;
    if (!row.ranked) tr.classList.add("is-unranked");
    tr.appendChild(makeCell(row.rank, "vietnam-scoreboard-rank"));

    const teamCell = makeCell("", "vietnam-scoreboard-team");
    const name = document.createElement("span");
    name.className = "vietnam-scoreboard-team-name";
    name.textContent = row.name;
    teamCell.appendChild(name);

    const metadata = [row.organization, row.team.category, row.team.disqualified ? "DQ" : ""]
      .filter(Boolean)
      .join(" · ");
    if (metadata) {
      const meta = document.createElement("span");
      meta.className = "vietnam-scoreboard-team-meta";
      meta.textContent = metadata;
      teamCell.appendChild(meta);
    }

    tr.appendChild(teamCell);
    tr.appendChild(makeCell(row.solved, "vietnam-scoreboard-solved"));
    tr.appendChild(makeCell(row.penalty, "vietnam-scoreboard-penalty"));
    for (const problem of problems) {
      tr.appendChild(renderProblemCell(problem, row.states.get(String(problem.id))));
    }
    return tr;
  }

  function renderProblemCell(problem, state) {
    const cell = makeCell("", "vietnam-scoreboard-problem");
    if (state?.accepted) {
      const attempts = Number(state.result.attempts);
      const label = attempts <= 1 ? "+" : `+${attempts}`;
      cell.classList.add("is-solved");
      if (state.firstSolved) cell.classList.add("is-first");
      cell.textContent = label;
      cell.title = `${problem.label}: ${formatDuration(Number(state.result.acceptedAtSeconds))} 정답 (${label})`;
    } else if (state?.showFailed) {
      cell.classList.add("is-failed");
      cell.textContent = `-${state.result.attempts}`;
      cell.title = `${problem.label}: ${state.result.attempts}회 시도`;
    } else {
      cell.classList.add("is-empty");
      cell.title = problem.title || problem.label;
    }
    return cell;
  }

  function makeHeaderCell(text, className) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function makeCell(text, className) {
    const cell = document.createElement("td");
    cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function renderEmptyRow(text) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4 + Math.max(problems.length, 1);
    cell.textContent = text;
    row.appendChild(cell);
    return row;
  }

  function parseDuration(value) {
    const text = String(value || "").trim();
    if (/^\d+$/u.test(text)) return Number(text) * 60;
    const match = text.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/u);
    if (!match) return null;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] || 0);
  }

  function parseClock(value) {
    const match = String(value || "").match(/^(\d{2}):([0-5]\d)$/u);
    if (!match) return null;
    const hour = Number(match[1]);
    return hour < 24 ? hour * 60 + Number(match[2]) : null;
  }

  function setCurrentClockToNow() {
    const now = new Date();
    currentClockInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setInputInvalid(currentClockInput, false);
  }

  function syncClockInputs() {
    const startMinute = parseClock(startClockInput.value);
    if (startMinute == null) return;
    currentClockInput.value = formatClockMinute(startMinute + Math.floor(currentSeconds / 60));
    freezeClockInput.value = freezeSeconds == null
      ? ""
      : formatClockMinute(startMinute + Math.floor(freezeSeconds / 60));
  }

  function formatClockMinute(minutes) {
    const value = ((Math.floor(Number(minutes) || 0) % (24 * 60)) + 24 * 60) % (24 * 60);
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function formatDuration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hour = Math.floor(value / 3600);
    const minute = Math.floor((value % 3600) / 60);
    const second = value % 60;
    const base = `${hour}:${String(minute).padStart(2, "0")}`;
    return second === 0 ? base : `${base}:${String(second).padStart(2, "0")}`;
  }

  function clampSeconds(seconds) {
    return Math.min(contestSeconds, Math.max(0, Math.floor(Number(seconds) || 0)));
  }

  function normalizeSearch(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, "");
  }

  function setInputInvalid(input, invalid) {
    input.classList.toggle("is-invalid", invalid);
    input.setAttribute("aria-invalid", String(invalid));
  }

  function clearInputErrors() {
    setInputInvalid(currentInput, false);
    setInputInvalid(freezeInput, false);
    setInputInvalid(startClockInput, false);
    setInputInvalid(currentClockInput, false);
    setInputInvalid(freezeClockInput, false);
  }

  function showFatalError(error) {
    errorNode.hidden = false;
    errorNode.textContent = error instanceof Error ? error.message : "순위표를 불러오지 못했습니다.";
    metaNode.textContent = "";
    appliedTimeNode.textContent = "";
    bodyNode.replaceChildren(renderEmptyRow("순위표를 불러오지 못했습니다."));
  }
})();
