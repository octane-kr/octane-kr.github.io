import { pathToFileURL } from 'node:url';

export const solvedProfileUrl = 'https://solved.ac/api/v4/users/octane?lang=en';
const knownApiErrors = new Set([
  'MISSING_CLIENT_CREDENTIALS', 'INVALID_CLIENT_CREDENTIALS', 'INVALID_CLIENT_ID',
  'INVALID_CLIENT_SECRET', 'CLIENT_NOT_FOUND', 'CLIENT_DISABLED', 'CLIENT_BLOCKED',
  'USER_NOT_FOUND', 'USER_TOKEN_REQUIRED', 'INSUFFICIENT_SCOPE', 'RATE_LIMITED',
  'TOO_MANY_REQUESTS',
]);

export class SolvedProfileError extends Error {
  constructor(code, status, retryAfterSeconds) {
    super(code);
    this.name = 'SolvedProfileError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// One read-only request for the account owner. Never persist the response or
// expose credentials, response headers, or unselected personal profile fields.
export async function fetchSolvedProfile({ env = process.env, request = fetch, now = () => new Date() } = {}) {
  const clientId = env.SOLVED_AC_CLIENT_ID?.trim();
  const clientSecret = env.SOLVED_AC_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new SolvedProfileError('LOCAL_CREDENTIALS_REQUIRED');
  if (/[\r\n]/.test(clientId + clientSecret)) throw new SolvedProfileError('INVALID_LOCAL_CREDENTIALS');

  let response;
  try {
    response = await request(solvedProfileUrl, {
      method: 'GET',
      headers: { Accept: 'application/json', 'x-client-id': clientId, 'x-client-secret': clientSecret },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new SolvedProfileError('NETWORK_OR_REDIRECT_ERROR');
  }

  const jsonResponse = /\bapplication\/(?:[a-z0-9.+-]*\+)?json\b/i.test(response.headers.get('content-type') ?? '');
  if (!response.ok) {
    let code = response.status === 403 && !jsonResponse ? 'HTTP_CHALLENGE_OR_BLOCK' : 'API_REQUEST_FAILED';
    if (jsonResponse) {
      const errorBody = await response.json().catch(() => null);
      if (knownApiErrors.has(errorBody?.error?.code)) code = errorBody.error.code;
    } else {
      await response.body?.cancel();
    }
    const retry = response.headers.get('retry-after');
    const retryAfterSeconds = retry && /^\d+$/.test(retry) ? Number(retry) : undefined;
    // No retry loop and no alternate clients/origins: 429 and blocks are reported.
    throw new SolvedProfileError(code, response.status, retryAfterSeconds);
  }
  if (!jsonResponse) {
    await response.body?.cancel();
    throw new SolvedProfileError('EXPECTED_JSON_RESPONSE', response.status);
  }
  const data = await response.json().catch(() => null);
  if (
    data?.handle !== 'octane' ||
    !(data.tier === null || (Number.isInteger(data.tier) && data.tier >= 0 && data.tier <= 31)) ||
    !Number.isSafeInteger(data.rating) || data.rating < 0 ||
    !Number.isSafeInteger(data.solvedCount) || data.solvedCount < 0
  ) throw new SolvedProfileError('INVALID_PROFILE_RESPONSE', response.status);

  return {
    handle: data.handle,
    tier: data.tier,
    rating: data.rating,
    solvedCount: data.solvedCount,
    checkedAt: now().toISOString(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await fetchSolvedProfile(), null, 2));
  } catch (error) {
    const safe = error instanceof SolvedProfileError ? error : new SolvedProfileError('UNEXPECTED_PROFILE_ERROR');
    console.error(JSON.stringify({ error: safe.code, status: safe.status, retryAfterSeconds: safe.retryAfterSeconds }));
    process.exitCode = 1;
  }
}
