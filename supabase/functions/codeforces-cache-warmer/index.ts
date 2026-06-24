import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const API_BASE = "https://codeforces.com/api/";
const REQUEST_GAP_MS = 2100;
const MAX_RUNTIME_MS = 125000;
const DEFAULT_BATCH_SIZE = 20;
const FORMULA_VERSION = 1;
const MIN_RATING = -500;
const MAX_RATING = 6000;
const RATING_RANGE = MAX_RATING - MIN_RATING;
const NEW_DEFAULT_RATING = 1400;
const NEW_ACCOUNT_POLICY_START_SECONDS = Date.UTC(2020, 4, 24, 17, 14) / 1000;
const NEW_ACCOUNT_DISPLAY_BONUSES = [500, 350, 250, 150, 100, 50];
const NEW_ACCOUNT_HIDDEN_OFFSETS = [1400, 900, 550, 300, 150, 50];

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase function environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const lossProbabilityCache = new Float64Array(2 * RATING_RANGE + 1);
for (let diff = -RATING_RANGE; diff <= RATING_RANGE; diff += 1) {
  lossProbabilityCache[diff + RATING_RANGE] = 1 / (1 + Math.pow(10, diff / 400));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ status: "FAILED", comment: "POST requests only." }, 405);
  }

  const startedAt = Date.now();
  const body = await safeJson(request);

  if (body?.mode === "refresh-handle") {
    if (!isAuthorizedManualRequest(request)) {
      return json({ status: "FAILED", comment: "Manual warmer mode requires an admin token." }, 401);
    }
    const handle = String(body?.handle || "");
    await refreshHandleInfo(handle);
    await sleep(REQUEST_GAP_MS);
    await refreshHandleRating(handle);
    return json({
      status: "OK",
      result: {
        mode: "refresh-handle",
        handle,
      },
    });
  }

  if (body?.mode === "contest-performance") {
    if (!isAuthorizedManualRequest(request)) {
      return json({ status: "FAILED", comment: "Manual warmer mode requires an admin token." }, 401);
    }
    const contestId = Number(body?.contestId);
    await refreshContestPerformance(contestId);
    return json({
      status: "OK",
      result: {
        mode: "contest-performance",
        contestId,
      },
    });
  }

  const batchSize = clampInteger(Number(body?.batchSize || DEFAULT_BATCH_SIZE), 1, 40);
  const summary = {
    processed: 0,
    completed: 0,
    failed: 0,
    taskTypes: {} as Record<string, number>,
    stoppedEarly: false,
  };

  const tasks = await getReadyTasks(batchSize);
  for (const task of tasks) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      summary.stoppedEarly = true;
      break;
    }

    summary.processed += 1;
    summary.taskTypes[task.task_type] = (summary.taskTypes[task.task_type] || 0) + 1;

    const locked = await lockTask(task.id);
    if (!locked) continue;

    try {
      await processTask(task);
      await completeTask(task.id);
      summary.completed += 1;
    } catch (error) {
      await failTask(task.id, error);
      summary.failed += 1;
    }

    await sleep(REQUEST_GAP_MS);
  }

  return json({ status: "OK", result: summary });
});

async function getReadyTasks(limit: number) {
  const staleLock = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("cf_cache_warm_queue")
    .select("id,task_key,task_type,payload,attempts")
    .is("done_at", null)
    .lte("run_after", new Date().toISOString())
    .or(`locked_at.is.null,locked_at.lt.${staleLock}`)
    .order("priority", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Queue read failed: ${error.message}`);
  return data || [];
}

function isAuthorizedManualRequest(request: Request) {
  const expected = Deno.env.get("CF_WARMER_ADMIN_TOKEN");
  return Boolean(expected) && request.headers.get("x-cf-warmer-admin") === expected;
}

async function lockTask(id: number) {
  const { data: current, error: readError } = await supabase
    .from("cf_cache_warm_queue")
    .select("id,attempts")
    .eq("id", id)
    .is("done_at", null)
    .maybeSingle();

  if (readError) throw new Error(`Queue lock read failed: ${readError.message}`);
  if (!current) return false;

  const { data, error } = await supabase
    .from("cf_cache_warm_queue")
    .update({
      locked_at: new Date().toISOString(),
      attempts: Number(current.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("done_at", null)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Queue lock failed: ${error.message}`);
  return Boolean(data);
}

