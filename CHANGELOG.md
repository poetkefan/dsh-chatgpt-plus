# Changelog

## 1.2.0 — 2026-10-21

First public release.

- Sign in with a ChatGPT Plus / Pro account through the shipped `llm-pi-ai` OAuth flow, no API key.
- Enable the `openai-codex` model route after sign-in so subscription models appear in the composer menu.
- Read remaining Codex subscription quota: primary and secondary windows, reset times, and extra credits.
- Quota is cached per account with single-flight reads, a 15-second manual-refresh floor, and cache invalidation on sign-out or account change.
- Same-origin HTTP bridge authenticated with the Harness `connection.requestRejection` check.
- Optional outbound proxy repair for ChatGPT traffic; never applied silently.

## Earlier development versions

`1.1.0` added experimental Chat / Work / Codex session modes. That feature was removed in `1.2.0` because all three modes consume the same Codex quota, so the distinction added permission surface without changing billing. Historical `command/run` records from that build remain inert.
