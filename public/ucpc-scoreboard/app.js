(function () {
  "use strict";

  const archive = window.UCPC_SCOREBOARD_ARCHIVE_MANIFEST;
  const payloadCache = window.UCPC_SCOREBOARD_ARCHIVE_PAYLOADS || {};
  window.UCPC_SCOREBOARD_ARCHIVE_PAYLOADS = payloadCache;

  const root = document.querySelector("[data-ucpc-tool]");
  if (!root || !archive || !Array.isArray(archive.scoreboards)) return;

  const scoreboardSelect = root.querySelector("[data-scoreboard-select]");
  const currentInput = root.querySelector("[data-current-time]");
  const freezeInput = root.querySelector("[data-freeze-time]");
  const modeButtons = Array.from(root.querySelectorAll("[data-time-mode]"));
  const timePanels = Array.from(root.querySelectorAll("[data-time-panel]"));
  const startClockInput = root.querySelector("[data-start-clock-time]");
  const currentClockInput = root.querySelector("[data-current-clock-time]");
  const searchInput = root.querySelector("[data-team-search]");
  const titleNode = root.querySelector("[data-contest-title]");
  const metaNode = root.querySelector("[data-scoreboard-meta]");
  const computedTimeNode = root.querySelector("[data-computed-time]");
  const bodyNode = root.querySelector("[data-scoreboard-body]");
  const footnoteNode = root.querySelector("[data-scoreboard-footnote]");
  const errorNode = root.querySelector("[data-scoreboard-error]");

  const entries = [...archive.scoreboards];
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));

  let activeEntry = null;
  let contest = null;
  let runsPayload = null;
  let contestMinutes = 0;
  let problems = [];
  let teams = [];
  let runs = [];
  let problemById = new Map();
  let currentMinute = 0;
  let freezeMinute = null;
  let timeMode = "elapsed";

  populateScoreboardSelect();
  bindControls();
  loadScoreboard(defaultEntryId()).catch(showFatalError);

  function defaultEntryId() {
    return entries[0]?.id;
  }

  function populateScoreboardSelect() {
    for (const entry of entries) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.label;
      scoreboardSelect.appendChild(option);
    }
  }

  async function loadScoreboard(id) {
    const entry = entryById.get(id);
    if (!entry) throw new Error(`Unknown scoreboard: ${id}`);

    activeEntry = entry;
    scoreboardSelect.value = id;
    titleNode.textContent = "Loading...";
    metaNode.textContent = "";
    footnoteNode.textContent = "";
    errorNode.hidden = true;
    bodyNode.replaceChildren(renderLoadingRow());

    const payload = await loadPayload(entry);
    contest = payload.contest;
    runsPayload = payload.runs;
    contestMinutes = Number(entry.contestMinutes) || Math.floor(Number(runsPayload.time.contestTime) / 60);
    problems = [...contest.problems].sort((a, b) => Number(a.id) - Number(b.id));
    teams = [...contest.teams];
    runs = [...runsPayload.runs].sort(compareRuns);
    problemById = new Map(problems.map((problem) => [String(problem.id), problem]));

    currentMinute = 0;
    freezeMinute = null;
    currentInput.value = "0:00";
    freezeInput.value = "";
    startClockInput.value = "0:00";
    currentClockInput.value = "0:00";
    searchInput.value = "";
    syncModeControls();

    titleNode.textContent = contest.title || entry.label;
    metaNode.textContent = makeMetaText(entry);
    footnoteNode.textContent = `${entry.sourceUrl} · ${entry.teams} teams · ${entry.problems} problems · ${entry.runs} submissions`;
    renderAt(0);
  }

  function loadPayload(entry) {
    if (payloadCache[entry.id]) return Promise.resolve(payloadCache[entry.id]);

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(`data/${entry.dataFile}`, window.location.href).toString();
      script.async = true;
      script.addEventListener("load", () => {
        const payload = payloadCache[entry.id];
        if (payload) resolve(payload);
        else reject(new Error(`Payload did not register: ${entry.id}`));
      });
      script.addEventListener("error", () => {
        reject(new Error(`Failed to load ${entry.dataFile}`));
      });
      document.head.appendChild(script);
    });
  }

  function compareRuns(a, b) {
    return Number(a.submissionTime) - Number(b.submissionTime) || Number(a.id) - Number(b.id);
  }

  function makeMetaText(entry) {
    const parts = [`contest ${formatTime(entry.contestMinutes)}`];
    if (entry.firstFrozenMinute != null) parts.push(`first frozen ${formatTime(entry.firstFrozenMinute)}`);
    if (entry.firstRunMinute != null && entry.lastRunMinute != null) {
      parts.push(`runs ${formatTime(entry.firstRunMinute)}-${formatTime(entry.lastRunMinute)}`);
    }
    return parts.join(" / ");
  }

  function splitTeamName(fullName) {
    const match = String(fullName).match(/^(.*?) \(([\s\S]*)\)$/);
    if (!match) return { name: String(fullName), group: "" };
    return { name: match[1], group: match[2] };
  }

  function normalizeSearchText(value) {
    return String(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, "");
  }

  function resultKind(result) {
    const value = String(result || "");
    if (value.startsWith("Yes")) return "yes";
    if (value === "" || value.startsWith("Pending")) return "pending";
    return "no";
  }

  function newProblemState(problem) {
    return {
      problem,
      accepted: false,
      failed: 0,
      pending: 0,
      frozen: 0,
      solvedTime: null,
      firstSolved: false,
    };
  }

  function makeTeamRows() {
    return teams.map((team) => {
      const parts = splitTeamName(team.name);
      return {
        id: String(team.id),
        rawName: String(team.name),
        name: parts.name,
        group: parts.group,
        states: new Map(problems.map((problem) => [String(problem.id), newProblemState(problem)])),
        solved: 0,
        penalty: 0,
        lastSolvedTime: 0,
        rank: null,
        searchText: normalizeSearchText(`${team.name} ${parts.name} ${parts.group}`),
      };
    });
  }

  function computeStandingsAt(minute, freezeAt = null) {
    const boundedMinute = clampMinute(minute);
    const boundedFreeze = freezeAt == null ? null : Math.min(clampMinute(freezeAt), boundedMinute);
    const rows = makeTeamRows();
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const firstSolvedByProblem = new Map();

    if (boundedMinute > 0) {
      for (const run of runs) {
        const runMinute = Number(run.submissionTime);
        if (runMinute > boundedMinute) break;

        const row = rowById.get(String(run.team));
        const problem = problemById.get(String(run.problem));
        if (!row || !problem) continue;

        const state = row.states.get(String(problem.id));
        if (!state || state.accepted) continue;

        if (boundedFreeze != null && runMinute > boundedFreeze) {
          state.frozen += 1;
          continue;
        }

        const kind = resultKind(run.result);
        if (kind === "yes") {
          state.accepted = true;
          state.solvedTime = runMinute;
          if (!firstSolvedByProblem.has(String(problem.id))) {
            firstSolvedByProblem.set(String(problem.id), row.id);
          }
        } else if (kind === "pending") {
          state.pending += 1;
        } else {
          state.failed += 1;
        }
      }
    }

    for (const row of rows) {
      for (const [problemId, state] of row.states) {
        if (!state.accepted) continue;
        state.firstSolved = firstSolvedByProblem.get(problemId) === row.id;
        row.solved += 1;
        row.penalty += Number(state.solvedTime) + 20 * state.failed;
        row.lastSolvedTime = Math.max(row.lastSolvedTime, Number(state.solvedTime));
      }
    }

    rows.sort((a, b) => {
      const byScore =
        b.solved - a.solved ||
        a.penalty - b.penalty ||
        a.lastSolvedTime - b.lastSolvedTime;
      if (byScore !== 0) return byScore;
      return a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id);
    });

    rows.forEach((row, index) => {
      const previous = rows[index - 1];
      const tied =
        previous &&
        previous.solved === row.solved &&
        previous.penalty === row.penalty &&
        previous.lastSolvedTime === row.lastSolvedTime;
      row.rank = tied ? previous.rank : index + 1;
    });

    return rows;
  }

  function renderAt(minute, options = {}) {
    const shouldSyncCurrentInput = options.syncCurrentInput !== false;
    currentMinute = clampMinute(minute);
    const query = normalizeSearchText(searchInput.value);
    const rows = computeStandingsAt(currentMinute, freezeMinute);
    const visibleRows = query ? rows.filter((row) => row.searchText.includes(query)) : rows;

    const fragment = document.createDocumentFragment();
    fragment.appendChild(renderHeader());

    for (const row of visibleRows) {
      fragment.appendChild(renderTeam(row));
    }

    if (visibleRows.length === 0) {
      fragment.appendChild(renderEmptyRow("검색 결과가 없습니다."));
    }

    bodyNode.replaceChildren(fragment);
    if (shouldSyncCurrentInput) {
      currentInput.value = formatTime(currentMinute);
    }
    updateComputedTimeText();
  }

  function renderHeader() {
    const row = document.createElement("tr");
    row.appendChild(makeHeaderCell("#", "ucpc-rank"));
    row.appendChild(makeHeaderCell("Team", "ucpc-team"));
    row.appendChild(makeHeaderCell("Solved", "ucpc-solved"));
    row.appendChild(makeHeaderCell("Penalty", "ucpc-penalty"));

    for (const problem of problems) {
      const cell = makeHeaderCell(problem.name, "ucpc-problem");
      cell.title = problem.title || problem.name;
      row.appendChild(cell);
    }

    return row;
  }

  function makeHeaderCell(text, className) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function renderTeam(row) {
    const tr = document.createElement("tr");
    tr.dataset.teamId = row.id;
    tr.appendChild(makeCell(row.rank, "ucpc-rank"));

    const teamCell = makeCell("", "ucpc-team");
    const name = document.createElement("span");
    name.className = "ucpc-team-name";
    name.textContent = row.name;
    teamCell.appendChild(name);

    if (row.group) {
      const group = document.createElement("span");
      group.className = "ucpc-team-members";
      group.textContent = row.group;
      teamCell.appendChild(group);
    }

    tr.appendChild(teamCell);
    tr.appendChild(makeCell(row.solved, "ucpc-solved"));
    tr.appendChild(makeCell(row.penalty, "ucpc-penalty"));

    for (const problem of problems) {
      tr.appendChild(renderProblemCell(row.states.get(String(problem.id))));
    }

    return tr;
  }

  function renderProblemCell(state) {
    const cell = makeCell("", "ucpc-problem ucpc-problem-cell");
    let label = "";

    if (state.accepted) {
      cell.classList.add("ucpc-problem-solved");
      if (state.firstSolved) cell.classList.add("ucpc-problem-first");
      label = state.failed === 0 ? "+" : `+${state.failed + 1}`;
      cell.title = `${state.problem.name}: ${label} at ${formatTime(state.solvedTime)}`;
    } else if (state.frozen > 0) {
      cell.classList.add("ucpc-problem-frozen");
      label = `?${state.frozen}`;
      cell.title = `${state.problem.name}: ${state.frozen} frozen submission(s)`;
    } else if (state.pending > 0) {
      cell.classList.add("ucpc-problem-pending");
      label = `?${state.pending}`;
      cell.title = `${state.problem.name}: pending`;
    } else if (state.failed > 0) {
      cell.classList.add("ucpc-problem-failed");
      label = `-${state.failed}`;
      cell.title = `${state.problem.name}: ${label}`;
    } else {
      cell.classList.add("ucpc-problem-empty");
      cell.title = `${state.problem.name}: ${state.problem.title || ""}`;
    }

    cell.textContent = label;
    return cell;
  }

  function makeCell(text, className) {
    const cell = document.createElement("td");
    cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function renderLoadingRow() {
    return renderEmptyRow("Loading...");
  }

  function renderEmptyRow(text) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4 + Math.max(problems.length, 1);
    cell.textContent = text;
    row.appendChild(cell);
    return row;
  }

  function bindControls() {
    scoreboardSelect.addEventListener("change", () => {
      loadScoreboard(scoreboardSelect.value).catch(showFatalError);
    });

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!(button instanceof HTMLElement)) return;
        setTimeMode(button.dataset.timeMode === "clock" ? "clock" : "elapsed");
      });
    });

    currentInput.addEventListener("input", () => applyTimeInput(currentInput, "current", false));
    currentInput.addEventListener("change", () => applyTimeInput(currentInput, "current", true));
    currentInput.addEventListener("blur", () => {
      currentInput.value = formatTime(currentMinute);
      currentInput.classList.remove("is-invalid");
    });
    currentInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyTimeInput(currentInput, "current", true);
        currentInput.blur();
      }
    });

    freezeInput.addEventListener("input", () => applyTimeInput(freezeInput, "freeze", false));
    freezeInput.addEventListener("change", () => applyTimeInput(freezeInput, "freeze", true));
    freezeInput.addEventListener("blur", () => {
      freezeInput.value = freezeMinute == null ? "" : formatTime(freezeMinute);
      freezeInput.classList.remove("is-invalid");
    });
    freezeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        applyTimeInput(freezeInput, "freeze", true);
        freezeInput.blur();
      }
    });

    startClockInput.addEventListener("input", () => applyClockInputs(false));
    currentClockInput.addEventListener("input", () => applyClockInputs(false));
    startClockInput.addEventListener("change", () => applyClockInputs(true));
    currentClockInput.addEventListener("change", () => applyClockInputs(true));
    startClockInput.addEventListener("blur", () => syncClockInput(startClockInput));
    currentClockInput.addEventListener("blur", () => syncClockInput(currentClockInput));
    startClockInput.addEventListener("keydown", handleClockKeydown);
    currentClockInput.addEventListener("keydown", handleClockKeydown);

    searchInput.addEventListener("input", () => renderAt(currentMinute, { syncCurrentInput: false }));
  }

  function setTimeMode(nextMode) {
    timeMode = nextMode;
    syncModeControls();
    clearTimeInputErrors();
    if (timeMode === "elapsed") {
      currentInput.value = formatTime(currentMinute);
      updateComputedTimeText();
      return;
    }
    applyClockInputs(false);
  }

  function syncModeControls() {
    modeButtons.forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      const isActive = button.dataset.timeMode === timeMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    timePanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.hidden = panel.dataset.timePanel !== timeMode;
    });
  }

  function applyTimeInput(input, kind, commit) {
    if (!contest) return;

    const parsed = parseTimeInput(input.value, { allowBlank: kind === "freeze" });
    if (parsed === undefined) {
      input.classList.add("is-invalid");
      return;
    }

    input.classList.remove("is-invalid");
    if (kind === "freeze") {
      freezeMinute = parsed;
      renderAt(currentMinute, { syncCurrentInput: false });
      if (commit) input.value = freezeMinute == null ? "" : formatTime(freezeMinute);
      return;
    }

    renderAt(parsed, { syncCurrentInput: commit });
    if (commit) input.value = formatTime(currentMinute);
  }

  function applyClockInputs(commit) {
    if (!contest || timeMode !== "clock") return;

    const startMinute = parseClockInput(startClockInput.value);
    const nowMinute = parseClockInput(currentClockInput.value);
    const hasStart = startClockInput.value.trim() !== "";
    const hasNow = currentClockInput.value.trim() !== "";

    startClockInput.classList.toggle("is-invalid", hasStart && startMinute == null);
    currentClockInput.classList.toggle("is-invalid", hasNow && nowMinute == null);

    if (startMinute == null || nowMinute == null) {
      updateComputedTimeText("시작 시간과 현재 시간을 HH:MM으로 입력하면 경과 시간이 계산됩니다.");
      return;
    }

    const elapsed = computeElapsedClockMinutes(startMinute, nowMinute);
    renderAt(elapsed, { syncCurrentInput: false });
    if (commit) {
      startClockInput.value = formatClockTime(startMinute);
      currentClockInput.value = formatClockTime(nowMinute);
    }
  }

  function handleClockKeydown(event) {
    if (event.key === "Enter") {
      applyClockInputs(true);
      event.currentTarget.blur();
    }
  }

  function syncClockInput(input) {
    const parsed = parseClockInput(input.value);
    if (input.value.trim() === "") {
      input.classList.remove("is-invalid");
      updateComputedTimeText();
      return;
    }
    if (parsed == null) {
      input.classList.add("is-invalid");
      return;
    }
    input.value = formatClockTime(parsed);
    input.classList.remove("is-invalid");
  }

  function clearTimeInputErrors() {
    currentInput.classList.remove("is-invalid");
    startClockInput.classList.remove("is-invalid");
    currentClockInput.classList.remove("is-invalid");
  }

  function parseTimeInput(value, options = {}) {
    const raw = String(value).trim();
    if (!raw) return options.allowBlank ? null : undefined;

    if (/^\d+$/.test(raw)) return clampMinute(Number(raw));

    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return undefined;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (minutes >= 60) return undefined;
    return clampMinute(hours * 60 + minutes);
  }

  function parseClockInput(value) {
    const raw = String(value).trim();
    if (!raw) return null;

    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours >= 24 || minutes >= 60) return null;
    return hours * 60 + minutes;
  }

  function computeElapsedClockMinutes(startMinute, nowMinute) {
    let elapsed = nowMinute - startMinute;
    if (elapsed < 0) elapsed += 24 * 60;
    return clampMinute(elapsed);
  }

  function clampMinute(minute) {
    if (!Number.isFinite(minute)) return 0;
    return Math.max(0, Math.min(contestMinutes, Math.floor(minute)));
  }

  function formatTime(minute) {
    const boundedMinute = clampMinute(minute);
    const hours = Math.floor(boundedMinute / 60);
    const minutes = String(boundedMinute % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function formatClockTime(minute) {
    const bounded = Math.max(0, Math.min(24 * 60 - 1, Math.floor(minute)));
    const hours = String(Math.floor(bounded / 60)).padStart(2, "0");
    const minutes = String(bounded % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function updateComputedTimeText(message = "") {
    if (message) {
      computedTimeNode.textContent = message;
      return;
    }
    if (timeMode === "clock") {
      computedTimeNode.textContent = `계산된 경과 시각: ${formatTime(currentMinute)}`;
      return;
    }
    computedTimeNode.textContent = "";
  }

  function showFatalError(error) {
    titleNode.textContent = "UCPC 스코어보드를 불러올 수 없습니다";
    metaNode.textContent = "";
    bodyNode.replaceChildren(renderEmptyRow("Load failed."));
    errorNode.textContent = error.message || String(error);
    errorNode.hidden = false;
  }

  window.UCPCScoreboardTimeMachine = {
    computeStandingsAt,
    loadScoreboard,
    formatTime,
    parseTimeInput,
    parseClockInput,
    computeElapsedClockMinutes,
  };
})();
