(function () {
  "use strict";

  const root = document.querySelector("[data-cf-lab]");
  if (!root) return;

  const API_BASE = "https://codeforces.com/api/";
  const REQUEST_GAP_MS = 2100;
  const CACHE_PREFIX = "cf-lab-cache-v1:";
  const PAGE_SIZE = 1000;
  const MIN_RATING = -500;
  const MAX_RATING = 6000;
  const RATING_RANGE = MAX_RATING - MIN_RATING;
  const NEW_DEFAULT_RATING = 1400;
  const NEW_ACCOUNT_POLICY_START_SECONDS = Date.UTC(2020, 4, 24, 17, 14) / 1000;
  const NEW_ACCOUNT_DISPLAY_BONUSES = [500, 350, 250, 150, 100, 50];
  const NEW_ACCOUNT_HIDDEN_OFFSETS = [1400, 900, 550, 300, 150, 50];
  const COLORS = [
    "#2457c5",
    "#b91c1c",
    "#15803d",
    "#7c3aed",
    "#c2410c",
    "#0f766e",
    "#be185d",
    "#4b5563",
  ];

  const form = root.querySelector("[data-handle-form]");
  const handlesInput = root.querySelector("[data-handles]");
  const statusNode = root.querySelector("[data-status]");
  const clearCacheButton = root.querySelector("[data-clear-cache]");
  const userListNode = root.querySelector("[data-user-list]");
  const ratingChartNode = root.querySelector("[data-rating-chart]");
  const ratingTableNode = root.querySelector("[data-rating-table]");
  const performanceLimitInput = root.querySelector("[data-performance-limit]");
  const loadPerformanceButton = root.querySelector("[data-load-performance]");
  const performanceChartNode = root.querySelector("[data-performance-chart]");
  const performanceTableNode = root.querySelector("[data-performance-table]");
  const findFreshButton = root.querySelector("[data-find-fresh]");
  const officialDivisionInputs = Array.from(root.querySelectorAll("[data-official-division]"));
  const includeGymInput = root.querySelector("[data-include-gym]");
  const gymMinInput = root.querySelector("[data-gym-min]");
  const gymMaxInput = root.querySelector("[data-gym-max]");
  const statusPagesInput = root.querySelector("[data-status-pages]");
  const freshLimitInput = root.querySelector("[data-fresh-limit]");
  const freshResultsNode = root.querySelector("[data-fresh-results]");
  const headToHeadNode = root.querySelector("[data-head-to-head]");
  const tabButtons = Array.from(root.querySelectorAll("[data-cf-tab]"));
  const tabPanels = Array.from(root.querySelectorAll("[data-cf-panel]"));
  const ratingStartInput = root.querySelector("[data-rating-start]");
  const ratingEndInput = root.querySelector("[data-rating-end]");
  const performanceStartInput = root.querySelector("[data-performance-start]");
  const performanceEndInput = root.querySelector("[data-performance-end]");

  const state = {
    requestedHandles: [],
    handles: [],
    users: [],
    histories: new Map(),
    touchedByHandle: new Map(),
    performanceRows: [],
  };

  let requestChain = Promise.resolve();
  let lastNetworkAt = 0;
  let activeRunId = 0;

  const lossProbabilityCache = new Float64Array(2 * RATING_RANGE + 1);
  for (let diff = -RATING_RANGE; diff <= RATING_RANGE; diff += 1) {
    lossProbabilityCache[diff + RATING_RANGE] = 1 / (1 + Math.pow(10, diff / 400));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runExclusive(async () => {
      await loadCoreData();
    });
  });

  clearCacheButton.addEventListener("click", () => {
    clearLocalCache();
    setStatus("캐시를 비웠습니다.");
  });

  loadPerformanceButton.addEventListener("click", () => {
    runExclusive(async () => {
      await loadPerformanceEstimates();
    });
  });

  findFreshButton.addEventListener("click", () => {
    runExclusive(async () => {
      await findFreshContests();
    });
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.cfTab));
  });

  [ratingStartInput, ratingEndInput].forEach((input) => {
    input.addEventListener("input", () => renderRatingGraphAndTable());
  });

  [performanceStartInput, performanceEndInput].forEach((input) => {
    input.addEventListener("input", () => renderPerformanceGraphAndTable());
  });

  function activateTab(tabId) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.cfTab === tabId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.cfPanel === tabId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  }

  function setStatus(message) {
    statusNode.textContent = message;
  }

  async function runExclusive(work) {
    const runId = activeRunId + 1;
    activeRunId = runId;
    setBusy(true);
    try {
      await work(runId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      if (activeRunId === runId) {
        setBusy(false);
      }
    }
  }

  function setBusy(isBusy) {
    form.querySelector("button[type='submit']").disabled = isBusy;
    loadPerformanceButton.disabled = isBusy;
    findFreshButton.disabled = isBusy;
  }

  function parseHandles(value) {
    const seen = new Set();
    const handles = [];
    String(value)
      .split(/[,，\n\r]+/u)
      .map((handle) => handle.trim())
      .filter(Boolean)
      .forEach((handle) => {
        const normalized = normalizeHandle(handle);
        if (seen.has(normalized)) return;
        seen.add(normalized);
        handles.push(handle);
      });
    return handles;
  }

  function normalizeHandle(handle) {
    return String(handle || "").trim().toLowerCase();
  }

  async function loadCoreData() {
    const requestedHandles = parseHandles(handlesInput.value);
    if (requestedHandles.length === 0) {
      throw new Error("쉼표로 구분한 Codeforces 핸들을 입력하세요.");
    }
    if (requestedHandles.length > 12) {
      throw new Error("공개 API 제한 때문에 한 번에 최대 12개 핸들만 불러옵니다.");
    }

    state.requestedHandles = requestedHandles;
    state.handles = [];
    state.users = [];
    state.histories = new Map();
    state.touchedByHandle = new Map();
    state.performanceRows = [];

    renderEmptyState("핸들을 불러오는 중입니다...", userListNode);
    renderEmptyState("레이팅 기록을 불러오는 중입니다...", ratingChartNode);
    ratingTableNode.replaceChildren();
    renderEmptyState("레이팅 기록을 먼저 불러온 뒤 추정치를 불러오세요.", performanceChartNode);
    performanceTableNode.replaceChildren();
    renderEmptyState("핸들 2개를 불러오면 함께 친 rated contest를 비교합니다.", headToHeadNode);

    setStatus(`공개 프로필 ${requestedHandles.length}개를 불러오는 중입니다...`);
    const users = await fetchCodeforces("user.info", {
      handles: requestedHandles.join(";"),
    }, {
      ttlMs: hours(1),
      label: "user.info",
    });

    const userByRequestedHandle = new Map(users.map((user) => [normalizeHandle(user.handle), user]));
    const canonicalHandles = requestedHandles.map((handle) => {
      const user = userByRequestedHandle.get(normalizeHandle(handle));
      return user ? user.handle : handle;
    });

    state.users = users;
    state.handles = canonicalHandles;
    renderUsers();

    for (const handle of canonicalHandles) {
      setStatus(`${handle} 레이팅 기록을 불러오는 중입니다...`);
      const history = await fetchCodeforces("user.rating", { handle }, {
        ttlMs: hours(1),
        label: `user.rating ${handle}`,
      });
      state.histories.set(normalizeHandle(handle), history);
    }

    renderRatingGraphAndTable();
    renderHeadToHead();
    setStatus(`${canonicalHandles.length}개 핸들을 불러왔습니다.`);
  }

  async function ensureCoreData() {
    const parsed = parseHandles(handlesInput.value);
    const current = state.requestedHandles.map(normalizeHandle).join("|");
    const next = parsed.map(normalizeHandle).join("|");
    if (parsed.length > 0 && current === next && state.handles.length > 0) {
      return;
    }
    await loadCoreData();
  }

  function renderUsers() {
    if (state.users.length === 0) {
      renderEmptyState("아직 불러온 핸들이 없습니다.", userListNode);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const user of state.users) {
      const item = el("div", { className: "cf-user" });
      item.appendChild(el("strong", { textContent: user.handle }));
      item.appendChild(el("span", {
        textContent: `${user.rank || "unrated"} / 현재 ${formatRating(user.rating)} / 최고 ${formatRating(user.maxRating)}`,
      }));
      fragment.appendChild(item);
    }
    userListNode.replaceChildren(fragment);
  }

  function renderRatingGraphAndTable() {
    const range = readDateRange(ratingStartInput, ratingEndInput);
    const series = state.handles.map((handle, index) => ({
      name: handle,
      color: COLORS[index % COLORS.length],
      points: getHistory(handle)
        .filter((change) => isInDateRange(change.ratingUpdateTimeSeconds, range))
        .map((change) => ({
          x: change.ratingUpdateTimeSeconds,
          y: change.newRating,
          label: `${formatDate(change.ratingUpdateTimeSeconds)} - ${change.contestName}: ${change.oldRating} -> ${change.newRating}`,
        })),
    }));
    renderLineChart(ratingChartNode, series, {
      emptyText: "선택한 기간에 공개 레이팅 기록이 없습니다.",
      yLabel: "레이팅",
    });

    const rows = [];
    for (const handle of state.handles) {
      for (const change of getHistory(handle)) {
        if (!isInDateRange(change.ratingUpdateTimeSeconds, range)) continue;
        rows.push({
          handle,
          contestName: change.contestName,
          rank: change.rank,
          oldRating: change.oldRating,
          newRating: change.newRating,
          delta: change.newRating - change.oldRating,
          ratingUpdateTimeSeconds: change.ratingUpdateTimeSeconds,
        });
      }
    }
    rows.sort((left, right) => right.ratingUpdateTimeSeconds - left.ratingUpdateTimeSeconds);
    renderTable(ratingTableNode, ["날짜", "핸들", "대회", "순위", "이전", "이후", "변동"], rows.slice(0, 40), (row) => [
      formatDate(row.ratingUpdateTimeSeconds),
      row.handle,
      row.contestName,
      formatNumber(row.rank),
      formatNumber(row.oldRating),
      formatNumber(row.newRating),
      formatSigned(row.delta),
    ]);
  }

  function renderHeadToHead() {
    if (state.handles.length !== 2) {
      renderEmptyState("핸들 2개를 불러오면 함께 친 rated contest를 비교합니다.", headToHeadNode);
      return;
    }

    const handleA = state.handles[0];
    const handleB = state.handles[1];
    const historyA = getHistory(handleA);
    const historyBByContest = new Map(getHistory(handleB).map((change) => [change.contestId, change]));
    const contests = [];

    for (const changeA of historyA) {
      const changeB = historyBByContest.get(changeA.contestId);
      if (!changeB) continue;
      const deltaA = changeA.newRating - changeA.oldRating;
      const deltaB = changeB.newRating - changeB.oldRating;
      const winner = changeA.rank < changeB.rank ? handleA : changeB.rank < changeA.rank ? handleB : "무승부";
      contests.push({
        contestId: changeA.contestId,
        contestName: changeA.contestName,
        ratingUpdateTimeSeconds: Math.max(changeA.ratingUpdateTimeSeconds, changeB.ratingUpdateTimeSeconds),
        rankA: changeA.rank,
        rankB: changeB.rank,
        deltaA,
        deltaB,
        winner,
        rankGap: Math.abs(changeA.rank - changeB.rank),
        deltaGap: Math.abs(deltaA - deltaB),
      });
    }

    contests.sort((left, right) => right.ratingUpdateTimeSeconds - left.ratingUpdateTimeSeconds);
    const aWins = contests.filter((contest) => contest.winner === handleA).length;
    const bWins = contests.filter((contest) => contest.winner === handleB).length;
    const ties = contests.filter((contest) => contest.winner === "무승부").length;

    const fragment = document.createDocumentFragment();
    fragment.appendChild(el("p", {
      className: "cf-summary-line",
      children: [
        summaryPart("함께 친 rated contest", contests.length),
        summaryPart(`${handleA} 승`, aWins),
        summaryPart(`${handleB} 승`, bWins),
        summaryPart("무승부", ties),
      ],
    }));

    const tableWrap = el("div", { className: "cf-table-wrap" });
    renderTable(tableWrap, ["날짜", "대회", `${handleA} 순위`, `${handleB} 순위`, "승자", `${handleA} 변동`, `${handleB} 변동`, "변동 차이"], contests, (row) => [
      formatDate(row.ratingUpdateTimeSeconds),
      row.contestName,
      formatNumber(row.rankA),
      formatNumber(row.rankB),
      row.winner,
      formatSigned(row.deltaA),
      formatSigned(row.deltaB),
      formatNumber(row.deltaGap),
    ]);
    fragment.appendChild(tableWrap);
    headToHeadNode.replaceChildren(fragment);
  }

  function summaryPart(label, value) {
    const span = el("span");
    span.appendChild(document.createTextNode(`${label} `));
    span.appendChild(el("strong", { textContent: String(value) }));
    return span;
  }

  async function findFreshContests() {
    await ensureCoreData();

    const selectedDivisions = new Set(
      officialDivisionInputs
        .filter((input) => input.checked)
        .map((input) => input.value),
    );
    const includeGym = includeGymInput.checked;
    if (selectedDivisions.size === 0 && !includeGym) {
      throw new Error("공식 라운드나 Gym 중 하나는 선택해 주세요.");
    }

    const maxPages = clampInteger(Number(statusPagesInput.value), 1, 200);
    const resultLimit = clampInteger(Number(freshLimitInput.value), 5, 200);
    const hasGymMin = String(gymMinInput.value || "").trim() !== "";
    const hasGymMax = String(gymMaxInput.value || "").trim() !== "";
    const gymMinSeconds = parseDurationToSeconds(gymMinInput.value);
    const gymMaxSeconds = parseDurationToSeconds(gymMaxInput.value);
    if (
      includeGym &&
      ((hasGymMin && gymMinSeconds == null) ||
        (hasGymMax && gymMaxSeconds == null) ||
        (gymMinSeconds != null && gymMaxSeconds != null && gymMinSeconds > gymMaxSeconds))
    ) {
      throw new Error("Gym 시간 범위는 HH:MM 형식으로 입력하고, 최소 시간이 최대 시간보다 크지 않게 해 주세요.");
    }

    setStatus("대회 목록을 불러오는 중입니다...");
    const officialPromise = selectedDivisions.size > 0
      ? fetchCodeforces("contest.list", { gym: "false" }, { ttlMs: hours(24), label: "contest.list official" })
      : Promise.resolve([]);
    const gymPromise = includeGym
      ? fetchCodeforces("contest.list", { gym: "true" }, { ttlMs: hours(24), label: "contest.list gym" })
      : Promise.resolve([]);
    const [officialContests, gymContests] = await Promise.all([officialPromise, gymPromise]);

    const touched = new Set();
    for (const handle of state.handles) {
      setStatus(`${handle}이 이미 친 대회를 확인하는 중입니다...`);
      const ids = await loadTouchedContestIds(handle, maxPages);
      ids.forEach((id) => touched.add(id));
    }

    const candidates = [];
    for (const contest of officialContests) {
      if (!isFinished(contest)) continue;
      if (touched.has(Number(contest.id))) continue;
      const division = classifyOfficialContest(contest.name);
      if (!division || !selectedDivisions.has(division)) continue;
      candidates.push(toFreshContestRow(contest, division, "공식"));
    }

    if (includeGym) {
      for (const contest of gymContests) {
        if (!isFinished(contest)) continue;
        if (touched.has(Number(contest.id))) continue;
        const duration = Number(contest.durationSeconds);
        if (!Number.isFinite(duration)) continue;
        if (gymMinSeconds != null && duration < gymMinSeconds) continue;
        if (gymMaxSeconds != null && duration > gymMaxSeconds) continue;
        candidates.push(toFreshContestRow(contest, "gym", "Gym"));
      }
    }

    candidates.sort((left, right) => {
      const leftTime = Number(left.startTimeSeconds) || 0;
      const rightTime = Number(right.startTimeSeconds) || 0;
      return rightTime - leftTime || Number(right.id) - Number(left.id);
    });

    renderFreshContestTable(candidates.slice(0, resultLimit), candidates.length, maxPages);
    setStatus(`안 친 후보 대회 ${candidates.length}개를 찾았습니다.`);
  }

  async function loadTouchedContestIds(handle, maxPages) {
    const normalized = normalizeHandle(handle);
    const existing = state.touchedByHandle.get(normalized);
    if (existing && existing.maxPages >= maxPages) {
      return existing.ids;
    }

    const ids = new Set(getHistory(handle).map((change) => Number(change.contestId)));
    for (let page = 0; page < maxPages; page += 1) {
      const from = page * PAGE_SIZE + 1;
      setStatus(`${handle} 제출 기록 ${page + 1}/${maxPages}페이지를 확인하는 중입니다...`);
      const compact = await fetchStatusContestIdsPage(handle, from, PAGE_SIZE);
      compact.contestIds.forEach((id) => ids.add(id));
      if (compact.rowCount < PAGE_SIZE) break;
      await nextFrame();
    }

    state.touchedByHandle.set(normalized, { maxPages, ids });
    return ids;
  }

  async function fetchStatusContestIdsPage(handle, from, count) {
    const key = `statusContestIds:${normalizeHandle(handle)}:${from}:${count}`;
    const cached = getCache(key, hours(6));
    if (cached) return cached;

    const rows = await requestCodeforces("user.status", {
      handle,
      from: String(from),
      count: String(count),
    }, `user.status ${handle}`);

    const contestIds = Array.from(new Set(
      rows
        .map((row) => Number(row.contestId))
        .filter((id) => Number.isFinite(id)),
    ));
    const compact = { rowCount: rows.length, contestIds };
    setCache(key, compact);
    return compact;
  }

  function renderFreshContestTable(rows, totalCount, maxPages) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(el("p", {
      className: "cf-note",
      textContent: `후보 ${totalCount}개 중 ${rows.length}개를 표시합니다. 핸들별 최근 제출은 최대 ${maxPages * PAGE_SIZE}개까지 확인했습니다.`,
    }));
    const wrap = el("div", { className: "cf-table-wrap" });
    renderTable(wrap, ["종류", "구분", "대회", "길이", "시작", "링크"], rows, (row) => [
      row.kind,
      row.divisionLabel,
      row.name,
      formatDuration(row.durationSeconds),
      row.startTimeSeconds ? formatDate(row.startTimeSeconds) : "-",
      { text: "열기", href: row.url },
    ]);
    fragment.appendChild(wrap);
    freshResultsNode.replaceChildren(fragment);
  }

  async function loadPerformanceEstimates() {
    await ensureCoreData();

    const limit = clampInteger(Number(performanceLimitInput.value), 1, 30);
    const range = readDateRange(performanceStartInput, performanceEndInput);
    const contestsById = new Map();
    for (const handle of state.handles) {
      const history = getHistory(handle).filter((change) => isInDateRange(change.ratingUpdateTimeSeconds, range));
      for (const change of history.slice(-limit)) {
        const existing = contestsById.get(change.contestId);
        contestsById.set(change.contestId, {
          contestId: change.contestId,
          contestName: change.contestName,
          ratingUpdateTimeSeconds: Math.max(existing?.ratingUpdateTimeSeconds || 0, change.ratingUpdateTimeSeconds),
        });
      }
    }

    const contests = Array.from(contestsById.values())
      .sort((left, right) => left.ratingUpdateTimeSeconds - right.ratingUpdateTimeSeconds);
    if (contests.length === 0) {
      throw new Error("선택한 기간에 불러올 rated contest가 없습니다.");
    }

    const selectedHandles = new Set(state.handles.map(normalizeHandle));
    const selectedHistoryContext = buildSelectedHistoryContext();
    const rows = [];
    state.performanceRows = [];
    renderEmptyState("추정치를 계산하는 중입니다...", performanceChartNode);
    performanceTableNode.replaceChildren();

    for (let index = 0; index < contests.length; index += 1) {
      const contest = contests[index];
      setStatus(`${contest.contestName} 레이팅 변동을 불러오는 중입니다 (${index + 1}/${contests.length})...`);
      const ratingChanges = await fetchCodeforces("contest.ratingChanges", {
        contestId: String(contest.contestId),
      }, {
        ttlMs: hours(24),
        label: `contest.ratingChanges ${contest.contestId}`,
      });

      setStatus(`${contest.contestName} 퍼포먼스를 추정하는 중입니다...`);
      const contestRows = estimateContestPerformance(ratingChanges, contest, selectedHandles, selectedHistoryContext);
      rows.push(...contestRows);
      state.performanceRows = rows;
      renderPerformanceGraphAndTable();
      await nextFrame();
    }

    setStatus(`퍼포먼스 추정치 ${rows.length}개를 계산했습니다.`);
  }

  function buildSelectedHistoryContext() {
    const context = new Map();
    for (const handle of state.handles) {
      getHistory(handle).forEach((change, historyIndex) => {
        context.set(`${change.contestId}:${normalizeHandle(handle)}`, {
          historyIndex,
          ratingUpdateTimeSeconds: change.ratingUpdateTimeSeconds,
        });
      });
    }
    return context;
  }

  function estimateContestPerformance(ratingChanges, contestMeta, selectedHandles, selectedHistoryContext = new Map()) {
    if (!Array.isArray(ratingChanges) || ratingChanges.length === 0) return [];

    const contestants = ratingChanges
      .filter((change) => change && change.handle && Number.isFinite(Number(change.rank)))
      .map((change) => {
        const normalizedHandle = normalizeHandle(change.handle);
        const selectedContext = selectedHistoryContext.get(`${change.contestId}:${normalizedHandle}`) || null;
        const ratingUpdateTimeSeconds = selectedContext?.ratingUpdateTimeSeconds || contestMeta.ratingUpdateTimeSeconds || 0;
        const historyIndex = selectedContext?.historyIndex ?? null;
        const oldRating = Number(change.oldRating) || 0;
        const newRating = Number(change.newRating) || 0;
        const displayBonus = newAccountDisplayBonus(ratingUpdateTimeSeconds, historyIndex);
        return {
          handle: change.handle,
          normalizedHandle,
          rank: Number(change.rank),
          oldRating,
          newRating,
          historyIndex,
          displayBonus,
          effectiveRating: adjustedOldRating(oldRating, ratingUpdateTimeSeconds, historyIndex),
          rawDelta: 0,
          predictedDelta: 0,
        };
      });

    if (contestants.length === 0) return [];

    const ratingCounts = new Map();
    for (const contestant of contestants) {
      const rating = clampInteger(contestant.effectiveRating, MIN_RATING, MAX_RATING);
      contestant.effectiveRating = rating;
      ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
    }

    const seedBase = buildSeedBase(ratingCounts);
    const seedForRating = (rating, ownRating) => {
      const bounded = clampInteger(rating, MIN_RATING, MAX_RATING);
      return seedBase[bounded - MIN_RATING] - lossProbability(bounded, ownRating);
    };
    const rankToRating = (rank, ownRating) => {
      if (seedForRating(MIN_RATING, ownRating) < rank) return MIN_RATING;
      if (seedForRating(MAX_RATING, ownRating) >= rank) return MAX_RATING;

      let low = MIN_RATING;
      let high = MAX_RATING;
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if (seedForRating(mid, ownRating) >= rank) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      return low;
    };
    const calculateDelta = (contestant, assumedRating) => {
      const seed = seedForRating(assumedRating, contestant.effectiveRating);
      const targetRank = Math.sqrt(contestant.rank * seed);
      const neededRating = rankToRating(targetRank, contestant.effectiveRating);
      return Math.trunc((neededRating - assumedRating) / 2);
    };

    for (const contestant of contestants) {
      contestant.rawDelta = calculateDelta(contestant, contestant.effectiveRating);
    }

    const adjustment = calculateDeltaAdjustment(contestants);
    for (const contestant of contestants) {
      contestant.predictedDelta = contestant.rawDelta + adjustment;
    }

    return contestants
      .filter((contestant) => selectedHandles.has(contestant.normalizedHandle))
      .map((contestant) => {
        const estimatedPerformance = calculatePerformance(contestant, calculateDelta, adjustment);
        const performanceValue = Number.isFinite(estimatedPerformance) ? estimatedPerformance : MAX_RATING;
        return {
          handle: contestant.handle,
          contestId: contestMeta.contestId,
          contestName: contestMeta.contestName,
          ratingUpdateTimeSeconds: contestMeta.ratingUpdateTimeSeconds,
          rank: contestant.rank,
          oldRating: contestant.oldRating,
          newRating: contestant.newRating,
          officialDelta: contestant.newRating - contestant.oldRating,
          estimatedTrueDelta: contestant.newRating - contestant.oldRating - contestant.displayBonus,
          predictedDelta: contestant.predictedDelta,
          effectiveOldRating: contestant.effectiveRating,
          displayBonus: contestant.displayBonus,
          ratedContestNumber: contestant.historyIndex == null ? null : contestant.historyIndex + 1,
          performance: performanceValue,
          performanceLabel: Number.isFinite(estimatedPerformance) ? formatNumber(estimatedPerformance) : `>${MAX_RATING}`,
          participantCount: contestants.length,
        };
      });
  }

  function adjustedOldRating(oldRating, ratingUpdateTimeSeconds, historyIndex = null) {
    if (!usesModernNewAccountPolicy(ratingUpdateTimeSeconds)) {
      return oldRating;
    }
    if (historyIndex != null && historyIndex >= 0 && historyIndex < NEW_ACCOUNT_HIDDEN_OFFSETS.length) {
      return oldRating + NEW_ACCOUNT_HIDDEN_OFFSETS[historyIndex];
    }
    if (oldRating === 0) {
      return NEW_DEFAULT_RATING;
    }
    return oldRating;
  }

  function newAccountDisplayBonus(ratingUpdateTimeSeconds, historyIndex) {
    if (!usesModernNewAccountPolicy(ratingUpdateTimeSeconds)) {
      return 0;
    }
    if (historyIndex == null || historyIndex < 0 || historyIndex >= NEW_ACCOUNT_DISPLAY_BONUSES.length) {
      return 0;
    }
    return NEW_ACCOUNT_DISPLAY_BONUSES[historyIndex];
  }

  function usesModernNewAccountPolicy(ratingUpdateTimeSeconds) {
    return Number(ratingUpdateTimeSeconds) >= NEW_ACCOUNT_POLICY_START_SECONDS;
  }

  function buildSeedBase(ratingCounts) {
    const entries = Array.from(ratingCounts.entries());
    const seedBase = new Float64Array(RATING_RANGE + 1);
    for (let rating = MIN_RATING; rating <= MAX_RATING; rating += 1) {
      let seed = 1;
      for (const [opponentRating, count] of entries) {
        seed += count * lossProbability(rating, opponentRating);
      }
      seedBase[rating - MIN_RATING] = seed;
    }
    return seedBase;
  }

  function lossProbability(rating, opponentRating) {
    const diff = rating - opponentRating;
    if (diff >= -RATING_RANGE && diff <= RATING_RANGE) {
      return lossProbabilityCache[diff + RATING_RANGE];
    }
    return 1 / (1 + Math.pow(10, diff / 400));
  }

  function calculateDeltaAdjustment(contestants) {
    const byRating = contestants.slice().sort((left, right) => right.effectiveRating - left.effectiveRating);
    const totalDelta = byRating.reduce((sum, contestant) => sum + contestant.rawDelta, 0);
    const primaryAdjustment = Math.trunc(-totalDelta / byRating.length) - 1;

    const leaderCount = Math.min(4 * Math.round(Math.sqrt(byRating.length)), byRating.length);
    const leaderDelta = byRating
      .slice(0, leaderCount)
      .reduce((sum, contestant) => sum + contestant.rawDelta + primaryAdjustment, 0);
    const leaderAdjustment = Math.min(Math.max(Math.trunc(-leaderDelta / leaderCount), -10), 0);
    return primaryAdjustment + leaderAdjustment;
  }

  function calculatePerformance(contestant, calculateDelta, adjustment) {
    if (contestant.rank === 1) {
      return Infinity;
    }

    const condition = (rating) => calculateDelta(contestant, rating) + adjustment <= 0;
    if (condition(MIN_RATING)) return MIN_RATING;
    if (!condition(MAX_RATING)) return Infinity;

    let low = MIN_RATING;
    let high = MAX_RATING;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (condition(mid)) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  function renderPerformanceGraphAndTable() {
    const range = readDateRange(performanceStartInput, performanceEndInput);
    const rows = state.performanceRows
      .filter((row) => isInDateRange(row.ratingUpdateTimeSeconds, range))
      .slice()
      .sort((left, right) => left.ratingUpdateTimeSeconds - right.ratingUpdateTimeSeconds);
    const rowsByHandle = new Map();
    for (const row of rows) {
      if (!rowsByHandle.has(normalizeHandle(row.handle))) rowsByHandle.set(normalizeHandle(row.handle), []);
      rowsByHandle.get(normalizeHandle(row.handle)).push(row);
    }

    const series = state.handles.map((handle, index) => ({
      name: handle,
      color: COLORS[index % COLORS.length],
      points: (rowsByHandle.get(normalizeHandle(handle)) || []).map((row) => ({
        x: row.ratingUpdateTimeSeconds,
        y: row.performance,
        label: `${formatDate(row.ratingUpdateTimeSeconds)} - ${row.contestName}: ${row.performanceLabel}`,
      })),
    }));

    renderLineChart(performanceChartNode, series, {
      emptyText: "선택한 기간에 표시할 퍼포먼스 추정치가 없습니다.",
      yLabel: "추정 퍼포먼스",
    });

    const newest = rows.slice().sort((left, right) => right.ratingUpdateTimeSeconds - left.ratingUpdateTimeSeconds);
    renderTable(performanceTableNode, ["날짜", "핸들", "대회", "순위", "퍼포먼스", "표시 변동", "실제 변동 추정", "예측 변동", "보정 이전 레이팅", "초반 보너스", "Rated 회차", "Rated 인원"], newest, (row) => [
      formatDate(row.ratingUpdateTimeSeconds),
      row.handle,
      row.contestName,
      formatNumber(row.rank),
      row.performanceLabel,
      formatSigned(row.officialDelta),
      formatSigned(row.estimatedTrueDelta),
      formatSigned(row.predictedDelta),
      formatNumber(row.effectiveOldRating),
      row.displayBonus ? formatNumber(row.displayBonus) : "-",
      row.ratedContestNumber == null ? "-" : formatNumber(row.ratedContestNumber),
      formatNumber(row.participantCount),
    ]);
  }

  function getHistory(handle) {
    return state.histories.get(normalizeHandle(handle)) || [];
  }

  function readDateRange(startInput, endInput) {
    return {
      start: parseDateInput(startInput?.value, false),
      end: parseDateInput(endInput?.value, true),
    };
  }

  function parseDateInput(value, endOfDay) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const seconds = Math.floor(date.getTime() / 1000);
    return endOfDay ? seconds + 24 * 60 * 60 - 1 : seconds;
  }

  function isInDateRange(seconds, range) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return false;
    if (range.start != null && value < range.start) return false;
    if (range.end != null && value > range.end) return false;
    return true;
  }

  function classifyOfficialContest(name) {
    const lower = String(name || "").toLowerCase();
    if (
      lower.includes("unrated") ||
      lower.includes("april fools") ||
      lower.includes("kotlin") ||
      lower.includes("marathon") ||
      lower.includes("teams") ||
      lower.includes("q#")
    ) {
      return null;
    }
    if (/div\.?\s*1\s*\+\s*div\.?\s*2/u.test(lower) || /div\.?\s*1\s*\+\s*2/u.test(lower)) return "div1+2";
    if (/div\.?\s*4/u.test(lower)) return "div4";
    if (/div\.?\s*3/u.test(lower)) return "div3";
    if (/div\.?\s*2/u.test(lower)) return "div2";
    if (/div\.?\s*1/u.test(lower)) return "div1";
    return null;
  }

  function toFreshContestRow(contest, division, kind) {
    return {
      id: Number(contest.id),
      kind,
      division,
      divisionLabel: formatDivision(division),
      name: contest.name || `대회 ${contest.id}`,
      durationSeconds: Number(contest.durationSeconds) || 0,
      startTimeSeconds: Number(contest.startTimeSeconds) || 0,
      url: kind === "Gym"
        ? `https://codeforces.com/gym/${contest.id}`
        : `https://codeforces.com/contest/${contest.id}`,
    };
  }

  function formatDivision(division) {
    return {
      div4: "Div. 4",
      div3: "Div. 3",
      div2: "Div. 2",
      div1: "Div. 1",
      "div1+2": "Div. 1 + Div. 2",
      gym: "Gym",
    }[division] || division;
  }

  function isFinished(contest) {
    return contest && contest.phase === "FINISHED";
  }

  async function fetchCodeforces(method, params, options) {
    const cacheKey = buildCacheKey(method, params);
    const cached = getCache(cacheKey, options.ttlMs);
    if (cached) return cached;

    const result = await requestCodeforces(method, params, options.label || method);
    setCache(cacheKey, result);
    return result;
  }

  async function requestCodeforces(method, params, label) {
    const url = buildApiUrl(method, params);
    return scheduleNetwork(label, async () => {
      let lastError = null;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
          }

          const payload = await response.json();
          if (payload.status === "FAILED") {
            throw new Error(payload.comment || "Codeforces API 요청에 실패했습니다.");
          }

          return payload.result;
        } catch (error) {
          lastError = error;
          if (attempt < 2) {
            setStatus(`${label} 요청이 흔들려서 한 번 더 시도합니다...`);
            await sleep(REQUEST_GAP_MS);
          }
        }
      }

      const reason = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`Codeforces 응답을 받지 못했습니다: ${reason}`);
    });
  }

  function scheduleNetwork(label, work) {
    const run = requestChain.then(async () => {
      const waitMs = Math.max(0, lastNetworkAt + REQUEST_GAP_MS - Date.now());
      if (waitMs > 0) {
        setStatus(`Codeforces API 제한 때문에 ${label} 요청을 잠시 기다리는 중입니다...`);
        await sleep(waitMs);
      }
      setStatus(`${label} 요청 중입니다...`);
      lastNetworkAt = Date.now();
      return work();
    });
    requestChain = run.catch(() => {});
    return run;
  }

  function buildApiUrl(method, params) {
    const url = new URL(method, API_BASE);
    Object.entries(params || {})
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    return url.toString();
  }

  function buildCacheKey(method, params) {
    return `${method}?${new URLSearchParams(Object.entries(params || {}).sort(([left], [right]) => left.localeCompare(right))).toString()}`;
  }

  function getCache(key, ttlMs) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || Date.now() - cached.savedAt > ttlMs) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return cached.value;
    } catch {
      return null;
    }
  }

  function setCache(key, value) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        savedAt: Date.now(),
        value,
      }));
    } catch {
      pruneLocalCache();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
          savedAt: Date.now(),
          value,
        }));
      } catch {
        // Ignore cache quota failures. The tool can still work without cache.
      }
    }
  }

  function pruneLocalCache() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.slice(0, Math.ceil(keys.length / 2)).forEach((key) => localStorage.removeItem(key));
  }

  function clearLocalCache() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    state.touchedByHandle = new Map();
  }

  function renderLineChart(container, series, options) {
    const points = series.flatMap((item) => item.points.map((point) => ({ ...point, series: item })));
    const finitePoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (finitePoints.length === 0) {
      renderEmptyState(options.emptyText, container);
      return;
    }

    let minX = Math.min(...finitePoints.map((point) => point.x));
    let maxX = Math.max(...finitePoints.map((point) => point.x));
    let minY = Math.min(...finitePoints.map((point) => point.y));
    let maxY = Math.max(...finitePoints.map((point) => point.y));
    if (minX === maxX) {
      minX -= 24 * 60 * 60;
      maxX += 24 * 60 * 60;
    }
    if (minY === maxY) {
      minY -= 100;
      maxY += 100;
    }
    const yPad = Math.max(80, (maxY - minY) * 0.12);
    minY = Math.floor((minY - yPad) / 100) * 100;
    maxY = Math.ceil((maxY + yPad) / 100) * 100;

    const width = 960;
    const height = 320;
    const margin = { top: 18, right: 20, bottom: 42, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xScale = (value) => margin.left + ((value - minX) / (maxX - minX)) * plotWidth;
    const yScale = (value) => margin.top + (1 - (value - minY) / (maxY - minY)) * plotHeight;

    const svg = svgEl("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": `${options.yLabel} 그래프`,
    });

    for (let index = 0; index <= 4; index += 1) {
      const yValue = minY + ((maxY - minY) * index) / 4;
      const y = yScale(yValue);
      svg.appendChild(svgEl("line", {
        x1: margin.left,
        x2: width - margin.right,
        y1: y,
        y2: y,
        class: "cf-chart-grid",
      }));
      svg.appendChild(svgEl("text", {
        x: margin.left - 8,
        y: y + 4,
        "text-anchor": "end",
        class: "cf-chart-label",
        textContent: formatNumber(Math.round(yValue)),
      }));
    }

    svg.appendChild(svgEl("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: height - margin.bottom,
      y2: height - margin.bottom,
      class: "cf-chart-axis",
    }));
    svg.appendChild(svgEl("line", {
      x1: margin.left,
      x2: margin.left,
      y1: margin.top,
      y2: height - margin.bottom,
      class: "cf-chart-axis",
    }));

    for (const item of series) {
      const usablePoints = item.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      if (usablePoints.length === 0) continue;
      const pointRadius = finitePoints.length > 450 ? 1.7 : finitePoints.length > 220 ? 2.1 : finitePoints.length > 90 ? 2.7 : 3.2;
      const strokeWidth = finitePoints.length > 300 ? 1.7 : 2.4;
      const polylinePoints = usablePoints
        .map((point) => `${xScale(point.x).toFixed(2)},${yScale(point.y).toFixed(2)}`)
        .join(" ");
      svg.appendChild(svgEl("polyline", {
        points: polylinePoints,
        fill: "none",
        stroke: item.color,
        "stroke-width": strokeWidth,
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
      }));
      for (const point of usablePoints) {
        const circle = svgEl("circle", {
          cx: xScale(point.x),
          cy: yScale(point.y),
          r: pointRadius,
          fill: item.color,
        });
        circle.appendChild(svgEl("title", { textContent: point.label }));
        svg.appendChild(circle);
      }
    }

    const firstDate = formatDate(minX);
    const lastDate = formatDate(maxX);
    svg.appendChild(svgEl("text", {
      x: margin.left,
      y: height - 14,
      class: "cf-chart-label",
      textContent: firstDate,
    }));
    svg.appendChild(svgEl("text", {
      x: width - margin.right,
      y: height - 14,
      "text-anchor": "end",
      class: "cf-chart-label",
      textContent: lastDate,
    }));

    const legend = el("div", { className: "cf-legend" });
    for (const item of series) {
      if (item.points.length === 0) continue;
      const legendItem = el("span");
      legendItem.appendChild(el("i", { style: { background: item.color } }));
      legendItem.appendChild(document.createTextNode(item.name));
      legend.appendChild(legendItem);
    }

    container.replaceChildren(svg, legend);
  }

  function renderTable(container, headings, rows, mapRow) {
    if (!rows || rows.length === 0) {
      renderEmptyState("표시할 행이 없습니다.", container);
      return;
    }

    const table = el("table", { className: "cf-table" });
    const thead = el("thead");
    const headRow = el("tr");
    headings.forEach((heading) => headRow.appendChild(el("th", { textContent: heading })));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el("tbody");
    for (const row of rows) {
      const tr = el("tr");
      for (const cellValue of mapRow(row)) {
        const td = el("td");
        if (typeof cellValue === "object" && cellValue && cellValue.href) {
          const link = el("a", { textContent: cellValue.text || cellValue.href });
          link.href = cellValue.href;
          link.target = "_blank";
          link.rel = "noreferrer";
          td.appendChild(link);
        } else {
          td.textContent = String(cellValue);
        }
        if (/^-?\+?\d[\d,]*(\.\d+)?$/u.test(td.textContent.trim())) {
          td.classList.add("cf-num");
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.replaceChildren(table);
  }

  function renderEmptyState(message, container) {
    container.replaceChildren(el("p", { className: "cf-empty", textContent: message }));
  }

  function el(tagName, options = {}) {
    const node = document.createElement(tagName);
    if (options.className) node.className = options.className;
    if (options.textContent != null) node.textContent = options.textContent;
    if (options.style) Object.assign(node.style, options.style);
    if (options.children) {
      for (const child of options.children) node.appendChild(child);
    }
    return node;
  }

  function svgEl(tagName, attributes = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "textContent") {
        node.textContent = value;
      } else {
        node.setAttribute(key, String(value));
      }
    });
    return node;
  }

  function parseDurationToSeconds(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (/^\d+$/u.test(raw)) return Number(raw) * 60;
    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/u);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) return null;
    return (hours * 60 + minutes) * 60;
  }

  function formatDuration(seconds) {
    const totalMinutes = Math.round(Number(seconds || 0) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function formatDate(seconds) {
    if (!Number.isFinite(Number(seconds)) || Number(seconds) <= 0) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(Number(seconds) * 1000));
  }

  function formatRating(value) {
    return Number.isFinite(Number(value)) ? formatNumber(Number(value)) : "-";
  }

  function formatNumber(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Number(value));
  }

  function formatSigned(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: 0,
      signDisplay: "exceptZero",
    }).format(Number(value));
  }

  function clampInteger(value, min, max) {
    if (!Number.isFinite(Number(value))) return min;
    return Math.max(min, Math.min(max, Math.trunc(Number(value))));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function hours(value) {
    return value * 60 * 60 * 1000;
  }

  window.CodeforcesLab = {
    parseHandles,
    classifyOfficialContest,
    parseDurationToSeconds,
    estimateContestPerformance,
    adjustedOldRating,
    newAccountDisplayBonus,
    usesModernNewAccountPolicy,
    state,
  };
})();