async function completeTask(id: number) {
  const { error } = await supabase
    .from("cf_cache_warm_queue")
    .update({
      done_at: new Date().toISOString(),
      locked_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Queue complete failed: ${error.message}`);
}

async function failTask(id: number, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("cf_cache_warm_queue")
    .update({
      locked_at: null,
      run_after: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function processTask(task: any) {
  if (task.task_type === "noop") return;
  if (task.task_type === "contest-list") {
    await refreshContestList(Boolean(task.payload?.gym));
    return;
  }
  if (task.task_type === "handle-info") {
    await refreshHandleInfo(String(task.payload?.handle || ""));
    return;
  }
  if (task.task_type === "handle-rating") {
    await refreshHandleRating(String(task.payload?.handle || ""));
    return;
  }
  if (task.task_type === "contest-performance") {
    await refreshContestPerformance(Number(task.payload?.contestId));
    return;
  }
  throw new Error(`Unsupported task type: ${task.task_type}`);
}

async function refreshContestList(gym: boolean) {
  const contests = await fetchCodeforces("contest.list", { gym: String(gym) });
  const rows = contests
    .filter((contest: any) => contest && Number.isFinite(Number(contest.id)))
    .map((contest: any) => toContestRow(contest, gym ? "gym" : "official"));
  await upsertChunks("cf_contests", rows);
}

async function refreshHandleInfo(handle: string) {
  requireHandle(handle);
  const users = await fetchCodeforces("user.info", { handles: handle });
  const rows = users.map((user: any) => ({
    handle_key: normalizeHandle(user.handle),
    handle: user.handle,
    rank: user.rank || null,
    rating: numberOrNull(user.rating),
    max_rank: user.maxRank || null,
    max_rating: numberOrNull(user.maxRating),
    contribution: numberOrNull(user.contribution),
    friend_of_count: numberOrNull(user.friendOfCount),
    title_photo: user.titlePhoto || null,
    last_info_refresh_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await upsertChunks("cf_handles", rows);
}

async function refreshHandleRating(handle: string) {
  requireHandle(handle);
  const history = await fetchCodeforces("user.rating", { handle });
  const canonicalHandle = history[0]?.handle || handle;
  const handleKey = normalizeHandle(canonicalHandle);

  const contestRows = history.map((change: any) => ({
    contest_id: Number(change.contestId),
    name: change.contestName || `Contest ${change.contestId}`,
    kind: "official",
    division: classifyOfficialContest(change.contestName),
    phase: "FINISHED",
    duration_seconds: null,
    start_time_seconds: null,
    updated_at: new Date().toISOString(),
  }));
  await insertMissingContests(contestRows);

  const ratingRows = history.map((change: any, index: number) => ({
    handle_key: handleKey,
    handle: change.handle || canonicalHandle,
    contest_id: Number(change.contestId),
    contest_name: change.contestName || `Contest ${change.contestId}`,
    rank: numberOrNull(change.rank),
    old_rating: numberOrNull(change.oldRating),
    new_rating: numberOrNull(change.newRating),
    rating_update_time_seconds: numberOrNull(change.ratingUpdateTimeSeconds),
    history_index: index,
    refreshed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await upsertChunks("cf_handle_rating_history", ratingRows);

  const touchedRows = history.map((change: any) => ({
    handle_key: handleKey,
    handle: change.handle || canonicalHandle,
    contest_id: Number(change.contestId),
    source: "rating",
    last_seen_at: new Date().toISOString(),
  }));
  await upsertChunks("cf_touched_contests", touchedRows);

  for (const change of history) {
    const contestId = Number(change.contestId);
    if (!Number.isFinite(contestId)) continue;
    await enqueueTask(
      `contest-performance:${FORMULA_VERSION}:${contestId}`,
      "contest-performance",
      { contestId, formulaVersion: FORMULA_VERSION },
      50,
    );
  }
}

async function refreshContestPerformance(contestId: number) {
  if (!Number.isInteger(contestId) || contestId <= 0) {
    throw new Error("Invalid contest id.");
  }

  const { data: watchedRows, error } = await supabase
    .from("cf_handle_rating_history")
    .select("handle_key,handle,contest_id,contest_name,rank,old_rating,new_rating,rating_update_time_seconds,history_index")
    .eq("contest_id", contestId);

  if (error) throw new Error(error.message);
  if (!watchedRows || watchedRows.length === 0) return;

  const ratingChanges = await fetchCodeforces("contest.ratingChanges", { contestId: String(contestId) });
  const rows = estimateContestPerformance(ratingChanges, watchedRows).map((row) => ({
    handle_key: row.handleKey,
    handle: row.handle,
    contest_id: row.contestId,
    formula_version: FORMULA_VERSION,
    performance: row.performance,
    rank: row.rank,
    participant_count: row.participantCount,
    old_rating: row.oldRating,
    new_rating: row.newRating,
    rating_delta: row.ratingDelta,
    contest_name: row.contestName,
    rating_update_time_seconds: row.ratingUpdateTimeSeconds,
    computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  await upsertChunks("cf_performance_estimates", rows);
}

function estimateContestPerformance(ratingChanges: any[], watchedRows: any[]) {
  if (!Array.isArray(ratingChanges) || ratingChanges.length === 0) return [];
  const watchedByHandle = new Map(watchedRows.map((row) => [String(row.handle_key), row]));
  const selectedHandles = new Set(watchedByHandle.keys());

  const contestants = ratingChanges
    .filter((change) => change && change.handle && Number.isFinite(Number(change.rank)))
    .map((change) => {
      const handleKey = normalizeHandle(change.handle);
      const watched = watchedByHandle.get(handleKey) || null;
      const ratingUpdateTimeSeconds = Number(watched?.rating_update_time_seconds || 0);
      const historyIndex = Number.isInteger(Number(watched?.history_index)) ? Number(watched.history_index) : null;
      const oldRating = Number(change.oldRating) || 0;
      const displayBonus = newAccountDisplayBonus(ratingUpdateTimeSeconds, historyIndex);
      return {
        handle: change.handle,
        handleKey,
        rank: Number(change.rank),
        oldRating,
        newRating: Number(change.newRating) || 0,
        historyIndex,
        displayBonus,
        effectiveRating: adjustedOldRating(oldRating, ratingUpdateTimeSeconds, historyIndex),
        rawDelta: 0,
        predictedDelta: 0,
      };
    });

  if (contestants.length === 0) return [];

  const ratingCounts = new Map<number, number>();
  for (const contestant of contestants) {
    const rating = clampInteger(contestant.effectiveRating, MIN_RATING, MAX_RATING);
    contestant.effectiveRating = rating;
    ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
  }

  const seedBase = buildSeedBase(ratingCounts);
  const seedForRating = (rating: number, ownRating: number) => {
    const bounded = clampInteger(rating, MIN_RATING, MAX_RATING);
    return seedBase[bounded - MIN_RATING] - lossProbability(bounded, ownRating);
  };
  const rankToRating = (rank: number, ownRating: number) => {
    if (seedForRating(MIN_RATING, ownRating) < rank) return MIN_RATING;
    if (seedForRating(MAX_RATING, ownRating) >= rank) return MAX_RATING;
    let low = MIN_RATING;
    let high = MAX_RATING;
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (seedForRating(mid, ownRating) >= rank) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const calculateDelta = (contestant: any, assumedRating: number) => {
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
    .filter((contestant) => selectedHandles.has(contestant.handleKey))
    .map((contestant) => {
      const watched = watchedByHandle.get(contestant.handleKey);
      const performance = calculatePerformance(contestant, calculateDelta, adjustment);
      return {
        handleKey: contestant.handleKey,
        handle: watched?.handle || contestant.handle,
        contestId: Number(watched?.contest_id),
        contestName: watched?.contest_name || `Contest ${watched?.contest_id}`,
        ratingUpdateTimeSeconds: numberOrNull(watched?.rating_update_time_seconds),
        rank: contestant.rank,
        oldRating: contestant.oldRating,
        newRating: contestant.newRating,
        ratingDelta: contestant.newRating - contestant.oldRating,
        performance: Number.isFinite(performance) ? performance : MAX_RATING,
        participantCount: contestants.length,
      };
    });
}

function adjustedOldRating(oldRating: number, ratingUpdateTimeSeconds: number, historyIndex: number | null = null) {
  if (!usesModernNewAccountPolicy(ratingUpdateTimeSeconds)) return oldRating;
  if (historyIndex != null && historyIndex >= 0 && historyIndex < NEW_ACCOUNT_HIDDEN_OFFSETS.length) {
    return oldRating + NEW_ACCOUNT_HIDDEN_OFFSETS[historyIndex];
  }
  if (oldRating === 0) return NEW_DEFAULT_RATING;
  return oldRating;
}

function newAccountDisplayBonus(ratingUpdateTimeSeconds: number, historyIndex: number | null) {
  if (!usesModernNewAccountPolicy(ratingUpdateTimeSeconds)) return 0;
  if (historyIndex == null || historyIndex < 0 || historyIndex >= NEW_ACCOUNT_DISPLAY_BONUSES.length) return 0;
  return NEW_ACCOUNT_DISPLAY_BONUSES[historyIndex];
}

function usesModernNewAccountPolicy(ratingUpdateTimeSeconds: number) {
  return Number(ratingUpdateTimeSeconds) >= NEW_ACCOUNT_POLICY_START_SECONDS;
}

function buildSeedBase(ratingCounts: Map<number, number>) {
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

function lossProbability(rating: number, opponentRating: number) {
  const diff = rating - opponentRating;
  if (diff >= -RATING_RANGE && diff <= RATING_RANGE) {
    return lossProbabilityCache[diff + RATING_RANGE];
  }
  return 1 / (1 + Math.pow(10, diff / 400));
}

function calculateDeltaAdjustment(contestants: any[]) {
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

function calculatePerformance(contestant: any, calculateDelta: (contestant: any, rating: number) => number, adjustment: number) {
  if (contestant.rank === 1) return Infinity;
  const condition = (rating: number) => calculateDelta(contestant, rating) + adjustment <= 0;
  if (condition(MIN_RATING)) return MIN_RATING;
  if (!condition(MAX_RATING)) return Infinity;
  let low = MIN_RATING;
  let high = MAX_RATING;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (condition(mid)) high = mid;
    else low = mid + 1;
  }
  return low;
}

async function fetchCodeforces(method: string, params: Record<string, string>) {
  const url = new URL(method, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "kokiri-blog-codeforces-lab-warmer/1.0",
    },
  });

  if (!response.ok) throw new Error(`Codeforces HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status === "FAILED") throw new Error(payload.comment || "Codeforces API failed.");
  if (payload.status !== "OK") throw new Error("Unexpected Codeforces response.");
  return payload.result;
}

async function enqueueTask(taskKey: string, taskType: string, payload: Record<string, unknown>, priority: number) {
  const { error } = await supabase.rpc("enqueue_cf_cache_warm_task", {
    p_task_key: taskKey,
    p_task_type: taskType,
    p_payload: payload,
    p_priority: priority,
    p_run_after: new Date().toISOString(),
  });
  if (error) throw new Error(`Queue enqueue failed: ${error.message}`);
}

async function upsertChunks(table: string, rows: Record<string, unknown>[], chunkSize = 500) {
  const filtered = rows.filter(Boolean);
  for (let index = 0; index < filtered.length; index += chunkSize) {
    const chunk = filtered.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
  }
}

async function insertMissingContests(rows: Record<string, unknown>[], chunkSize = 500) {
  const filtered = rows.filter(Boolean);
  for (let index = 0; index < filtered.length; index += chunkSize) {
    const chunk = filtered.slice(index, index + chunkSize);
    if (chunk.length === 0) continue;
    const { error } = await supabase
      .from("cf_contests")
      .upsert(chunk, { onConflict: "contest_id", ignoreDuplicates: true });
    if (error) throw new Error(`cf_contests placeholder insert failed: ${error.message}`);
  }
}

function toContestRow(contest: any, kind: string) {
  return {
    contest_id: Number(contest.id),
    name: contest.name || `Contest ${contest.id}`,
    kind,
    division: kind === "gym" ? "gym" : classifyOfficialContest(contest.name),
    phase: contest.phase || null,
    duration_seconds: numberOrNull(contest.durationSeconds),
    start_time_seconds: numberOrNull(contest.startTimeSeconds),
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function classifyOfficialContest(name: unknown) {
  const lower = String(name || "").toLowerCase();
  if (lower.includes("unrated") || lower.includes("april fools") || lower.includes("kotlin") || lower.includes("marathon") || lower.includes("teams") || lower.includes("q#")) {
    return null;
  }
  if (/div\.?\s*1\s*\+\s*div\.?\s*2/u.test(lower) || /div\.?\s*1\s*\+\s*2/u.test(lower)) return "div1+2";
  if (/div\.?\s*4/u.test(lower)) return "div4";
  if (/div\.?\s*3/u.test(lower)) return "div3";
  if (/div\.?\s*2/u.test(lower)) return "div2";
  if (/div\.?\s*1/u.test(lower)) return "div1";
  return null;
}

function requireHandle(handle: string) {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(handle)) {
    throw new Error("Invalid Codeforces handle.");
  }
}

function normalizeHandle(handle: unknown) {
  return String(handle || "").trim().toLowerCase();
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampInteger(value: unknown, min: number, max: number) {
  if (!Number.isFinite(Number(value))) return min;
  return Math.max(min, Math.min(max, Math.trunc(Number(value))));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
