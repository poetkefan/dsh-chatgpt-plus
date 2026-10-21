import { createHash } from 'node:crypto'
import { queryQuota } from './quota.js'

const SOURCE = 'chatgpt-wham-usage'
const empty = (reason, now) => ({ status: 'unknown', source: SOURCE, primary: null, secondary: null, credits: null, reason, httpStatus: null, checkedAt: new Date(now).toISOString() })
const identity = (grant) => typeof grant?.access === 'string' && grant.access !== ''
  ? createHash('sha256').update(grant.access).update('\0').update(String(grant.accountId ?? '')).digest('hex') : null

/** One account-scoped single-flight cache. Never retains or returns raw credentials. */
export function createQuotaReader(readGrant, { query = queryQuota, now = Date.now } = {}) {
  let cache, pending, generation = 0
  const invalidate = () => { generation++; cache = undefined; pending?.controller.abort(); pending = undefined }
  return {
    invalidate,
    async read({ force = false } = {}) {
      const grant = await readGrant()
      const key = identity(grant)
      if (key === null) { invalidate(); return empty('not_signed_in', now()) }
      if (typeof grant.expires === 'number' && grant.expires <= now()) {
        invalidate()
        return empty('token_expired', now())
      }
      if ((cache && cache.key !== key) || (pending && pending.key !== key)) invalidate()
      // A manual click may bypass the normal 60s cache, but not the 15s floor.
      if (cache?.key === key && now() - cache.at < (force ? 15_000 : 60_000)) return cache.value
      if (pending?.key === key) return pending.promise
      const version = generation
      const request = { key, controller: new AbortController() }
      request.promise = (async () => {
        const result = await query({ accessToken: grant.access, accountId: grant.accountId, signal: request.controller.signal })
        if (version !== generation) return empty('account_changed', now())
        const current = await readGrant()
        if (version !== generation || identity(current) !== key) return empty('account_changed', now())
        const value = { ...result, checkedAt: new Date(now()).toISOString() }
        cache = { key, at: now(), value }
        return value
      })().finally(() => { if (pending === request) pending = undefined })
      pending = request
      return request.promise
    },
  }
}
