/**
 * Host half of the ChatGPT Plus plugin.
 *
 * It owns no model protocol of its own: the shipped `llm-pi-ai` adapter already
 * serves the `openai-codex` route (ChatGPT OAuth + the ChatGPT backend
 * Responses API) and already registers the matching authorization flow. What
 * the shipped GUI lacks is a surface that can start that flow, show its
 * notices, and answer its prompts. This plugin brokers exactly that over a few
 * same-origin HTTP routes, and can add the `openai-codex` provider profile to
 * the `llm-pi-ai` settings namespace so the models become selectable.
 *
 * @module dsh-chatgpt-plus
 */

import { execFile } from 'node:child_process'
import { createQuotaReader } from './quota-cache.js'

/** Plugin name; also the Client module id and this bundle's configuration key. */
export const name = 'dsh-chatgpt-plus'

/** Services this plugin cannot run without. */
export const inject = ['webServer', 'credentials', 'authorization', 'connection', 'tools']

/** Credential record the `llm-pi-ai` adapter reads for the ChatGPT grant. */
const RECORD_KEY = 'llm-pi-ai/openai-codex'

/** Model route the `llm-pi-ai` adapter registers for ChatGPT. */
const ROUTE_ID = 'openai-codex'

/** Settings namespace (`llm-pi-ai`'s profile entry id) and the path of that route. */
const SETTINGS_NS = 'llm-pi-ai'
const PROVIDER_PATH = ['providers', ROUTE_ID]

/** Environment names the launcher's proxy policy reads, most specific first. */
const PROXY_ENV_NAMES = ['https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY', 'all_proxy', 'ALL_PROXY']

/** Hosts that must never travel through an outbound proxy we install. */
const ALWAYS_DIRECT = ['localhost', '127.0.0.1', '::1', 'api.deepseek.com']

/** Longest request body accepted from the settings page. */
const MAX_BODY_BYTES = 64 * 1024

/** Options the auth flow offers first; one of these is sent as its answer. */
const LOGIN_METHODS = new Set(['browser', 'device_code'])

/**
 * Decode one JWT payload without verifying it.
 *
 * The token is already the user's own stored grant, and only display claims
 * (email, ChatGPT plan type) are read: nothing here decides trust.
 * @param token - a compact-serialization JWT, or anything else.
 * @returns its JSON payload, or `undefined` when it is not a JWT.
 */
function decodeJwtPayload(token) {
	if (typeof token !== 'string') return undefined
	const parts = token.split('.')
	if (parts.length !== 3) return undefined
	try {
		const json = Buffer.from(parts[1], 'base64url').toString('utf8')
		const parsed = JSON.parse(json)
		return typeof parsed === 'object' && parsed !== null ? parsed : undefined
	} catch {
		return undefined
	}
}

/** One human-readable message for a thrown value. */
function messageOf(error) {
	if (error instanceof Error) return error.message
	return String(error)
}

/** The outbound proxy already configured for this process, if any. */
function environmentProxy() {
	for (const name of PROXY_ENV_NAMES) {
		const value = process.env[name]
		if (typeof value === 'string' && value.trim() !== '') return value.trim()
	}
	return undefined
}

/**
 * Read the Windows per-user HTTP proxy — the one the browser and other desktop
 * apps already use. Node's fetch reads no operating-system proxy, so this is
 * the value an otherwise working ChatGPT in the browser would silently lack.
 * @returns a proxy URL, or `undefined` when none is enabled or it cannot be read.
 */
function detectSystemProxy() {
	return new Promise((resolve) => {
		if (process.platform !== 'win32') return resolve(undefined)
		const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
		execFile('reg', ['query', key, '/v', 'ProxyEnable'], { windowsHide: true }, (enableError, enableOut) => {
			if (enableError) return resolve(undefined)
			if (!/ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(enableOut)) return resolve(undefined)
			execFile('reg', ['query', key, '/v', 'ProxyServer'], { windowsHide: true }, (error, stdout) => {
				if (error) return resolve(undefined)
				const match = /ProxyServer\s+REG_SZ\s+(.+)/i.exec(stdout)
				if (match === null) return resolve(undefined)
				const parts = new Map()
				for (const part of match[1].trim().split(';')) {
					if (part === '') continue
					const at = part.indexOf('=')
					if (at === -1) parts.set('http', part.trim())
					else parts.set(part.slice(0, at).toLowerCase(), part.slice(at + 1).trim())
				}
				const chosen = parts.get('https') ?? parts.get('http') ?? [...parts.values()][0]
				if (typeof chosen !== 'string' || chosen === '') return resolve(undefined)
				resolve(chosen.includes('://') ? chosen : 'http://' + chosen)
			})
		})
	})
}

