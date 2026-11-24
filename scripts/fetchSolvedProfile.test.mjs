import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSolvedProfile, solvedProfileUrl } from './fetchSolvedProfile.mjs';

const env = { SOLVED_AC_CLIENT_ID: 'test-client', SOLVED_AC_CLIENT_SECRET: 'test-secret-not-real' };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', ...headers },
});
const fixture = { handle: 'octane', tier: 26, rating: 2745, solvedCount: 1338 };

test('requires local app credentials before making any request', async () => {
  let called = false;
  await assert.rejects(fetchSolvedProfile({ env: {}, request: () => { called = true; } }), { code: 'LOCAL_CREDENTIALS_REQUIRED' });
  assert.equal(called, false);
});

test('only reads the owner profile with app headers and rejects redirects', async () => {
  let calls = 0;
  const result = await fetchSolvedProfile({ env, now: () => new Date('2026-11-24T00:00:00Z'), request: async (url, options) => {
    calls++;
    assert.equal(url, solvedProfileUrl);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['x-client-id'], env.SOLVED_AC_CLIENT_ID);
    assert.equal(options.headers['x-client-secret'], env.SOLVED_AC_CLIENT_SECRET);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.body, undefined);
    return json({ ...fixture, metadata: { name: 'unused', birthday: { year: 2000 } }, bio: 'unused' });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ...fixture, checkedAt: '2026-11-24T00:00:00.000Z' });
});

test('rejects another account or malformed statistics', async () => {
  for (const data of [{ ...fixture, handle: 'someone-else' }, { ...fixture, tier: 40 }, { ...fixture, rating: -1 }, { ...fixture, solvedCount: 1.5 }]) {
    await assert.rejects(fetchSolvedProfile({ env, request: async () => json(data) }), { code: 'INVALID_PROFILE_RESPONSE' });
  }
});

test('handles an explicit unavailable tier without inventing one', async () => {
  const result = await fetchSolvedProfile({ env, request: async () => json({ ...fixture, tier: null }) });
  assert.equal(result.tier, null);
});

test('reports recognized authentication errors without exposing the response', async () => {
  await assert.rejects(fetchSolvedProfile({ env, request: async () => json({ error: { code: 'INVALID_CLIENT_CREDENTIALS', message: env.SOLVED_AC_CLIENT_SECRET } }, 401) }), error => {
    assert.equal(error.code, 'INVALID_CLIENT_CREDENTIALS');
    assert.equal(error.status, 401);
    assert.ok(!String(error).includes(env.SOLVED_AC_CLIENT_SECRET));
    return true;
  });
});

test('does not echo arbitrary error bodies or codes', async () => {
  await assert.rejects(fetchSolvedProfile({ env, request: async () => json({ error: { code: env.SOLVED_AC_CLIENT_SECRET, message: env.SOLVED_AC_CLIENT_SECRET } }, 400) }), error => {
    assert.equal(error.code, 'API_REQUEST_FAILED');
    assert.ok(!JSON.stringify(error).includes(env.SOLVED_AC_CLIENT_SECRET));
    return true;
  });
});

test('reports HTML challenges without persisting or printing their contents', async () => {
  await assert.rejects(fetchSolvedProfile({ env, request: async () => new Response('<html>private response</html>', { status: 403, headers: { 'content-type': 'text/html' } }) }), { code: 'HTTP_CHALLENGE_OR_BLOCK', status: 403 });
});

test('respects rate limits with no automatic retries or alternate origins', async () => {
  let calls = 0;
  await assert.rejects(fetchSolvedProfile({ env, request: async () => { calls++; return json({ error: { code: 'RATE_LIMITED' } }, 429, { 'retry-after': '20' }); } }), { code: 'RATE_LIMITED', status: 429, retryAfterSeconds: 20 });
  assert.equal(calls, 1);
});

test('sanitizes unexpected transport errors', async () => {
  await assert.rejects(fetchSolvedProfile({ env, request: async () => { throw new Error(env.SOLVED_AC_CLIENT_SECRET); } }), error => {
    assert.equal(error.code, 'NETWORK_OR_REDIRECT_ERROR');
    assert.ok(!String(error).includes(env.SOLVED_AC_CLIENT_SECRET));
    return true;
  });
});
