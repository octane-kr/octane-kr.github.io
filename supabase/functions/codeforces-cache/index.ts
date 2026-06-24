import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.3";

const API_BASE = "https://codeforces.com/api/";
const MIN_TTL_SECONDS = 60;

const METHOD_TTL_LIMITS: Record<string, { defaultSeconds: number; maxSeconds: number }> = {
  "contest.list": { defaultSeconds: hours(12), maxSeconds: days(2) },
  "contest.ratingChanges": { defaultSeconds: days(30), maxSeconds: days(365) },
  "user.info": { defaultSeconds: hours(1), maxSeconds: hours(6) },
  "user.rating": { defaultSeconds: hours(1), maxSeconds: hours(12) },
  "user.status": { defaultSeconds: hours(6), maxSeconds: hours(6) },
};

const ALLOWED_PARAMS: Record<string, Set<string>> = {
  "contest.list": new Set(["gym"]),
  "contest.ratingChanges": new Set(["contestId"]),
  "user.info": new Set(["handles"]),
  "user.rating": new Set(["handle"]),
  "user.status": new Set(["handle", "from", "count"]),
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ status: "FAILED", comment: "POST requests only." }, 405);
  }

  try {
    const input = await request.json();
    const method = parseMethod(input?.method);
    const params = parseParams(method, input?.params);
    const ttlSeconds = parseTtlSeconds(method, input?.ttlSeconds);
    const cacheOnly = Boolean(input?.cacheOnly);
    const cacheKey = buildCacheKey(method, params);
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: cached, error: cacheReadError } = await supabase
      .from("cf_api_cache")
      .select("payload,fetched_at,expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (cacheReadError) {
      throw new Error(`Cache read failed: ${cacheReadError.message}`);
    }

    if (cached) {
      return json({
        status: "OK",
        result: cached.payload,
        cached: true,
        fetchedAt: cached.fetched_at,
        expiresAt: cached.expires_at,
      });
    }

    if (cacheOnly) {
      return json({ status: "MISS", cached: false }, 404);
    }

    const payload = await fetchCodeforces(method, params);
    if (payload.status === "FAILED") {
      return json(payload, 200);
    }

    if (payload.status !== "OK") {
      throw new Error("Unexpected Codeforces response.");
    }

    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    const { error: cacheWriteError } = await supabase
      .from("cf_api_cache")
      .upsert({
        cache_key: cacheKey,
        method,
        params,
        payload: payload.result,
        fetched_at: nowIso,
        expires_at: expiresAt,
        updated_at: nowIso,
      }, {
        onConflict: "cache_key",
      });

    if (cacheWriteError) {
      console.warn(`Cache write failed for ${cacheKey}: ${cacheWriteError.message}`);
    }

    return json({
      status: "OK",
      result: payload.result,
      cached: false,
      fetchedAt: nowIso,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ status: "FAILED", comment: message }, 400);
  }
});

async function fetchCodeforces(method: string, params: Record<string, string>) {
  const url = new URL(method, API_BASE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "kokiri-blog-codeforces-lab-cache/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Codeforces HTTP ${response.status}`);
  }

  return await response.json();
}

function parseMethod(value: unknown) {
  const method = String(value || "").trim();
  if (!METHOD_TTL_LIMITS[method]) {
    throw new Error("Unsupported Codeforces method.");
  }
  return method;
}

function parseParams(method: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const allowed = ALLOWED_PARAMS[method];
  const params: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowed.has(key)) {
      throw new Error(`Unsupported parameter for ${method}.`);
    }
    const paramValue = String(rawValue ?? "").trim();
    if (!paramValue) continue;
    params[key] = paramValue;
  }

  validateParams(method, params);
  return Object.fromEntries(
    Object.entries(params).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function validateParams(method: string, params: Record<string, string>) {
  if (method === "contest.list") {
    if (!["true", "false"].includes(params.gym || "")) {
      throw new Error("contest.list requires gym=true or gym=false.");
    }
  }

  if (method === "contest.ratingChanges") {
    requirePositiveInteger(params.contestId, "contestId");
  }

  if (method === "user.info") {
    const handles = String(params.handles || "")
      .split(";")
      .map((handle) => handle.trim())
      .filter(Boolean);
    if (handles.length === 0 || handles.length > 50) {
      throw new Error("user.info requires 1 to 50 handles.");
    }
  }

  if (method === "user.rating") {
    requireHandle(params.handle);
  }

  if (method === "user.status") {
    requireHandle(params.handle);
    const from = requirePositiveInteger(params.from || "1", "from");
    const count = requirePositiveInteger(params.count || "1000", "count");
    if (from > 200000 || count > 1000) {
      throw new Error("user.status range is too large.");
    }
  }
}

function requireHandle(value: unknown) {
  const handle = String(value || "");
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(handle)) {
    throw new Error("Invalid Codeforces handle.");
  }
}

function requirePositiveInteger(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return number;
}

function parseTtlSeconds(method: string, value: unknown) {
  const limits = METHOD_TTL_LIMITS[method];
  const requested = Number(value);
  const ttl = Number.isFinite(requested) ? Math.trunc(requested) : limits.defaultSeconds;
  return Math.max(MIN_TTL_SECONDS, Math.min(limits.maxSeconds, ttl));
}

function buildCacheKey(method: string, params: Record<string, string>) {
  return `${method}?${new URLSearchParams(params).toString()}`;
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

function hours(value: number) {
  return value * 60 * 60;
}

function days(value: number) {
  return value * 24 * 60 * 60;
}