/**
 * Ask the ChatGPT backend whether this process can reach it.
 *
 * An unauthenticated request answers 401 when the network is fine, so only a
 * region refusal or a transport failure counts as blocked. Nothing secret is
 * sent: the probe carries no credential.
 * @returns `{ blocked, status?, reason?, message? }`.
 */
async function probeNetwork() {
	try {
		const response = await fetch('https://chatgpt.com/backend-api/me', {
			headers: { 'user-agent': 'dsh-chatgpt-plus/1.0' },
			signal: AbortSignal.timeout(10_000),
		})
		if (response.status === 403) {
			const body = await response.text().catch(() => '')
			if (body.includes('unsupported_country_region_territory')) return { blocked: true, status: 403, reason: 'region' }
		}
		return { blocked: !response.ok && response.status !== 401, status: response.status, ...(response.ok || response.status === 401 ? {} : { reason: 'http_error' }) }
	} catch (error) {
		return { blocked: true, reason: 'unreachable', message: messageOf(error) }
	}
}

/**
 * Register the ChatGPT account bridge.
 * @param ctx - the plugin context carrying the web server and both credential seams.
 */
export function apply(ctx) {
	let disposed = false
	const quota = createQuotaReader(async () => {
		const record = await ctx.credentials.readRecord(RECORD_KEY)
		return record?.kind === 'grant' && record.payload !== null && typeof record.payload === 'object' ? record.payload : undefined
	})
	// Read-only quota capability; no session behavior or tool permissions are changed.
	ctx.tools.register({
		name: 'chatgpt_status',
		description: 'Read account-wide remaining Codex subscription quota, reset times and source. Does not change session behavior, sign in, or send a model request. Not the ChatGPT desktop chat allowance.',
		parameters: { type: 'object', properties: {}, additionalProperties: false },
		output: { schema: { type: 'object' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
		execute: async () => ({ quota: await quota.read() }),
	})
	/**
	 * The one live (or last finished) sign-in attempt.
	 *
	 * The harness runs one authorization attempt per credential, so a single
	 * slot is the whole state: `done` marks an attempt whose promise settled,
	 * and a new attempt simply replaces it.
	 */
	let attempt

	/** Answer every `select` prompt with the method the page already asked for. */
	function autoSelect(prompt, mode) {
		if (prompt.kind !== 'select' || !Array.isArray(prompt.options)) return undefined
		if (!prompt.options.some((option) => option.id === mode)) return undefined
		return mode
	}

	/**
	 * Run one authorization attempt, relaying its notices and prompts into the
	 * page-polled snapshot.
	 * @param mode - `browser` or `device_code`, the answer to the flow's first question.
	 */
	function startSignIn(mode) {
		if (attempt !== undefined && attempt.done === false) {
			throw new Error('A ChatGPT sign-in is already running in this page.')
		}
		const state = {
			mode,
			done: false,
			phase: 'starting',
			notices: [],
			url: undefined,
			code: undefined,
			prompt: undefined,
			outcome: undefined,
			error: undefined,
			controller: new AbortController(),
		}
		attempt = state
		const interaction = {
			notify(notice) {
				const entry = {
					message: typeof notice.message === 'string' ? notice.message : undefined,
					url: typeof notice.url === 'string' ? notice.url : undefined,
					code: typeof notice.code === 'string' ? notice.code : undefined,
				}
				state.notices.push(entry)
				if (entry.url !== undefined) state.url = entry.url
				if (entry.code !== undefined) state.code = entry.code
				state.phase = entry.code === undefined ? 'waiting' : 'device-code'
			},
			prompt(prompt) {
				const selected = autoSelect(prompt, mode)
				if (selected !== undefined) return Promise.resolve(selected)
				return new Promise((resolve) => {
					const pending = {
						kind: prompt.kind,
						message: prompt.message,
						placeholder: prompt.placeholder,
						resolve,
					}
					state.prompt = pending
					state.phase = 'prompt'
					prompt.signal?.addEventListener('abort', () => {
						if (state.prompt === pending) state.prompt = undefined
					}, { once: true })
				})
			},
		}
		state.settled = ctx.authorization.begin({
			key: RECORD_KEY,
			method: 'oauth',
			signal: state.controller.signal,
			interaction,
		}).then(async (outcome) => {
			state.outcome = outcome.status
			state.phase = outcome.status
			state.prompt = undefined
			if (outcome.status === 'authorized') {
				quota.invalidate()
				/* Signing in is the user's goal; adding the route is a convenience
				 * that must not turn a successful grant into a failed attempt. */
				try {
					await ensureProvider()
				} catch (error) {
					state.enableError = messageOf(error)
				}
			}
		}).catch((error) => {
			state.phase = 'failed'
			state.error = messageOf(error)
		}).finally(() => {
			state.done = true
		})
		return state
	}

	/** Whether the adapter currently serves the ChatGPT route. */
	function providerConfigured() {
		const llm = ctx.get('llm')
		if (llm === undefined) return false
		try {
			return llm.listProviders().some((provider) => provider.id === ROUTE_ID)
		} catch {
			return false
		}
	}

	/**
	 * The outbound proxy this plugin installed for the whole process, if any.
	 *
	 * `dsh-http-proxy` builds one dispatcher per process from the launch
	 * environment and offers no runtime switch, so a user whose browser reaches
	 * ChatGPT but whose harness cannot is left with a region refusal. The
	 * package's own installer rebuilds that dispatcher from any environment
	 * object, which is what lets this plugin repair the route without asking for
	 * an application restart.
	 */
	let proxy = {
		url: environmentProxy(),
		source: environmentProxy() === undefined ? undefined : 'environment',
		detected: undefined,
		error: undefined,
	}

	/** Restores the dispatcher that preceded this plugin's proxy install. */
	let proxyDisposer
	let proxyOperation = Promise.resolve()
	function changeProxy(operation) {
		const next = proxyOperation.then(() => {
			if (disposed) throw new Error('Plugin is unloading.')
			return operation()
		})
		proxyOperation = next.catch(() => {})
		return next
	}

	/**
	 * Reinstall the process-wide proxy policy from one set of variables.
	 *
	 * The bundled policy package reads a launch-environment object (`get(name)`
	 * returning `{ value }`), not `process.env`; installation also rewrites the
	 * process environment itself, so this plugin never edits it by hand.
	 * @param values - proxy variables keyed exactly as the policy reads them.
	 */
	async function applyProxyPolicy(values) {
		const module = await import('@deepseek-ai/dsh-http-proxy')
		if (disposed) throw new Error('Plugin is unloading.')
		if (typeof module.installProxyFromEnvironment !== 'function') {
			throw new Error('The bundled HTTP proxy policy is not available in this Harness build.')
		}
		if (proxyDisposer !== undefined) {
			const previous = proxyDisposer
			proxyDisposer = undefined
			try {
				await previous()
			} catch {
				/* A failed restore must not block the new policy. */
			}
		}
		const env = {
			get(name) {
				const value = values[name]
				return typeof value === 'string' ? { value } : undefined
			},
		}
		const dispose = await module.installProxyFromEnvironment(env, (message) => {
			ctx.logger.warn('[chatgpt-plus] proxy: %s', String(message))
		})
		if (disposed) {
			if (typeof dispose === 'function') await dispose()
			throw new Error('Plugin is unloading.')
		}
		proxyDisposer = typeof dispose === 'function' ? dispose : undefined
	}

	/**
	 * Route outbound fetch through one proxy, keeping the harness's own loopback
	 * traffic and the primary DeepSeek endpoint direct.
	 * @param url - an `http://` or `https://` proxy URL.
	 * @param source - where the URL came from, for display only.
	 */
	async function installProxy(url, source) {
		const parsed = new URL(url)
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error('Only an http:// or https:// proxy can be used here.')
		}
		const bypass = new Set(String(process.env.NO_PROXY ?? process.env.no_proxy ?? '')
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry !== ''))
		for (const host of ALWAYS_DIRECT) bypass.add(host)
		await applyProxyPolicy({
			https_proxy: url,
			http_proxy: url,
			no_proxy: [...bypass].join(','),
		})
		proxy = { url, source, detected: proxy.detected, error: undefined }
	}

	/** Drop the installed proxy and restore the dispatcher that preceded it. */
	async function clearProxy() {
		if (proxyDisposer !== undefined) {
			const previous = proxyDisposer
			proxyDisposer = undefined
			await previous()
		}
		const inherited = environmentProxy()
		proxy = { url: inherited, source: inherited === undefined ? undefined : 'environment', detected: proxy.detected, error: undefined }
	}

	/**
	 * Add the `openai-codex` profile to `llm-pi-ai` so the catalog models become
	 * selectable. The empty profile keeps every catalog default and reads its
	 * credential from the record the sign-in flow writes.
	 */
	async function ensureProvider() {
		if (providerConfigured()) return
		const settings = ctx.get('settings')
		if (settings === undefined) throw new Error('The settings service is not available in this profile.')
		await settings.mutate(SETTINGS_NS, [{ op: 'set', path: PROVIDER_PATH, value: {} }])
	}

	/** Everything the settings card shows, derived per request from live state. */
	async function snapshot() {
		const [record] = await Promise.all([ctx.credentials.readRecord(RECORD_KEY)])
		const grant = record !== undefined && record.kind === 'grant' && typeof record.payload === 'object' && record.payload !== null
			? record.payload
			: undefined
		const claims = decodeJwtPayload(grant?.access)
		const auth = typeof claims?.['https://api.openai.com/auth'] === 'object' && claims['https://api.openai.com/auth'] !== null
			? claims['https://api.openai.com/auth']
			: {}
		const configured = providerConfigured()
		let models = []
		const llm = ctx.get('llm')
		if (configured && llm !== undefined) {
			try {
				models = (await llm.listModels(ROUTE_ID)).map((model) => ({ id: model.id, name: model.name }))
			} catch {
				models = []
			}
		}
		const live = attempt !== undefined && attempt.done === false
			? {
				phase: attempt.phase,
				mode: attempt.mode,
				url: attempt.url,
				code: attempt.code,
				error: attempt.error,
				prompt: attempt.prompt === undefined ? undefined : {
					kind: attempt.prompt.kind,
					message: attempt.prompt.message,
					placeholder: attempt.prompt.placeholder,
				},
				notices: attempt.notices.slice(-6).map((notice) => notice.message ?? notice.url ?? ''),
			}
			: undefined
		return {
			signedIn: typeof grant?.access === 'string' && grant.access !== '',
			email: typeof claims?.email === 'string' ? claims.email : undefined,
			plan: typeof auth.chatgpt_plan_type === 'string' ? auth.chatgpt_plan_type : undefined,
			accountId: typeof grant?.accountId === 'string' ? grant.accountId : undefined,
			expiresAt: typeof grant?.expires === 'number' ? grant.expires : undefined,
			providerConfigured: configured,
			models,
			signIn: live,
			proxy: { url: proxy.url, source: proxy.source, detected: proxy.detected, error: proxy.error },
			/* A finished attempt is reported once, so a failure to reach the
			 * auth endpoint is visible instead of silently returning to idle. */
			lastResult: attempt !== undefined && attempt.done === true
				? {
					phase: attempt.phase,
					error: attempt.error,
					enableError: attempt.enableError,
				}
				: undefined,
		}
	}

	/** Why a request may come from the page this server itself served. */
	function trusted(req) {
		// Apply the same browser credential and Host checks as Harness itself.
		if (ctx.connection.requestRejection(req) !== undefined) return false
		const origin = req.headers.origin
		if (origin !== undefined) {
			try {
				if (origin !== ctx.webServer.getOrigin()) return false
			} catch {
				return false
			}
		}
		if (req.method === 'POST' && req.headers['x-chatgpt-plus'] !== '1') return false
		return true
	}

	/** Read and parse one JSON request body, treating an empty body as `{}`. */
	function readBody(req) {
		return new Promise((resolve, reject) => {
			const chunks = []
			let size = 0
			req.on('data', (chunk) => {
				size += chunk.length
				if (size > MAX_BODY_BYTES) {
					reject(new Error('Request body is too large.'))
					req.destroy()
					return
				}
				chunks.push(chunk)
			})
			req.on('end', () => {
				if (chunks.length === 0) return resolve({})
				try {
					const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
					resolve(typeof parsed === 'object' && parsed !== null ? parsed : {})
				} catch {
					reject(new Error('Request body is not valid JSON.'))
				}
			})
			req.on('error', reject)
		})
	}

	/** Write one JSON reply; account data never crosses this boundary. */
	function reply(res, status, value) {
		const body = JSON.stringify(value)
		res.writeHead(status, {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			'content-length': Buffer.byteLength(body),
		})
		res.end(body)
	}

	/**
	 * Wrap one route: method check, origin check, body parse, and one error
	 * envelope the page can render. A handler failure never escapes the server.
	 */
	function route(method, handler) {
		return async (req, res) => {
			if (!trusted(req)) return reply(res, 403, { ok: false, error: 'This request did not come from the harness page.' })
			if (req.method !== method) return reply(res, 405, { ok: false, error: `Use ${method}.` })
			try {
				const body = method === 'POST' ? await readBody(req) : {}
				return reply(res, 200, { ok: true, ...(await handler(body, req)) })
			} catch (error) {
				return reply(res, 200, { ok: false, error: messageOf(error) })
			}
		}
	}

	ctx.effect(() => {
		const disposers = [
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/state',
				handler: route('GET', () => snapshot()),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/quota',
				handler: route('GET', async (_body, req) => ({ quota: await quota.read({ force: new URL(req.url, ctx.webServer.getOrigin()).searchParams.get('refresh') === '1' }) })),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/enable',
				handler: route('POST', async () => {
					await ensureProvider()
					return snapshot()
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/sign-in',
				handler: route('POST', (body) => {
					const mode = typeof body.mode === 'string' && LOGIN_METHODS.has(body.mode) ? body.mode : 'browser'
					startSignIn(mode)
					return snapshot()
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/answer',
				handler: route('POST', (body) => {
					if (attempt === undefined || attempt.done === true || attempt.prompt === undefined) {
						throw new Error('The sign-in is not waiting for an answer.')
					}
					const value = typeof body.value === 'string' ? body.value.trim() : ''
					if (value === '') throw new Error('Paste the authorization code or the full redirect URL first.')
					const pending = attempt.prompt
					attempt.prompt = undefined
					pending.resolve(value)
					return snapshot()
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/cancel',
				handler: route('POST', () => {
					ctx.authorization.cancel(RECORD_KEY)
					if (attempt !== undefined && attempt.done === false) attempt.controller.abort()
					return snapshot()
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/sign-out',
				handler: route('POST', async () => {
					if (attempt !== undefined && attempt.done === false) {
						ctx.authorization.cancel(RECORD_KEY)
						attempt.controller.abort()
						await attempt.settled
					}
					await ctx.credentials.deleteRecord(RECORD_KEY)
					quota.invalidate()
					return snapshot()
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/network',
				handler: route('GET', async () => {
					proxy.detected = await detectSystemProxy()
					return {
						proxy: { url: proxy.url, source: proxy.source, detected: proxy.detected, error: proxy.error },
						probe: await probeNetwork(),
					}
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/proxy',
				handler: route('POST', async (body) => {
					const url = typeof body.url === 'string' ? body.url.trim() : ''
					if (url === '') throw new Error('Enter an http:// or https:// proxy URL.')
					await changeProxy(() => installProxy(url, 'manual'))
					return {
						proxy: { url: proxy.url, source: proxy.source, detected: proxy.detected, error: proxy.error },
						probe: await probeNetwork(),
					}
				}),
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: '/chatgpt-plus/proxy/reset',
				handler: route('POST', async () => {
					await changeProxy(() => clearProxy())
					return {
						proxy: { url: proxy.url, source: proxy.source, detected: proxy.detected, error: proxy.error },
						probe: await probeNetwork(),
					}
				}),
			}),
		]
		return async () => {
			disposed = true
			for (const dispose of disposers) dispose()
			if (attempt !== undefined && attempt.done === false) {
				ctx.authorization.cancel(RECORD_KEY)
				attempt.controller.abort()
				await attempt.settled
			}
			quota.invalidate()
			await proxyOperation
			await clearProxy()
		}
	}, 'dsh-chatgpt-plus: HTTP routes')

	// Detection only. A process-wide proxy change now requires an explicit UI action.
	void detectSystemProxy().then((url) => { if (!disposed) proxy.detected = url }).catch(() => {})
}
