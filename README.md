# ChatGPT Plus for DeepSeek Harness

English | [中文](#中文)

A DeepSeek Harness plugin that signs in with a **ChatGPT Plus / Pro** subscription and shows the **remaining Codex quota** — no OpenAI API key. It reuses the shipped `llm-pi-ai` OAuth flow and the `openai-codex` model route; it does not implement a model protocol of its own.

## What it does

- **Account sign-in** — browser or device-code ChatGPT authorization, brokered over a same-origin bridge.
- **Model access** — after sign-in it adds the `openai-codex` provider profile to `llm-pi-ai`, so subscription models appear in the composer menu.
- **Remaining quota** — primary and secondary windows, reset times, extra credits, and the last check time, from the endpoint the official Codex client uses.
- **Network aid** — detects the Windows system proxy and offers it explicitly; never applies it without confirmation.

It does **not** change session behavior, prompts, tool permissions, default model, or reasoning effort.

## Requirements

| Item | Requirement |
| --- | --- |
| DeepSeek Harness | `0.2.1-rc.2` (declared as `engines.dsh`) |
| Node.js | `>=22.19.0` |
| Services | the default Web composition: `webServer`, `credentials`, `authorization`, `connection`, `tools` |
| Model adapter | `@deepseek-ai/dsh-llm-pi-ai` mounted as the `llm-pi-ai` entry |

A non-default composition that omits those services or renames that entry is not supported.

## Install

Install from this repository's Git source:

```sh
dsh plugin --profile desktop add "git+https://github.com/poetkefan/dsh-chatgpt-plus.git"
```

Or add `https://raw.githubusercontent.com/poetkefan/dsh-chatgpt-plus/main/market/index.json` under **Plugins → Discover → Index sources** and install **ChatGPT account & quota** there.

In the Desktop app, prefer the in-app plugin manager: it owns its profile, and the CLI must not change it while the app is running. After installing, refresh the page.

## Use

1. Open **Settings → Models → ChatGPT account · remaining quota** and sign in.
2. Pick a model under `openai-codex` in the composer model menu.
3. The quota summary appears below the composer once a ChatGPT model is selected; click it for details and to refresh.
4. You can also ask the assistant to check quota — the read-only `chatgpt_status` tool returns the same data.

The model catalog does not prove that your plan may use every listed model; OpenAI decides that at request time.

## What the quota number means

- It is read from `GET https://chatgpt.com/backend-api/wham/usage`, the endpoint the official Codex client uses. It is an **internal endpoint, not a public stable API**, and may change.
- It shows **account-wide Codex quota**, shared by everything that uses this ChatGPT connection. It is **not** the ChatGPT desktop chat allowance, and not a total of research, voice, or other product quotas.
- Missing fields are shown as unknown, never as `0%`; the plugin does not convert quota into "messages left". `unlimited` credits do not imply unlimited subscription windows.
- Checks run about once a minute while a surface is visible; manual refresh has a 15-second floor. Multiple panels share one cached read. No model request is sent to probe quota.
- Signing out or switching accounts invalidates the cache, and a late response from the previous account cannot refill it. Tokens, raw responses, and account ids are never returned to the page or logged.
- Token refresh stays with the existing adapter. An expired or unauthorized token produces a clear message; the plugin never rewrites credentials.

## Network, privacy, and security

- Bridge routes reuse the Harness `connection.requestRejection` check (Host/Origin plus browser credential); writes additionally require the same origin and an `x-chatgpt-plus: 1` header.
- A proxy is only ever installed after an explicit confirmation, because it changes outbound traffic for the **whole Harness process**. `localhost`, `127.0.0.1`, `::1`, `api.deepseek.com`, and existing `no_proxy` entries stay direct. The policy this plugin installs is restored on reset and on unload; the plugin never edits the Windows system proxy or `.env`.
- Proxy detection reads the Windows registry. On macOS and Linux only environment variables and the manual field are available, and only `http(s)` proxies are supported (not SOCKS).
- No credential, email, or quota data leaves the machine except the authenticated quota request to `chatgpt.com`.

## Development

```sh
node --test          # 24 tests: quota normalization, redaction, cache isolation, HTTP auth
npm run check        # syntax check every runtime module
```

`quota.js` performs the network read and normalizes it; `quota-cache.js` holds the account-scoped cache; `index.js` is the Host bridge; `client.js` is the settings card and composer summary.

## License

MIT. See [LICENSE](LICENSE).

Upstream references:

- https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client/rate_limit_resets.rs
- https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client.rs

---

## 中文

DeepSeek Harness 插件：用 **ChatGPT Plus / Pro** 订阅账号登录，并查看 **Codex 剩余额度**，不需要 OpenAI API Key。复用内置 `llm-pi-ai` 的 OAuth 流程与 `openai-codex` 模型路由，不自行实现模型协议。**不改变**会话行为、提示词、工具权限、默认模型或推理强度。

**要求**：Harness `0.2.1-rc.2`、Node.js `>=22.19.0`，并保留默认 Web 组合中的 `webServer`、`credentials`、`authorization`、`connection`、`tools` 服务与 `llm-pi-ai` 条目。

**安装**：`dsh plugin --profile desktop add "git+https://github.com/poetkefan/dsh-chatgpt-plus.git"`，或在 **插件 → 发现 → 索引源** 添加 `https://raw.githubusercontent.com/poetkefan/dsh-chatgpt-plus/main/market/index.json` 后一键安装；安装后刷新页面。桌面版请用应用内插件管理器。

**使用**：设置 → 模型 → ChatGPT 登录；在模型菜单选择 `openai-codex` 下的模型；输入框下方出现额度摘要，点击展开并刷新；也可让助手调用只读工具 `chatgpt_status`。

**额度含义**：数据来自官方 Codex 客户端使用的 `GET https://chatgpt.com/backend-api/wham/usage`（内部接口，可能变更）。这是**账号级 Codex 额度**，不是 ChatGPT 桌面端聊天额度，也不是各产品额度的总和。缺失数据显示未知而非 0%，不换算“还能聊几条”。约每分钟检测一次，手动刷新最短 15 秒；不发模型请求探测额度。退出或换号会清空缓存，旧账号响应不能回填；令牌、原始响应和账号 ID 不进入页面或日志。

**安全**：路由复用 Harness 身份与 Host/Origin 校验；代理必须经明确确认，且影响整个 Harness 进程，本插件安装的策略在重置或卸载时恢复；Windows 之外只能通过环境变量或手动填写代理，且仅支持 http(s)。

**许可**：MIT。
