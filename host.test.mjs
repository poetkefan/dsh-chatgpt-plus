import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { apply } from './index.js'

function harness() {
  const routes = new Map(), tools = new Map(), commands = new Map(), effects = [], events = []
  let definition, record, deleted = 0, executions = 0
  const once = fn => { let live = true; return () => { if (live) { live = false; return fn?.() } } }
  const state = session => session.events.reduce((s, event) => definition.apply(s, event), definition.init())
  const agent = { id: 'test-session', status: 'idle', session: { events }, ctx: {
    effect(fn) { return once(fn()) },
    tools: { guard: () => once(), restrict: () => once() },
    systemPrompt: { section: () => once() },
  } }
  const ctx = {
    effect(fn) { const off = once(fn()); effects.push(off); return off },
    on: () => once(), get: () => undefined,
    logger: { warn() {} },
    webServer: { getOrigin: () => 'http://localhost:9999', register(def) { routes.set(def.path, def.handler); return once(() => routes.delete(def.path)) } },
    connection: { requestRejection(req) { return req.headers.authorization === 'owner' ? undefined : { status: 403 } } },
    credentials: { async readRecord() { return record }, async deleteRecord() { deleted++; record = undefined } },
    authorization: { cancel() {}, begin() { throw new Error('Not used') } },
    tools: {
      register(def) {
        assert.ok(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(def.output.schema.type), 'output uses valid JSON Schema type')
        tools.set(def.name, def); return once(() => tools.delete(def.name))
      },
      schemas: () => [...tools.values()],
    },
    agents: { list: () => [agent], get: id => id === agent.id ? agent : undefined },
    commands: {
      register(def) { commands.set(def.name, def); return once(() => commands.delete(def.name)) },
      async execute(a, line, attachments, signal) {
        executions++
        assert.equal(a, agent); assert.deepEqual(attachments, [])
        const [name, ...input] = line.slice(1).split(' '), def = commands.get(name), commandId = String(executions)
        events.push({ type: 'command/run', data: { commandId, name, args: input.join(' '), source: { kind: 'user' } } })
        const result = await def.handler({ agent: a, rawInput: input.join(' '), signal })
        events.push({ type: 'command/done', data: { commandId, ...result } })
        return { commandId, result }
      },
    },
    sessionProjections: { register(def) { definition = def; return once() }, onChanged: () => once(), stateOf: state },
  }
  async function request(path, { method = 'GET', body, owner = true, origin = 'http://localhost:9999', marker = '1' } = {}) {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
    req.method = method; req.url = path
    req.headers = { ...(owner ? { authorization: 'owner' } : {}), origin, 'x-chatgpt-plus': marker }
    let status, headers, payload
    await routes.get(path)(req, { writeHead(s, h) { status = s; headers = h }, end(value) { payload = JSON.parse(value) } })
    return { status, headers, payload }
  }
  return { ctx, tools, agent, request, hasModeRoute: () => routes.has('/chatgpt-plus/mode'), setRecord(value) { record = value }, get deleted() { return deleted }, get executions() { return executions }, async dispose() { for (const off of effects.reverse()) await off() } }
}

test('HTTP authentication, no mode endpoint, read-only shared quota and token-free snapshot', async () => {
  const h = harness(); apply(h.ctx)
  try {
    assert.equal((await h.request('/chatgpt-plus/quota', { owner: false })).status, 403)
    assert.equal((await h.request('/chatgpt-plus/state', { origin: 'https://attacker.invalid' })).status, 403)
    assert.equal((await h.request('/chatgpt-plus/sign-out', { method: 'POST', marker: '0', body: {} })).status, 403)
    assert.equal(h.executions, 0)
    assert.equal(h.hasModeRoute(), false)
    const tool = await h.tools.get('chatgpt_status').execute({}, { agent: h.agent })
    const http = await h.request('/chatgpt-plus/quota')
    assert.equal('mode' in tool, false)
    assert.equal(h.executions, 0)
    assert.equal(tool.quota.reason, http.payload.quota.reason)
    assert.equal(tool.quota.source, http.payload.quota.source)
    assert.equal(http.headers['cache-control'], 'no-store')
    const access = 'header.' + Buffer.from(JSON.stringify({ email: 'test@example.invalid' })).toString('base64url') + '.secret'
    h.setRecord({ kind: 'grant', payload: { access, refresh: 'refresh-secret', expires: 12345 } })
    const snapshot = await h.request('/chatgpt-plus/state')
    assert.equal(snapshot.payload.email, 'test@example.invalid')
    assert.ok(!JSON.stringify(snapshot).includes(access))
    assert.ok(!JSON.stringify(snapshot).includes('refresh-secret'))
    const signedOut = await h.request('/chatgpt-plus/sign-out', { method: 'POST', body: {} })
    assert.equal(signedOut.payload.signedIn, false)
    assert.equal(h.deleted, 1)
  } finally { await h.dispose() }
})
