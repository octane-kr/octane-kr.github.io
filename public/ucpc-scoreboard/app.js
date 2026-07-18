(function () {
  "use strict";

  const archive = window.UCPC_SCOREBOARD_ARCHIVE_MANIFEST;
  const payloadCache = window.UCPC_SCOREBOARD_ARCHIVE_PAYLOADS || {};
  const unofficialOverlays = window.UCPC_SCOREBOARD_UNOFFICIAL_OVERLAYS || {};
  window.UCPC_SCOREBOARD_ARCHIVE_PAYLOADS = payloadCache;

  const root = document.querySelector("[data-ucpc-tool]");
  if (!root || !archive || !Array.isArray(archive.scoreboards)) return;

  const assetBaseUrl = document.currentScript?.src
    ? new URL("./", document.currentScript.src)
    : new URL("/ucpc-scoreboard/", window.location.origin);

  const scoreboardSelect = root.querySelector("[data-scoreboard-select]");
  const currentInput = root.querySelector("[data-current-time]");
  const freezeInput = root.querySelector("[data-freeze-time]");
  const modeButtons = Array.from(root.querySelectorAll("[data-time-mode]"));
  const timePanels = Array.from(root.querySelectorAll("[data-time-panel]"));
  const startClockInput = root.querySelector("[data-start-clock-time]");
  const currentClockInput = root.querySelector("[data-current-clock-time]");
  const refreshCurrentTimeButton = root.querySelector("[data-refresh-current-time]");
  const applyTimeButton = root.querySelector("[data-apply-time]");
  const searchInput = root.querySelector("[data-team-search]");
  const titleNode = root.querySelector("[data-contest-title]");
  const metaNode = root.querySelector("[data-scoreboard-meta]");
  const computedTimeNode = root.querySelector("[data-computed-time]");
  const scoreboardWrap = root.querySelector("[data-scoreboard-wrap]");
  const headNode = root.querySelector("[data-scoreboard-head]");
  const bodyNode = root.querySelector("[data-scoreboard-body]");
  const footnoteNode = root.querySelector("[data-scoreboard-footnote]");
  const errorNode = root.querySelector("[data-scoreboard-error]");
  const assetVersion = root.dataset.assetVersion || archive.generatedAt || "";

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
    if (!entry) throw new Error("선택한 대회를 찾을 수 없습니다.");

    activeEntry = entry;
    scoreboardSelect.value = id;
    titleNode.textContent = entry.label;
    metaNode.textContent = "";
    footnoteNode.textContent = "";
    errorNode.hidden = true;
    scoreboardWrap.hidden = false;
    headNode.replaceChildren();
    bodyNode.replaceChildren(renderLoadingRow());

    const payload = await loadPayload(entry);
    const overlay = unofficialOverlays[entry.id] || {};
    const overlayTeams = Array.isArray(overlay.teams) ? overlay.teams : [];
    const overlayRuns = Array.isArray(overlay.runs) ? overlay.runs : [];
    contest = payload.contest;
    runsPayload = payload.runs;
    contestMinutes = Number(entry.contestMinutes) || Math.floor(Number(runsPayload.time.contestTime) / 60);
    problems = [...contest.problems].sort((a, b) => Number(a.id) - Number(b.id));
    teams = [...contest.teams, ...overlayTeams];
    runs = [...runsPayload.runs, ...overlayRuns].sort(compareRuns);
    problemById = new Map(problems.map((problem) => [String(problem.id), problem]));

    currentMinute = 0;
    freezeMinute = null;
    currentInput.value = "0:00";
    freezeInput.value = "";
    startClockInput.value = "";
    currentClockInput.value = "";
    searchInput.value = "";
    clearTimeInputErrors();
    if (timeMode === "clock") setCurrentClockToNow();
    syncModeControls();

    titleNode.textContent = contest.title || entry.label;
    metaNode.textContent = makeMetaText(entry);
    renderSourceFootnote(entry);
    renderAt(0);
    scoreboardWrap.scrollTo({ top: 0, left: 0 });
  }

  function loadPayload(entry) {
    if (payloadCache[entry.id]) return Promise.resolve(payloadCache[entry.id]);

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const payloadUrl = new URL(`data/${entry.dataFile}`, assetBaseUrl);
      if (assetVersion) payloadUrl.searchParams.set("v", assetVersion);
      script.src = payloadUrl.toString();
      script.async = true;
      script.addEventListener("load", () => {
        const payload = payloadCache[entry.id];
        if (payload) resolve(payload);
        else reject(new Error("대회 데이터가 올바르게 등록되지 않았습니다."));
      });
      script.addEventListener("error", () => {
        reject(new Error("대회 데이터 파일을 불러오지 못했습니다."));
      });
      document.head.appendChild(script);
    });
  }

  function compareRuns(a, b) {
    return Number(a.submissionTime) - Number(b.submissionTime) || Number(a.id) - Number(b.id);
  }

  function makeMetaText(entry) {
    return `대회 시간 ${formatTime(entry.contestMinutes)} · ${teams.length}팀 · ${problems.length}문제`;
  }

  function renderSourceFootnote(entry) {
    const link = document.createElement("a");
    link.href = entry.sourceUrl;
    link.textContent = "원본 스코어보드";
    footnoteNode.replaceChildren(
      "UCPC Archive 데이터를 시점별로 재구성한 화면입니다. 공식 기록은 ",
      link,
      "에서 확인하세요.",
    );
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
        ranked: team.ranked !== false,
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
          if (row.ranked && !firstSolvedByProblem.has(String(problem.id))) {
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
        state.firstSolved = row.ranked && firstSolvedByProblem.get(problemId) === row.id;
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

    let rankedIndex = 0;
    let previousRanked = null;
    rows.forEach((row) => {
      if (!row.ranked) {
        row.rank = "-";
        return;
      }

      rankedIndex += 1;
      const tied =
        previousRanked &&
        previousRanked.solved === row.solved &&
        previousRanked.penalty === row.penalty &&
        previousRanked.lastSolvedTime === row.lastSolvedTime;
      row.rank = tied ? previousRanked.rank : rankedIndex;
      previousRanked = row;
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

    for (const row of visibleRows) {
      fragment.appendChild(renderTeam(row));
    }

    if (visibleRows.length === 0) {
      fragment.appendChild(renderEmptyRow("검색 결과가 없습니다."));
    }

    headNode.replaceChildren(renderHeader());
    bodyNode.replaceChildren(fragment);
    if (shouldSyncCurrentInput) {
      currentInput.value = formatTime(currentMinute);
    }
    updateAppliedTimeText();
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
    if (!row.ranked) tr.classList.add("ucpc-team-unofficial");
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
      cell.title = `${state.problem.name}: ${formatTime(state.solvedTime)}에 정답 (${label})`;
    } else if (state.frozen > 0) {
      cell.classList.add("ucpc-problem-frozen");
      label = `?${state.frozen}`;
      cell.title = `${state.problem.name}: 프리즈 제출 ${state.frozen}회`;
    } else if (state.pending > 0) {
      cell.classList.add("ucpc-problem-pending");
      label = `?${state.pending}`;
      cell.title = `${state.problem.name}: 채점 대기 ${state.pending}회`;
    } else if (state.failed > 0) {
      cell.classList.add("ucpc-problem-failed");
      label = `-${state.failed}`;
      cell.title = `${state.problem.name}: 오답 ${state.failed}회`;
    } else {
      cell.classList.add("ucpc-problem-empty");
      cell.title = state.problem.title
        ? `${state.problem.name}: ${state.problem.title}`
        : state.problem.name;
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
    return renderEmptyRow("불러오는 중...");
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

    for (const input of [currentInput, freezeInput, startClockInput, currentClockInput]) {
      input.addEventListener("input", () => {
        setInputInvalid(input, false);
        updateAppliedTimeText();
      });
      input.addEventListener("keydown", handleTimeInputKeydown);
    }

    refreshCurrentTimeButton.addEventListener("click", setCurrentClockToNow);
    applyTimeButton.addEventListener("click", applyDraftTime);

    searchInput.addEventListener("input", () => renderAt(currentMinute, { syncCurrentInput: false }));
  }

  function setTimeMode(nextMode) {
    timeMode = nextMode;
    syncModeControls();
    clearTimeInputErrors();
    if (timeMode === "elapsed") {
      currentInput.value = formatTime(currentMinute);
    } else if (!currentClockInput.value) {
      setCurrentClockToNow();
    }
    updateAppliedTimeText();
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

  function applyDraftTime() {
    if (!contest) return false;

    const nextFreezeMinute = parseTimeInput(freezeInput.value, { allowBlank: true });
    const freezeIsInvalid = nextFreezeMinute === undefined;
    let nextMinute;
    let nextClockStartMinute = null;
    let nextClockCurrentMinute = null;

    setInputInvalid(freezeInput, freezeIsInvalid);

    if (timeMode === "elapsed") {
      nextMinute = parseTimeInput(currentInput.value);
      setInputInvalid(currentInput, nextMinute === undefined);
      setInputInvalid(startClockInput, false);
      setInputInvalid(currentClockInput, false);
    } else {
      nextClockStartMinute = parseClockInput(startClockInput.value);
      nextClockCurrentMinute = parseClockInput(currentClockInput.value);
      setInputInvalid(startClockInput, nextClockStartMinute == null);
      setInputInvalid(currentClockInput, nextClockCurrentMinute == null);
      setInputInvalid(currentInput, false);

      if (nextClockStartMinute != null && nextClockCurrentMinute != null) {
        nextMinute = computeElapsedClockMinutes(nextClockStartMinute, nextClockCurrentMinute);
      }
    }

    if (freezeIsInvalid || nextMinute === undefined) {
      computedTimeNode.textContent = "입력한 시간 형식을 확인해 주세요.";
      return false;
    }

    freezeMinute = nextFreezeMinute;
    freezeInput.value = freezeMinute == null ? "" : formatTime(freezeMinute);

    if (timeMode === "elapsed") {
      currentInput.value = formatTime(nextMinute);
    } else {
      startClockInput.value = formatClockTime(nextClockStartMinute);
      currentClockInput.value = formatClockTime(nextClockCurrentMinute);
    }

    renderAt(nextMinute, { syncCurrentInput: false });
    return true;
  }

  function handleTimeInputKeydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyDraftTime();
  }

  function setCurrentClockToNow() {
    const now = new Date();
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    currentClockInput.value = formatClockTime(nowMinute);
    setInputInvalid(currentClockInput, false);
    updateAppliedTimeText();
  }

  function clearTimeInputErrors() {
    setInputInvalid(currentInput, false);
    setInputInvalid(freezeInput, false);
    setInputInvalid(startClockInput, false);
    setInputInvalid(currentClockInput, false);
  }

  function setInputInvalid(input, invalid) {
    input.classList.toggle("is-invalid", invalid);
    if (invalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
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

  function updateAppliedTimeText() {
    const parts = [
      `경과 ${formatTime(currentMinute)} 기준`,
      freezeMinute == null ? "프리즈 없음" : `프리즈 ${formatTime(freezeMinute)}`,
    ];
    computedTimeNode.textContent = parts.join(" · ");
  }

  function showFatalError(error) {
    metaNode.textContent = "";
    scoreboardWrap.hidden = true;
    errorNode.textContent = `스코어보드를 불러오지 못했습니다. ${error.message || String(error)}`;
    errorNode.hidden = false;
  }

  window.UCPCScoreboardTimeMachine = {
    computeStandingsAt,
    loadScoreboard,
    formatTime,
    parseTimeInput,
    parseClockInput,
    computeElapsedClockMinutes,
    applyDraftTime,
  };
})();
