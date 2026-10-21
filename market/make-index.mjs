/**
 * Generate the format-1 plugin market index for this repository.
 *
 * Usage: node market/make-index.mjs <owner> <repo> [commit]
 * `commit` defaults to the current HEAD. The index must be regenerated and
 * committed after every release commit so `source.commit` stays pinned to the
 * published version instead of a moving branch.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const [owner, repo, explicitCommit] = process.argv.slice(2)
if (!owner || !repo) {
  console.error('usage: node market/make-index.mjs <owner> <repo> [commit]')
  process.exit(2)
}
const commit = explicitCommit ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('commit must be a 40-hex SHA')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const index = {
  format: 1,
  title: { en: 'ChatGPT Plus for DeepSeek Harness', zh: 'DeepSeek Harness 的 ChatGPT Plus' },
  description: {
    en: 'Sign in with a ChatGPT subscription and read the remaining Codex quota.',
    zh: '登录 ChatGPT 订阅账号，并查看 Codex 剩余额度。',
  },
  metadata: {
    categories: { productivity: { title: { en: 'Productivity', zh: '效率' } } },
    labels: { chatgpt: { title: { en: 'ChatGPT', zh: 'ChatGPT' } } },
  },
  plugins: [
    {
      name: pkg.name,
      title: { en: 'ChatGPT account & quota', zh: 'ChatGPT 登录与额度' },
      description: {
        en: 'ChatGPT Plus / Pro sign-in for the built-in openai-codex route, plus remaining subscription quota with reset times. Read-only quota, no session or tool-policy changes.',
        zh: '为内置 openai-codex 路由提供 ChatGPT Plus / Pro 登录，并显示剩余订阅额度与重置时间。额度只读，不改变会话或工具策略。',
      },
      icon: '../icon.svg',
      author: owner,
      homepage: `https://github.com/${owner}/${repo}`,
      repository: { url: `https://github.com/${owner}/${repo}` },
      metadata: { category: 'productivity', labels: ['chatgpt'], keywords: ['chatgpt', 'openai', 'quota', 'codex', 'oauth'] },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: Math.floor(Date.now() / 1000),
          source: { type: 'git', url: `https://github.com/${owner}/${repo}`, commit },
          engines: { dsh: pkg.engines.dsh },
        },
      ],
    },
  ],
}

writeFileSync(join(here, 'index.json'), JSON.stringify(index, null, 2) + '\n')
console.log(`wrote market/index.json for ${pkg.name}@${pkg.version} at ${commit}`)
