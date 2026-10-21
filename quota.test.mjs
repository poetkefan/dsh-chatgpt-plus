import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeQuota, queryQuota, QUOTA_ENDPOINT, QUOTA_SOURCE } from './quota.js'

const response = (payload, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => payload })
const secret = 'test-only-private-token'
const accountId = 'test-only-private-account'
const success = {
	rate_limit: {
		primary_window: { used_percent: 42, limit_window_seconds: 18000, reset_at: 1700000000 },
		secondary_window: { used_percent: 84, limit_window_seconds: 604800, reset_at: 1700604800 },
	},
	credits: { has_credits: true, unlimited: false, balance: '9.99' },
}

test('normalizes official primary/secondary windows and credits without mutation', () => {
	const before = JSON.stringify(success)
	const result = normalizeQuota(success)
	assert.equal(result.status, 'ok')
	assert.equal(result.source, QUOTA_SOURCE)
	assert.deepEqual(result.primary, { status: 'ok', usedPercent: 42, remainingPercent: 58, windowSeconds: 18000, resetsAt: '2023-11-14T22:13:20.000Z' })
	assert.equal(result.secondary.remainingPercent, 16)
	assert.deepEqual(result.credits, { hasCredits: true, unlimited: false, balance: '9.99' })
	assert.equal(JSON.stringify(success), before)
})

test('missing/null/array payloads are unknown, never fabricated zero', () => {
	for (const value of [undefined, null, [], '', 0, {}, { rate_limit: null }, { rate_limit: {} }, { credits: {} }]) {
		const result = normalizeQuota(value)
		assert.equal(result.status, 'unknown')
		assert.equal(result.primary, null)
		assert.equal(result.secondary, null)
	}
})

test('zero is real data; partial and exhausted windows remain distinguishable', () => {
	const zero = normalizeQuota({ rate_limit: { primary_window: { used_percent: 0 }, secondary_window: { used_percent: 100 } } })
	assert.equal(zero.primary.remainingPercent, 100)
	assert.equal(zero.secondary.remainingPercent, 0)
	assert.equal(zero.primary.resetsAt, null)
	assert.equal(zero.primary.windowSeconds, null)
	assert.equal(normalizeQuota({ rate_limit: { secondary_window: { used_percent: 50 } } }).primary, null)
})

test('invalid or out-of-range values remain unknown instead of coercing or clamping', () => {
	for (const value of [-1, 101, NaN, Infinity, '42', false, null]) {
		const result = normalizeQuota({ rate_limit: { primary_window: { used_percent: value, reset_at: -1, limit_window_seconds: '18000' } } })
		assert.equal(result.status, 'unknown')
		assert.equal(result.primary.usedPercent, null)
		assert.equal(result.primary.remainingPercent, null)
		assert.equal(result.primary.resetsAt, null)
		assert.equal(result.primary.windowSeconds, null)
	}
})

test('reset_after_seconds uses injected clock, absolute reset wins, huge dates are safe', () => {
	assert.equal(normalizeQuota({ rate_limit: { primary_window: { reset_after_seconds: 60 } } }, { now: 1700000000000 }).primary.resetsAt, '2023-11-14T22:14:20.000Z')
	assert.equal(normalizeQuota({ rate_limit: { primary_window: { reset_at: 0, reset_after_seconds: 60 } } }).primary.resetsAt, '1970-01-01T00:00:00.000Z')
	assert.equal(normalizeQuota({ rate_limit: { primary_window: { reset_at: Number.MAX_SAFE_INTEGER } } }).primary.resetsAt, null)
})

test('credit booleans stay independent from window availability', () => {
	const result = normalizeQuota({ credits: { has_credits: false, unlimited: false, balance: 0 } })
	assert.equal(result.status, 'ok')
	assert.equal(result.primary, null)
	assert.deepEqual(result.credits, { hasCredits: false, unlimited: false, balance: '0' })
	assert.deepEqual(normalizeQuota({ credits: { has_credits: 'true', unlimited: 1, balance: '<script>secret</script>' } }).credits,
		{ hasCredits: null, unlimited: null, balance: null })
})

