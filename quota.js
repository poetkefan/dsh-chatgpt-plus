/**
 * Read-only Codex quota adapter. No credential persistence, refresh, model calls,
 * mode switching, proxy changes, or logging. Missing data is never zero quota.
 *
 * Evidence (OpenAI's CLI source, verified 2026-10-21; not a public stable API):
 * https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client/rate_limit_resets.rs
 *   GET {backend-api}/wham/usage, without reserve opt-in for passive readers.
 * https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client.rs
 *   Bearer auth + optional ChatGPT-Account-Id; rate_limit primary/secondary;
 *   used_percent, limit_window_seconds, reset_at (Unix seconds); credits.
 */
export const QUOTA_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage'
export const QUOTA_SOURCE = 'chatgpt-wham-usage'

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const boolean = (value) => typeof value === 'boolean' ? value : null
const percent = (value) => finite(value) && value >= 0 && value <= 100 ? value : null
const seconds = (value) => finite(value) && value >= 0 && Number.isSafeInteger(value) ? value : null

function iso(milliseconds) {
	if (!finite(milliseconds) || milliseconds < 0 || milliseconds > 8.64e15) return null
	return new Date(milliseconds).toISOString()
}

function windowOf(value, now) {
	if (!object(value)) return null
	const usedPercent = percent(value.used_percent)
	const resetAt = seconds(value.reset_at)
	const resetAfter = seconds(value.reset_after_seconds)
	const resetsAt = resetAt !== null ? iso(resetAt * 1000)
		: resetAfter !== null ? iso(now + resetAfter * 1000) : null
	return {
		status: usedPercent === null ? 'unknown' : 'ok',
		usedPercent,
		remainingPercent: usedPercent === null ? null : Math.round((100 - usedPercent) * 1e9) / 1e9,
		windowSeconds: seconds(value.limit_window_seconds),
		resetsAt,
	}
}

function creditsOf(value) {
	if (!object(value)) return null
	// Never forward arbitrary backend strings: they may contain credentials or HTML.
	const balance = finite(value.balance) && value.balance >= 0 ? String(value.balance)
		: typeof value.balance === 'string' && /^\d{1,30}(?:\.\d{1,12})?$/.test(value.balance) ? value.balance : null
	return { hasCredits: boolean(value.has_credits), unlimited: boolean(value.unlimited), balance }
}

function empty(status, reason, httpStatus = null) {
	return { status, source: QUOTA_SOURCE, primary: null, secondary: null, credits: null, reason, httpStatus }
}

/**
 * Pure allowlist normalization of a WHAM usage response. Does not mutate input.
 * @param {unknown} payload JSON response (not headers or a credential record).
 * @param {{now?: number}} options `now` is epoch milliseconds, for relative resets.
 * @returns {{status: string, source: string, primary: object|null, secondary: object|null, credits: object|null, reason: string|null, httpStatus: number|null}}
 * Window percentages are numbers or null; resetsAt is ISO UTC or null.
 * Credits are independent of included usage and do not mean unlimited windows.
 */
export function normalizeQuota(payload, { now = Date.now() } = {}) {
	if (!object(payload)) return empty('unknown', 'unrecognized-response')
	const limits = object(payload.rate_limit) ? payload.rate_limit : {}
	const primary = windowOf(limits.primary_window, now)
	const secondary = windowOf(limits.secondary_window, now)
	const credits = creditsOf(payload.credits)
	const known = primary?.usedPercent != null || secondary?.usedPercent != null
		|| (credits !== null && Object.values(credits).some((value) => value !== null))
	return {
		status: known ? 'ok' : 'unknown', source: QUOTA_SOURCE,
		primary, secondary, credits,
		reason: known ? null : 'missing-usage', httpStatus: null,
	}
}

/**
 * One authenticated GET to the fixed official origin. The caller owns transport
 * policy; inject its fetch to retain its existing dispatcher/proxy configuration.
 * Input accessToken maps to existing grant.payload.access; accountId is optional.
 * Pass signal to cancel. A 15s deadline also bounds the request and body read.
 * Never returns a token, account id, raw response, exception, or response header.
 * unknown = no credential/unsupported endpoint/unrecognized fields;
 * failed = authentication, permission, HTTP, parsing, network, timeout or abort.
 * There is no retry, token refresh, redirect, alternative endpoint or model probe.
 * @param {{accessToken?: string, accountId?: string, fetch?: typeof globalThis.fetch, signal?: AbortSignal}} options
 */
export async function queryQuota({ accessToken, accountId, fetch: fetchImpl = globalThis.fetch, signal } = {}) {
	if (typeof accessToken !== 'string' || accessToken.trim() === '') return empty('unknown', 'not-signed-in')
	if (/[\r\n]/.test(accessToken) || (accountId != null && (typeof accountId !== 'string' || /[\r\n]/.test(accountId)))) {
		return empty('failed', 'invalid-credentials')
	}
	if (typeof fetchImpl !== 'function') return empty('failed', 'fetch-unavailable')
	if (signal?.aborted) return empty('failed', 'aborted')
	const timeout = AbortSignal.timeout(15_000)
	const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
	try {
		const headers = { authorization: `Bearer ${accessToken}`, accept: 'application/json' }
		if (accountId) headers['ChatGPT-Account-Id'] = accountId
		const response = await fetchImpl(QUOTA_ENDPOINT, {
			method: 'GET', headers, signal: combinedSignal, redirect: 'error', cache: 'no-store',
		})
		if (combinedSignal.aborted) return empty('failed', signal?.aborted ? 'aborted' : 'timeout')
		const status = response.status
		if (!response.ok) {
			// Do not read or echo error bodies (which may reflect request secrets).
			if (status === 404 || status === 405 || status === 501) return empty('unknown', 'endpoint-unavailable', status)
			const reason = status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 429 ? 'rate-limited' : 'http-error'
			return empty('failed', reason, Number.isInteger(status) && status >= 100 && status <= 599 ? status : null)
		}
		let payload
		try { payload = await response.json() } catch {
			if (combinedSignal.aborted) return empty('failed', signal?.aborted ? 'aborted' : 'timeout')
			return empty('failed', 'invalid-json')
		}
		if (combinedSignal.aborted) return empty('failed', signal?.aborted ? 'aborted' : 'timeout')
		const result = normalizeQuota(payload)
		return { ...result, httpStatus: status }
	} catch {
		return empty('failed', signal?.aborted ? 'aborted' : timeout.aborted ? 'timeout' : 'network-error')
	}
}
