window.__ModuleLoader__.load({
  id: 'dsh-chatgpt-plus',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace of this card's copy. */
    const NS = 'settings.chatgptPlus';

    const zh = {
      title: 'ChatGPT 账号 · 剩余额度',
      quotaTitle: 'Codex 订阅额度',
      quotaScope: '当前 ChatGPT 接入通道的账号级 Codex 额度，不是 ChatGPT 桌面端普通聊天额度。',
      quotaLoading: '正在读取额度…', quotaUnknown: '额度暂不可用',
      quotaDetails: '额度详情', quotaRefresh: '刷新额度',
      quotaPrimary: '主窗口', quotaSecondary: '次窗口', quotaRemaining: '剩余',
      quotaReset: '重置时间', quotaResetDue: '重置时间已到，待刷新确认',
      quotaChecked: '最近检测', quotaSource: '来源：OpenAI Codex /wham/usage（内部接口，可能变更）',
      quotaCredits: '额外 credits', quotaUnlimitedCredits: 'Credits 标记为不限量（不代表订阅窗口不限量）',
      quotaNoCredits: '无额外 credits', quotaMissing: '接口未返回此项',
      quotaAuth: '请登录；若已登录，令牌可能已过期，请重新登录或在适配器刷新后重试。',
      quotaNetwork: '额度接口连接失败。请在账号设置检查网络或代理。',
      quotaForbidden: '当前账号或网络无法访问额度接口（403）。',
      quotaRateLimited: '查询过于频繁，请稍后重试。',
      quotaUnsupported: '此账号暂未返回可识别的额度信息。',
      quotaFailure: '额度查询失败，稍后可手动重试。',
      quotaFloor: '自动检测约每分钟一次；手动刷新最短间隔 15 秒，不发送模型请求。',
      proxyConfirm: '这会改变当前 Harness 进程的出站代理，影响其他会话；本地与 DeepSeek 地址保持直连。是否继续？',
      proxyReset: '恢复代理',
      proxyHintExplicit: '插件只检测系统代理，不再自动修改网络。使用代理会影响整个 Harness 进程，卸载时恢复本插件此前的策略。',
      description: '用你订阅的 ChatGPT Plus / Pro 账号登录，无需 API Key。登录后即可在模型菜单中选择 GPT 模型。',
      signedIn: '已登录',
      signedOut: '未登录',
      signingIn: '登录中…',
      readFailed: '读取账号状态失败',
      unknownError: '未知错误',
      signInBrowser: '使用浏览器登录',
      signInDevice: '设备码登录',
      signOut: '退出登录',
      relogin: '重新登录',
      cancel: '取消登录',
      canceling: '取消中…',
      openPage: '打开登录页',
      deviceCodeLabel: '在登录页输入此代码',
      manualPrompt: '浏览器无法跳转时，把授权码或跳转后的完整网址粘贴到这里：',
      submitCode: '提交',
      accountLabel: '账号',
      planLabel: '套餐',
      accountIdLabel: '账号 ID',
      enableModels: '启用 GPT 模型',
      enabling: '启用中…',
      modelsReady: '已启用模型：',
      pickModel: '在输入框的模型菜单中选择上面的模型即可对话。',
      needProvider: '登录已完成，但模型提供商还没有启用。',
      signedInHint: '已准备好使用 ChatGPT Plus。',
      expires: '令牌到期',
      networkBlocked: '无法直连 OpenAI（当前网络被拒绝或超时）。请让下面的代理地址可达 ChatGPT：',
      proxyPlaceholder: 'http://127.0.0.1:7890',
      useProxy: '使用此代理',
      retest: '重新检测',
      proxyHint: '如果在代理客户端开启了 TUN / 系统代理模式，也可以直接重新检测。',
      networkViaProxy: '网络：OpenAI 流量经代理 ',
      proxyFailed: '代理不可用',
    };

    const en = {
      title: 'ChatGPT account · remaining quota',
      quotaTitle: 'Codex subscription quota',
      quotaScope: 'Account-wide Codex quota for this ChatGPT connection, not the ChatGPT desktop chat allowance.',
      quotaLoading: 'Reading quota…', quotaUnknown: 'Quota unavailable',
      quotaDetails: 'Quota details', quotaRefresh: 'Refresh quota',
      quotaPrimary: 'Primary window', quotaSecondary: 'Secondary window', quotaRemaining: 'Remaining',
      quotaReset: 'Resets at', quotaResetDue: 'Reset time reached; refresh to confirm',
      quotaChecked: 'Last checked', quotaSource: 'Source: OpenAI Codex /wham/usage (internal endpoint, subject to change)',
      quotaCredits: 'Extra credits', quotaUnlimitedCredits: 'Credits marked unlimited (not unlimited subscription windows)',
      quotaNoCredits: 'No extra credits', quotaMissing: 'Not returned by the endpoint',
      quotaAuth: 'Please sign in. If already signed in, the token may have expired; sign in again or retry after the adapter refreshes it.',
      quotaNetwork: 'Could not reach the quota endpoint. Check the network or proxy in account settings.',
      quotaForbidden: 'This account or network cannot access the quota endpoint (403).',
      quotaRateLimited: 'Too many checks; try again later.',
      quotaUnsupported: 'This account did not return recognizable quota information.',
      quotaFailure: 'Quota check failed. You can retry later.',
      quotaFloor: 'Checks about once a minute; manual refresh has a 15-second minimum. No model requests are sent.',
      proxyConfirm: 'This changes the outbound proxy for the whole Harness process, affecting other sessions; local and DeepSeek addresses stay direct. Continue?',
      proxyReset: 'Restore proxy',
      proxyHintExplicit: 'System proxies are detected, never silently applied. Changes affect the whole Harness process and are restored on plugin unload.',
      description: 'Sign in with the ChatGPT Plus / Pro subscription you already pay for — no API key. Afterwards pick a GPT model in the composer model menu.',
      signedIn: 'Signed in',
      signedOut: 'Not signed in',
      signingIn: 'Signing in…',
      readFailed: 'Could not read the account state',
      unknownError: 'Unknown error',
      signInBrowser: 'Sign in with browser',
      signInDevice: 'Device-code sign-in',
      signOut: 'Sign out',
      relogin: 'Sign in again',
      cancel: 'Cancel sign-in',
      canceling: 'Cancelling…',
      openPage: 'Open the sign-in page',
      deviceCodeLabel: 'Enter this code on the sign-in page',
      manualPrompt: 'If the browser cannot redirect, paste the authorization code or the full redirect URL here:',
      submitCode: 'Submit',
      accountLabel: 'Account',
      planLabel: 'Plan',
      accountIdLabel: 'Account ID',
      enableModels: 'Enable GPT models',
      enabling: 'Enabling…',
      modelsReady: 'Enabled models: ',
      pickModel: 'Choose one of these models in the composer model menu to chat.',
      needProvider: 'Sign-in finished, but the model provider is not enabled yet.',
      signedInHint: 'Ready to use ChatGPT Plus.',
      expires: 'Token expires',
      networkBlocked: 'OpenAI cannot be reached directly from this network (refused or timed out). Give a proxy below that can reach ChatGPT:',
      proxyPlaceholder: 'http://127.0.0.1:7890',
      useProxy: 'Use this proxy',
      retest: 'Check again',
      proxyHint: 'If your proxy client already runs a TUN or system-proxy mode, just check again.',
      networkViaProxy: 'Network: OpenAI traffic goes through ',
      proxyFailed: 'The proxy did not work',
    };

    const styles = {
      card: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: '12px',
        background: 'var(--dsw-alias-bg-layer-1)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      },
      head: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      },
      title: {
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '14px',
        fontWeight: '600',
        margin: 0,
      },
      pill: {
        marginLeft: 'auto',
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '999px',
        border: '1px solid var(--dsw-alias-border-l1)',
        color: 'var(--dsw-alias-label-secondary)',
        whiteSpace: 'nowrap',
      },
      pillOn: {
        color: 'var(--dsw-alias-state-success-primary)',
        borderColor: 'var(--dsw-alias-state-success-primary)',
      },
      pillBusy: {
        color: 'var(--dsw-alias-state-warn-primary)',
        borderColor: 'var(--dsw-alias-state-warn-primary)',
      },
      copy: {
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: '12.5px',
        lineHeight: '20px',
        margin: 0,
      },
      row: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px',
      },
      primary: {
        border: '1px solid var(--dsw-alias-brand-primary)',
        background: 'var(--dsw-alias-brand-primary)',
        color: '#fff',
        borderRadius: '8px',
        padding: '5px 12px',
        fontSize: '12.5px',
        cursor: 'pointer',
      },
      secondary: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: '8px',
        padding: '5px 12px',
        fontSize: '12.5px',
        cursor: 'pointer',
      },
      linkButton: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        padding: '0',
        fontSize: '12.5px',
        cursor: 'pointer',
        textDecoration: 'underline',
      },
      link: {
        color: 'var(--dsw-alias-brand-primary)',
        fontSize: '13px',
        wordBreak: 'break-all',
      },
      panel: {
        border: '1px dashed var(--dsw-alias-border-l2)',
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'var(--dsw-alias-bg-layer-2)',
      },
      code: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '20px',
        letterSpacing: '2px',
        color: 'var(--dsw-alias-label-primary)',
        userSelect: 'all',
      },
      input: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '8px',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        padding: '5px 8px',
        fontSize: '12.5px',
        flex: '1 1 220px',
        minWidth: '0',
      },
      error: {
        color: 'var(--dsw-alias-state-error-primary)',
        fontSize: '12.5px',
        margin: 0,
      },
      chip: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: '999px',
        padding: '1px 8px',
        fontSize: '11px',
        color: 'var(--dsw-alias-label-secondary)',
      },
    };

    /**
     * Read one bridge route. The page answers `{ ok, ... }` for both outcomes,
     * so a refusal is rendered as copy instead of a rejected fetch.
     */
    async function callBridge(path, body) {
      const init = body === undefined
        ? { method: 'GET' }
        : {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-chatgpt-plus': '1' },
            body: JSON.stringify(body),
          };
      const response = await fetch('/chatgpt-plus' + path, init);
      if (!response.ok) throw new Error('HTTP ' + String(response.status));
      return response.json();
    }

    /** Poll only visible mounted surfaces. The Host deduplicates account-wide checks. */
    function useQuota(enabled) {
      const [value, setValue] = React.useState(null);
      const [loading, setLoading] = React.useState(false);
      const alive = React.useRef(false);
      const inFlight = React.useRef(false);
      const refresh = React.useCallback(async (force = false) => {
        if (!enabled || !alive.current || inFlight.current) return;
        inFlight.current = true;
        setLoading(true);
        try {
          const response = await callBridge('/quota' + (force ? '?refresh=1' : ''));
          if (alive.current) setValue(response.ok ? response.quota : { status: 'failed', reason: 'bridge-error' });
        } catch {
          if (alive.current) setValue({ status: 'failed', reason: 'bridge-error' });
        } finally {
          inFlight.current = false;
          if (alive.current) setLoading(false);
        }
      }, [enabled]);
      React.useEffect(() => {
        alive.current = true;
        if (!enabled) { setValue(null); return () => { alive.current = false; }; }
        const check = () => { if (document.visibilityState !== 'hidden') void refresh(); };
        check();
        const timer = setInterval(check, 60_000);
        document.addEventListener('visibilitychange', check);
        return () => { alive.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', check); };
      }, [enabled, refresh]);
      return { value, loading, refresh };
    }

    function quotaReason(value, t) {
      if (!value) return t('quotaLoading');
      if (['not_signed_in', 'not-signed-in', 'token_expired', 'unauthorized', 'invalid-credentials', 'account_changed'].includes(value.reason)) return t('quotaAuth');
      if (['network-error', 'timeout', 'fetch-unavailable', 'bridge-error'].includes(value.reason)) return t('quotaNetwork');
      if (value.reason === 'forbidden') return t('quotaForbidden');
      if (value.reason === 'rate-limited') return t('quotaRateLimited');
      return t(value.status === 'unknown' ? 'quotaUnsupported' : 'quotaFailure');
    }

    function windowLabel(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '';
      if (seconds % 86400 === 0) return ' · ' + seconds / 86400 + 'd';
      if (seconds % 3600 === 0) return ' · ' + seconds / 3600 + 'h';
      return ' · ' + Math.round(seconds / 60) + 'min';
    }

    function quotaSummary(value, t) {
      if (!value || value.status !== 'ok') return t(value ? 'quotaUnknown' : 'quotaLoading');
      const windows = [value.primary, value.secondary].filter(item => item && typeof item.remainingPercent === 'number');
      return windows.length ? t('quotaRemaining') + ' ' + windows.map(item => String(item.remainingPercent) + '%' + windowLabel(item.windowSeconds)).join(' / ') : t('quotaDetails');
    }

    function QuotaDetails({ data, t }) {
      const value = data.value;
      const renderWindow = (name, window) => h('div', { key: name, style: { display: 'grid', gap: 5 } },
        h('span', null, t(name) + windowLabel(window && window.windowSeconds)),
        window && typeof window.remainingPercent === 'number'
          ? h(React.Fragment, null,
              h('strong', null, t('quotaRemaining') + ' ' + window.remainingPercent + '%'),
              h('progress', { max: 100, value: window.remainingPercent, 'aria-label': t(name) + ' ' + t('quotaRemaining'), style: { width: '100%', accentColor: 'var(--dsw-alias-state-success-primary)' } }))
          : h('span', { style: styles.copy }, t('quotaMissing')),
        window && window.resetsAt ? h('span', { style: styles.copy },
          t('quotaReset') + ': ' + new Date(window.resetsAt).toLocaleString(),
          new Date(window.resetsAt).getTime() <= Date.now() ? ' · ' + t('quotaResetDue') : '') : null);
      return h('div', { style: { ...styles.panel, fontSize: 12.5 }, 'aria-busy': data.loading },
        h('div', { style: styles.row }, h('strong', null, t('quotaTitle')),
          h('button', { type: 'button', style: styles.secondary, disabled: data.loading, onClick: () => void data.refresh(true) }, t(data.loading ? 'quotaLoading' : 'quotaRefresh'))),
        h('p', { style: styles.copy }, t('quotaScope')),
        value && value.status === 'ok'
          ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 } }, renderWindow('quotaPrimary', value.primary), renderWindow('quotaSecondary', value.secondary))
          : h('p', { style: styles.copy, role: 'status' }, quotaReason(value, t)),
        value && value.credits ? h('p', { style: styles.copy }, t('quotaCredits') + ': ' +
          (value.credits.unlimited === true ? t('quotaUnlimitedCredits') : value.credits.balance !== null ? value.credits.balance : value.credits.hasCredits === false ? t('quotaNoCredits') : t('quotaMissing'))) : null,
        value && value.checkedAt ? h('p', { style: styles.copy }, t('quotaChecked') + ': ' + new Date(value.checkedAt).toLocaleString()) : null,
        h('p', { style: styles.copy }, t('quotaSource')),
        h('p', { style: styles.copy }, t('quotaFloor')));
    }

    /** Read-only quota summary beside the existing model controls. */
    function ChatGPTQuota(props) {
      const t = props.t;
      const modelState = props.useProjection('modelSelection');
      const model = modelState && (modelState.next || modelState.lastUsed);
      const visible = !!(model && model.provider === 'openai-codex');
      const quota = useQuota(visible);
      const [details, setDetails] = React.useState(false);
      if (!visible) return null;
      return h('div', { className: 'dshcg-quota', style: { width: '100%', minWidth: 0, display: 'grid', gap: 6, padding: '4px 0' } },
        h('button', { type: 'button', style: styles.linkButton, 'aria-expanded': details, onClick: () => setDetails(!details) }, t('quotaTitle') + ' · ' + quotaSummary(quota.value, t)),
        details ? h(QuotaDetails, { data: quota, t }) : null);
    }

    /** The settings card: sign in, show the account, sign out. */
    function ChatGPTPlusCard(props) {
      const t = props.t;
      const [state, setState] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [busy, setBusy] = React.useState(null);
      const [draft, setDraft] = React.useState('');
      const [openedUrl, setOpenedUrl] = React.useState(null);
      const quota = useQuota(state && state.signedIn === true);

      const load = React.useCallback(async () => {
        try {
          const value = await callBridge('/state');
          if (value.ok === true) {
            setState(value);
            setError(null);
          } else {
            setError(value.error || t('readFailed'));
          }
        } catch (cause) {
          setError(String(cause && cause.message ? cause.message : cause));
        }
      }, [t]);

      /** Run one mutating action, then refresh from the next snapshot. */
      const run = React.useCallback(async (name, path, body) => {
        setBusy(name);
        try {
          const value = await callBridge(path, body === undefined ? {} : body);
          if (value.ok === true) {
            if (value.signedIn !== undefined) setState(value);
            setError(null);
            setDraft('');
          } else {
            setError(value.error || t('unknownError'));
          }
        } catch (cause) {
          setError(String(cause && cause.message ? cause.message : cause));
        } finally {
          setBusy(null);
        }
      }, [t]);

      React.useEffect(() => { void load(); }, [load]);

      /** Reachability and proxy state; fetched on demand, not on every poll. */
      const [network, setNetwork] = React.useState(null);
      const [proxyDraft, setProxyDraft] = React.useState('');

      const loadNetwork = React.useCallback(async () => {
        try {
          const value = await callBridge('/network');
          if (value.ok === true) {
            setNetwork(value);
            const detected = value.proxy && typeof value.proxy.detected === 'string' ? value.proxy.detected : '';
            setProxyDraft((current) => current === '' ? detected : current);
          }
        } catch {}
      }, []);

      React.useEffect(() => { void loadNetwork(); }, [loadNetwork]);

      const applyProxy = React.useCallback(async () => {
        if (!window.confirm(t('proxyConfirm'))) return;
        setBusy('proxy');
        try {
          const value = await callBridge('/proxy', { url: proxyDraft.trim() });
          if (value.ok === true) {
            setNetwork(value);
            setError(null);
          } else {
            setError(value.error || t('proxyFailed'));
          }
        } catch (cause) {
          setError(String(cause && cause.message ? cause.message : cause));
        } finally {
          setBusy(null);
        }
      }, [proxyDraft, t]);

      const signIn = state && state.signIn ? state.signIn : undefined;
      const signing = !!(signIn && signIn.phase !== 'authorized' && signIn.phase !== 'cancelled' && signIn.phase !== 'failed');
      const signInUrl = signIn && typeof signIn.url === 'string' ? signIn.url : undefined;

      React.useEffect(() => {
        if (!signing) return undefined;
        const timer = setInterval(() => { void load(); }, 1200);
        return () => clearInterval(timer);
      }, [signing, load]);

      React.useEffect(() => {
        if (!signing || signInUrl === undefined || openedUrl === signInUrl) return;
        setOpenedUrl(signInUrl);
        try { window.open(signInUrl, '_blank', 'noopener,noreferrer'); } catch {}
      }, [signing, signInUrl, openedUrl]);

      if (state === null) {
        return h('div', { className: 'dshcg-card', style: styles.card },
          h('p', { style: styles.copy }, error === null ? '…' : error));
      }

      const signedIn = state.signedIn === true;
      const networkProbe = network && network.probe ? network.probe : undefined;
      const networkBlocked = !!(networkProbe && networkProbe.blocked === true);
      const proxyUrl = network && network.proxy && typeof network.proxy.url === 'string' ? network.proxy.url : undefined;
      const lastResult = state.lastResult === undefined ? undefined : state.lastResult;
      const lastError = lastResult !== undefined && typeof lastResult.error === 'string'
        ? lastResult.error
        : lastResult !== undefined && typeof lastResult.enableError === 'string'
          ? lastResult.enableError
          : undefined;
      const shownError = error !== null ? error : lastError;
      const statusTone = signedIn ? styles.pillOn : signing ? styles.pillBusy : null;
      const statusText = signedIn ? t('signedIn') : signing ? t('signingIn') : t('signedOut');
      const plan = typeof state.plan === 'string' ? state.plan : undefined;
      const email = typeof state.email === 'string' ? state.email : undefined;
      const accountId = typeof state.accountId === 'string' ? state.accountId : undefined;
      const models = Array.isArray(state.models) ? state.models : [];
      const busySignIn = busy === 'sign-in' || busy === 'sign-in-device';

      const networkPanel = networkBlocked
        ? h('div', { style: styles.panel },
            h('p', { style: styles.error }, t('networkBlocked')),
            h('div', { style: styles.row },
              h('input', {
                style: styles.input,
                value: proxyDraft,
                placeholder: t('proxyPlaceholder'),
                onChange: (event) => setProxyDraft(event.target.value),
                onKeyDown: (event) => { if (event.key === 'Enter') void applyProxy(); },
              }),
              h('button', {
                type: 'button',
                style: styles.primary,
                disabled: busy !== null || proxyDraft.trim() === '',
                onClick: () => void applyProxy(),
              }, t('useProxy')),
              h('button', {
                type: 'button',
                style: styles.linkButton,
                disabled: busy !== null,
                onClick: () => void loadNetwork(),
              }, t('retest'))),
            h('p', { style: styles.copy }, t('proxyHintExplicit')))
        : proxyUrl === undefined
          ? null
          : h('div', { style: styles.row },
              h('span', { style: styles.copy }, t('networkViaProxy') + proxyUrl),
              network.proxy.source === 'manual' ? h('button', {
                type: 'button', style: styles.linkButton, disabled: busy !== null,
                onClick: async () => {
                  if (!window.confirm(t('proxyConfirm'))) return;
                  setBusy('proxy');
                  try { const value = await callBridge('/proxy/reset', {}); if (value.ok) setNetwork(value); else setError(value.error); }
                  catch (cause) { setError(String(cause && cause.message ? cause.message : cause)); }
                  finally { setBusy(null); }
                },
              }, t('proxyReset')) : null);

      const signInPanel = signing
        ? h('div', { style: styles.panel },
            signInUrl === undefined
              ? h('p', { style: styles.copy }, t('signingIn'))
              : h('a', { href: signInUrl, target: '_blank', rel: 'noopener noreferrer', style: styles.link }, t('openPage')),
            signIn && typeof signIn.code === 'string'
              ? h('div', null,
                  h('p', { style: styles.copy }, t('deviceCodeLabel')),
                  h('div', { style: styles.code }, signIn.code))
              : null,
            signIn && signIn.prompt
              ? h('div', { style: styles.row },
                  h('p', { style: { ...styles.copy, flex: '1 1 100%' } }, t('manualPrompt')),
                  h('input', {
                    style: styles.input,
                    value: draft,
                    placeholder: signIn.prompt.placeholder || '',
                    onChange: (event) => setDraft(event.target.value),
                    onKeyDown: (event) => { if (event.key === 'Enter') void run('answer', '/answer', { value: draft }); },
                  }),
                  h('button', {
                    type: 'button',
                    style: styles.secondary,
                    disabled: busy !== null || draft.trim() === '',
                    onClick: () => void run('answer', '/answer', { value: draft }),
                  }, t('submitCode')))
              : null,
            h('div', { style: styles.row },
              h('button', {
                type: 'button',
                style: styles.linkButton,
                disabled: busy !== null,
                onClick: () => void run('cancel', '/cancel'),
              }, busy === 'cancel' ? t('canceling') : t('cancel'))))
        : null;

      const accountLine = h('div', { style: styles.row },
        h('span', { style: styles.copy },
          email !== undefined
            ? email
            : accountId !== undefined
              ? t('accountIdLabel') + ' ' + accountId.slice(0, 8) + '…'
              : t('signedIn')),
        plan !== undefined ? h('span', { style: styles.chip }, t('planLabel') + ' · ' + plan) : null);

      const modelLine = models.length === 0
        ? null
        : h('div', { style: styles.row },
            h('span', { style: styles.copy }, t('modelsReady')),
            models.slice(0, 4).map((model) => h('span', { key: model.id, style: styles.chip }, model.name || model.id)));

      const actions = signedIn
        ? h('div', { style: styles.row },
            state.providerConfigured === true ? null : h('button', {
              type: 'button',
              style: styles.primary,
              disabled: busy !== null,
              onClick: () => void run('enable', '/enable'),
            }, busy === 'enable' ? t('enabling') : t('enableModels')),
            h('button', {
              type: 'button',
              style: state.providerConfigured === true ? styles.primary : styles.secondary,
              disabled: busy !== null,
              onClick: () => void run('sign-in', '/sign-in', { mode: 'browser' }),
            }, busy === 'sign-in' ? t('signingIn') : t('relogin')),
            h('button', {
              type: 'button',
              style: styles.secondary,
              disabled: busy !== null,
              onClick: () => void run('sign-out', '/sign-out'),
            }, t('signOut')))
        : h('div', { style: styles.row },
            h('button', {
              type: 'button',
              style: styles.primary,
              disabled: busy !== null || signing,
              onClick: () => void run('sign-in', '/sign-in', { mode: 'browser' }),
            }, busySignIn && !signing ? t('signingIn') : t('signInBrowser')),
            h('button', {
              type: 'button',
              style: styles.secondary,
              disabled: busy !== null || signing,
              onClick: () => void run('sign-in-device', '/sign-in', { mode: 'device_code' }),
            }, t('signInDevice')));

      return h('div', { className: 'dshcg-card', style: styles.card },
        h('div', { style: styles.head },
          h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true },
            h('path', {
              d: 'M12 2.6c-1.3 0-2.5.7-3.2 1.8a3.8 3.8 0 0 0-3.4 3.4A3.9 3.9 0 0 0 4 11.2c0 .9.3 1.7.8 2.4a3.9 3.9 0 0 0 2.5 5.1 3.8 3.8 0 0 0 5.8 1.6 3.9 3.9 0 0 0 5.6-2.6 3.8 3.8 0 0 0 1.4-6 3.9 3.9 0 0 0-2.5-5.1A3.9 3.9 0 0 0 12 2.6Z',
              fill: 'var(--dsw-alias-state-success-primary)',
              opacity: 0.18,
            }),
            h('path', {
              d: 'M12 5.4c-.7 0-1.3.4-1.6 1a2 2 0 0 0-1.8 1.8A2 2 0 0 0 7.2 11c0 .5.2 1 .5 1.3a2 2 0 0 0 1.3 2.8 2 2 0 0 0 3 1 2 2 0 0 0 3-1.4 2 2 0 0 0 .8-3.2 2 2 0 0 0-1.3-2.8A2 2 0 0 0 12 5.4Zm0 2.1.9 1.6 1.8.3-1.3 1.3.3 1.8-1.7-.9-1.7.9.3-1.8-1.3-1.3 1.8-.3Z',
              fill: 'var(--dsw-alias-state-success-primary)',
            })),
          h('h3', { style: styles.title }, t('title')),
          h('span', { style: statusTone === null ? styles.pill : { ...styles.pill, ...statusTone } }, statusText)),
        h('p', { style: styles.copy }, signedIn ? t('signedInHint') : t('description')),
        networkPanel,
        signedIn ? h(QuotaDetails, { data: quota, t }) : null,
        signedIn ? accountLine : null,
        signedIn ? modelLine : null,
        signedIn && state.providerConfigured !== true ? h('p', { style: styles.copy }, t('needProvider')) : null,
        signedIn && state.providerConfigured === true && models.length > 0 ? h('p', { style: styles.copy }, t('pickModel')) : null,
        signInPanel,
        actions,
        shownError === undefined ? null : h('p', { style: styles.error }, shownError));
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-chatgpt-plus: copy');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('settings.models.footer', () => ctx.slots.register({
          name: 'settings.models.footer',
          id: 'chatgpt-plus',
          order: 50,
          locale: NS,
          inject: () => ({ t }),
        }, ChatGPTPlusCard));
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'chatgpt-quota',
          order: 20,
          locale: NS,
          inject: () => ({ t }),
        }, ChatGPTQuota));
      },
    };
  },
});
