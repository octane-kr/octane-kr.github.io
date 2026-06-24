import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ status: "FAILED", comment: "POST requests only." }, 405);
  }

  try {
    const body = await request.json();
    const kind = String(body?.kind || "");
    if (kind !== "performance-estimates") {
      throw new Error("Unsupported derived cache kind.");
    }

    const handles = parseHandles(body?.handles);
    const contestIds = parseContestIds(body?.contestIds);
    const formulaVersion = parseFormulaVersion(body?.formulaVersion);

    const { data, error } = await supabase
      .from("cf_performance_estimates")
      .select([
        "handle",
        "handle_key",
        "contest_id",
        "contest_name",
        "rating_update_time_seconds",
        "rank",
        "participant_count",
        "performance",
        "old_rating",
        "new_rating",
        "rating_delta",
        "formula_version",
      ].join(","))
      .eq("formula_version", formulaVersion)
      .in("handle_key", handles.map((handle) => handle.toLowerCase()))
      .in("contest_id", contestIds);

    if (error) throw new Error(error.message);

    const rows = (data || []).map((row) => ({
      handle: row.handle,
      contestId: row.contest_id,
      contestName: row.contest_name,
      ratingUpdateTimeSeconds: row.rating_update_time_seconds,
      rank: row.rank,
      participantCount: row.participant_count,
      performance: row.performance,
      performanceLabel: formatPerformance(row.performance),
      oldRating: row.old_rating,
      newRating: row.new_rating,
      ratingDelta: row.rating_delta,
      formulaVersion: row.formula_version,
      source: "supabase-derived",
    }));

    return json({ status: "OK", result: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ status: "FAILED", comment: message }, 400);
  }
});

function parseHandles(value: unknown) {
  if (!Array.isArray(value)) throw new Error("handles must be an array.");
  const handles = value.map((handle) => String(handle || "").trim()).filter(Boolean);
  if (handles.length === 0 || handles.length > 50) {
    throw new Error("handles must contain 1 to 50 handles.");
  }
  for (const handle of handles) {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(handle)) {
      throw new Error("Invalid Codeforces handle.");
    }
  }
  return handles;
}

function parseContestIds(value: unknown) {
  if (!Array.isArray(value)) throw new Error("contestIds must be an array.");
  const contestIds = Array.from(new Set(value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
  if (contestIds.length === 0 || contestIds.length > 500) {
    throw new Error("contestIds must contain 1 to 500 ids.");
  }
  return contestIds;
}

function parseFormulaVersion(value: unknown) {
  const version = Number(value || 1);
  if (!Number.isInteger(version) || version < 1 || version > 50) {
    throw new Error("Invalid formula version.");
  }
  return version;
}

function formatPerformance(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US").format(Math.round(number));
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
