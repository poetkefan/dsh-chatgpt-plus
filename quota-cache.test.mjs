import test from 'node:test'
import assert from 'node:assert/strict'
import { createQuotaReader } from './quota-cache.js'

const result = { status: 'ok', source: 'chatgpt-wham-usage', primary: { remainingPercent: 42 }, secondary: null, credits: null, reason: null, httpStatus: 200 }

test('cache never queries when signed out or expired', async () => {
  let grant, calls = 0
  const cache = createQuotaReader(async () => grant, { query: async () => { calls++; return result }, now: () => 1000 })
  assert.equal((await cache.read()).reason, 'not_signed_in')
  grant = { access: 'secret', expires: 999 }
  assert.equal((await cache.read()).reason, 'token_expired')
  assert.equal(calls, 0)
})

test('coalesces panels and enforces manual refresh floor', async () => {
  let time = 1000, calls = 0
  const cache = createQuotaReader(async () => ({ access: 'secret', accountId: 'acct' }), { now: () => time, query: async () => { calls++; return result } })
  const [a, b] = await Promise.all([cache.read(), cache.read()])
  assert.deepEqual(a, b)
  assert.equal(calls, 1)
  time += 10_000
  await cache.read({ force: true })
  assert.equal(calls, 1)
  time += 5000
  await cache.read({ force: true })
  assert.equal(calls, 2)
  time += 59_000
  await cache.read()
  assert.equal(calls, 2)
  time += 1000
  await cache.read()
  assert.equal(calls, 3)
  assert.ok(!JSON.stringify(a).includes('secret'))
})

test('late result cannot populate another account cache', async () => {
  let grant = { access: 'old' }, release
  const cache = createQuotaReader(async () => grant, { query: () => new Promise(resolve => { release = resolve }) })
  const pending = cache.read()
  await new Promise(resolve => setImmediate(resolve))
  grant = { access: 'new' }
  release(result)
  assert.equal((await pending).reason, 'account_changed')
})

test('logout invalidates in-flight response even if credentials return later', async () => {
  const grant = { access: 'old' }
  let release
  const cache = createQuotaReader(async () => grant, { query: () => new Promise(resolve => { release = resolve }) })
  const pending = cache.read()
  await new Promise(resolve => setImmediate(resolve))
  cache.invalidate()
  release(result)
  assert.equal((await pending).reason, 'account_changed')
})