test('query sends one read-only fixed-origin request with cancellation and no redirects', async () => {
	let calls = 0
	const controller = new AbortController()
	const result = await queryQuota({ accessToken: secret, accountId, signal: controller.signal, fetch: async (url, init) => {
		calls++
		assert.equal(url, QUOTA_ENDPOINT)
		assert.equal(init.method, 'GET')
		assert.equal(init.redirect, 'error')
		assert.equal(init.cache, 'no-store')
		assert.equal(init.headers.authorization, `Bearer ${secret}`)
		assert.equal(init.headers['ChatGPT-Account-Id'], accountId)
		assert.equal(init.body, undefined)
		assert.equal(init.signal.aborted, false)
		return response(success)
	} })
	assert.equal(calls, 1)
	assert.equal(result.status, 'ok')
	assert.equal(JSON.stringify(result).includes(secret), false)
	assert.equal(JSON.stringify(result).includes(accountId), false)
})

test('absent credentials and pre-aborted requests never call fetch', async () => {
	const fetch = async () => { assert.fail('must not fetch') }
	assert.equal((await queryQuota({ fetch })).reason, 'not-signed-in')
	assert.equal((await queryQuota({ accessToken: ' ', fetch })).reason, 'not-signed-in')
	assert.equal((await queryQuota({ accessToken: 'bad\r\nheader', fetch })).reason, 'invalid-credentials')
	assert.equal((await queryQuota({ accessToken: secret, accountId: 'bad\nheader', fetch })).reason, 'invalid-credentials')
	assert.equal((await queryQuota({ accessToken: secret, signal: AbortSignal.abort(), fetch })).reason, 'aborted')
})

for (const [status, state, reason] of [[401, 'failed', 'unauthorized'], [403, 'failed', 'forbidden'], [404, 'unknown', 'endpoint-unavailable'], [405, 'unknown', 'endpoint-unavailable'], [501, 'unknown', 'endpoint-unavailable'], [429, 'failed', 'rate-limited'], [500, 'failed', 'http-error']]) {
	test(`HTTP ${status} is safe and does not read error bodies`, async () => {
		const result = await queryQuota({ accessToken: secret, fetch: async () => ({ status, ok: false, json() { assert.fail('must not read') }, text() { assert.fail('must not read') }, statusText: secret }) })
		assert.equal(result.status, state)
		assert.equal(result.reason, reason)
		assert.equal(result.httpStatus, status)
		assert.equal(JSON.stringify(result).includes(secret), false)
	})
}

test('network and parse errors never expose reflected token text', async () => {
	const network = await queryQuota({ accessToken: secret, fetch: async () => { throw new Error(secret) } })
	const malformed = await queryQuota({ accessToken: secret, fetch: async () => ({ status: 200, ok: true, json: async () => { throw new Error(secret) } }) })
	assert.equal(network.reason, 'network-error')
	assert.equal(malformed.reason, 'invalid-json')
	assert.equal(JSON.stringify([network, malformed]).includes(secret), false)
})

test('backend strings and extra identity fields cannot cross safe allowlist', async () => {
	const result = await queryQuota({ accessToken: secret, accountId, fetch: async () => response({
		...success, access_token: secret, account_id: accountId, plan_type: secret,
		credits: { has_credits: true, balance: secret, access_token: secret },
		rate_limit: { primary_window: { used_percent: secret, reset_at: secret, limit_window_seconds: secret, token: secret } },
	}) })
	assert.equal(JSON.stringify(result).includes(secret), false)
	assert.equal(JSON.stringify(result).includes(accountId), false)
	assert.equal(result.credits.balance, null)
	assert.equal(result.primary.usedPercent, null)
})

test('a custom fetch cannot turn cancellation into a fresh successful snapshot', async () => {
	for (const phase of ['response', 'body']) {
		const controller = new AbortController()
		const result = await queryQuota({ accessToken: secret, signal: controller.signal, fetch: async () => {
			if (phase === 'response') controller.abort()
			return { status: 200, ok: true, json: async () => { controller.abort(); return success } }
		} })
		assert.equal(result.status, 'failed')
		assert.equal(result.reason, 'aborted')
	}
})

test('abort during transport or body parsing reports safe aborted state', async () => {
	for (const body of [false, true]) {
		const controller = new AbortController()
		const result = await queryQuota({ accessToken: secret, signal: controller.signal, fetch: async () => {
			if (body) return { ok: true, status: 200, json: async () => { controller.abort(); throw new Error(secret) } }
			controller.abort()
			throw new Error(secret)
		} })
		assert.equal(result.reason, 'aborted')
		assert.equal(JSON.stringify(result).includes(secret), false)
	}
})
