/* eslint-disable no-console */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  AppRenderer,
  type RequestHandlerExtra,
} from '@ggui-ai/react';
import {
  useMcpAppsChat,
  type ChatEntry,
  type RenderRef,
  type ToolCallEntry,
  type UseMcpAppsChatResult,
} from '@ggui-ai/react/chat-helpers';
import type {
  CallToolRequest,
  CallToolResult,
  ReadResourceRequest,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * The hook's drop-in `<AppRenderer onMessage>` handler. The sample
 * stays ggui-protocol-agnostic for the `ui/message` path — it forwards
 * the guest message verbatim through this handler; the agent-server
 * backend is the sole party that recognizes + guards any `ai.ggui/*`
 * `_meta` keys.
 */
type AppMessageHandler = UseMcpAppsChatResult['handleAppMessage'];

type LayoutMode = 'inline' | 'panel';

interface ChatProps {
  /**
   * MCP-Apps-spec agent backend base URL (e.g. `http://localhost:6790`).
   * Wired into the `useMcpAppsChat` hook for the single `POST /agent`
   * endpoint (`kind:'chat'` for prompts, `kind:'tool-call'` for the
   * iframe → MCP relay) + `GET /agent?chatId=X` rehydration. The
   * frontend stays SDK-agnostic — the backend decides which LLM it
   * drives.
   */
  readonly agentEndpoint: string;
  /**
   * Sandbox-proxy origin (second-origin iframe host, per MCP-Apps spec).
   * Read by {@link App} from the `GET /` manifest's `sandboxProxyUrl`
   * field and threaded down here so a `<Chat>` mount always has a
   * resolved URL — no in-component loading state.
   */
  readonly sandboxUrl: string;
}

// localStorage keys for the guest-token flow. The token survives
// reloads so a returning visitor lands on the same chats; the chatId
// is URL-resident so cross-tab links land on the same conversation.
const LS_GUEST_TOKEN = 'ggui-basic-web/guestToken';
const URL_CHAT_PARAM = 'chat';

/**
 * Read the URL `?chat=<id>` — returns the chatId when present so the
 * hook rehydrates that specific conversation, else `undefined` so the
 * server allocates a fresh id on the first POST.
 */
function getInitialChatId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const fromUrl = new URL(window.location.href).searchParams.get(
    URL_CHAT_PARAM,
  );
  return fromUrl && fromUrl.length > 0 ? fromUrl : undefined;
}

/**
 * Mint a fresh guest token via the agent backend's
 * `POST /auth/guest` mount (the spec-canonical endpoint mounted by
 * `@ggui-ai/agent-server`'s default `createGuestTokenAuth()`).
 */
async function mintGuestToken(agentEndpoint: string): Promise<string> {
  const res = await fetch(`${agentEndpoint}/auth/guest`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`POST /auth/guest returned ${res.status}`);
  }
  const body = (await res.json()) as { guestToken?: unknown };
  if (typeof body.guestToken !== 'string' || body.guestToken.length === 0) {
    throw new Error('POST /auth/guest response missing guestToken');
  }
  return body.guestToken;
}

/**
 * Chat panel + iframe area for an MCP-Apps-spec agent backend.
 *
 * Auth: bearer guest token resolved at mount (or cached in
 * localStorage). The token is the principal id the backend gates
 * chat-ownership on; clearing localStorage = fresh guest = new
 * conversations.
 */
export function Chat({ agentEndpoint, sandboxUrl }: ChatProps) {
  // Bearer token (kept in a ref so the per-fetch `getAuthToken`
  // callback always sees the latest). null = not yet minted.
  const guestTokenRef = useRef<string | null>(null);
  const [guestTokenReady, setGuestTokenReady] = useState(false);

  // Boot: pull cached token from localStorage; mint a fresh one if
  // absent. Async; the chat panel guards against premature renders
  // via `guestTokenReady`.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached =
          typeof window !== 'undefined'
            ? window.localStorage.getItem(LS_GUEST_TOKEN)
            : null;
        if (cached && cached.length > 0) {
          guestTokenRef.current = cached;
          if (!cancelled) setGuestTokenReady(true);
          return;
        }
        const fresh = await mintGuestToken(agentEndpoint);
        if (cancelled) return;
        guestTokenRef.current = fresh;
        window.localStorage.setItem(LS_GUEST_TOKEN, fresh);
        setGuestTokenReady(true);
      } catch (err) {
        console.warn('[Chat] guest-token mint failed', err);
        // Surface as "ready" anyway — requests will 401 + show error
        // entries; better than a permanent loading state.
        if (!cancelled) setGuestTokenReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentEndpoint]);

  // Stable chat id from URL (initial) + server-allocated thereafter.
  const [chatId, setChatId] = useState<string | undefined>(() =>
    getInitialChatId(),
  );

  const getAuthToken = useCallback(
    () => guestTokenRef.current ?? undefined,
    [],
  );

  // 401 handler: clear the cached token, mint a fresh one, signal
  // retry. The hook reissues the failing request once on `true`.
  const onUnauthenticated = useCallback(async (): Promise<boolean> => {
    try {
      const fresh = await mintGuestToken(agentEndpoint);
      guestTokenRef.current = fresh;
      window.localStorage.setItem(LS_GUEST_TOKEN, fresh);
      return true;
    } catch (err) {
      console.warn('[Chat] guest-token refresh failed', err);
      return false;
    }
  }, [agentEndpoint]);

  // Stamp the server-allocated chatId into URL + state once
  // received. Quiet when the URL already carries the right id (this
  // covers the rehydration path).
  const onChatAllocated = useCallback((allocated: string) => {
    setChatId((prev) => {
      if (prev === allocated) return prev;
      const url = new URL(window.location.href);
      url.searchParams.set(URL_CHAT_PARAM, allocated);
      window.history.replaceState({}, '', url.toString());
      return allocated;
    });
  }, []);

  const { entries, renders, hostDisplayMode, sending, send, handleAppMessage, abort } =
    useMcpAppsChat({
      chatEndpoint: `${agentEndpoint}/agent`,
      snapshotEndpoint: `${agentEndpoint}/agent`,
      ...(chatId !== undefined ? { chatId } : {}),
      onChatAllocated,
      getAuthToken,
      onUnauthenticated,
    });

  const [prompt, setPrompt] = useState('');
  // Default to panel (side-pane) layout; the agent's `hostDisplayMode`
  // hint (if any) still overrides via the effect below.
  const [layout, setLayout] = useState<LayoutMode>('inline');
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hostDisplayMode === undefined) return;
    setLayout(hostDisplayMode === 'inline' ? 'inline' : 'panel');
  }, [hostDisplayMode]);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);

  // 위저드 → GGUI 핸드오프: `?q=` 가 있어도 자동 전송하지 않는다. (자동전송 OFF)
  // 대신 사주 컨텍스트를 '원탭 스타터'로 노출해, 사용자가 직접 보내거나 자유롭게 입력하게 한다.
  const introQ = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('q')?.trim() ?? '';
  }, []);

  // `?birth=YYYY-M-D-cal` → 사주 컨텍스트 한 문장. 위저드(saju-travel)에서 넘긴다.
  const introBirth = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const b = new URL(window.location.href).searchParams.get('birth')?.trim();
    if (!b) return '';
    const [y, m, d, cal] = b.split('-');
    if (!y || !m || !d) return '';
    const calKo = cal === 'lunar' ? '음력' : '양력';
    return `나 ${y}년 ${m}월 ${d}일 ${calKo}생이야.`;
  }, []);

  // 첫 사용자 메시지(스타터 칩이든 직접 입력이든)에만 사주 컨텍스트를 1회 prepend.
  // 이후 턴은 같은 chatId 히스토리로 맥락이 유지된다. 새 대화 시작 시 다시 prime.
  const primedRef = useRef(false);
  const sendWithIntro = useCallback(
    (text: string) => {
      if (!primedRef.current && introBirth) {
        primedRef.current = true;
        void send(`${introBirth} ${text}`);
        return;
      }
      void send(text);
    },
    [send, introBirth],
  );

  const newSession = useCallback(() => {
    // Stop any in-flight stream so its tail doesn't bleed into the fresh
    // conversation, then drop the URL chat param + local state. Clearing
    // `chatId` makes useMcpAppsChat reset entries/renders; the next POST
    // allocates a fresh server-side chatId, which lands via
    // onChatAllocated.
    abort();
    primedRef.current = false;
    const url = new URL(window.location.href);
    url.searchParams.delete(URL_CHAT_PARAM);
    window.history.replaceState({}, '', url.toString());
    setChatId(undefined);
  }, [abort]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;
    setPrompt('');
    sendWithIntro(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      e.preventDefault();
      (e.currentTarget.form as HTMLFormElement).requestSubmit();
    }
  };

  if (!guestTokenReady) {
    return (
      <div style={{ padding: 24, color: '#888', fontFamily: 'system-ui' }}>
        Provisioning guest session…
      </div>
    );
  }

  return (
    <div className={`layout layout-${layout}`}>
      <aside className="chat">
        <header>
          <div className="title">
            <h1>럭키매칭에게 물어봐!</h1>
            <p className="subtitle">Lucky Matching</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="new-session"
              onClick={newSession}
              title="새 대화"
              data-testid="new-session"
            >
              + 새 대화
            </button>
          </div>
        </header>

        <div className="history" ref={historyRef} role="log" aria-live="polite">
          {entries.length === 0 ? (
            <EmptyState introQ={introQ} sending={sending} onStart={(t) => sendWithIntro(t)} />
          ) : null}
          {entries.map((entry) => (
            <ChatEntryView
              key={entry.id}
              entry={entry}
              renderInline={layout === 'inline'}
              sandboxUrl={sandboxUrl}
              agentEndpoint={agentEndpoint}
              getAuthToken={getAuthToken}
              onAppMessage={handleAppMessage}
            />
          ))}
          {sending ? (
            <div className="msg assistant ggui-typing" aria-live="polite" data-testid="typing">
              <span className="ggui-typing-dot" />
              <span className="ggui-typing-dot" />
              <span className="ggui-typing-dot" />
              <span className="ggui-typing-label">럭키매칭이 생각 중…</span>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit}>
          <textarea
            name="prompt"
            placeholder="럭키매칭에게 물어봐!"
            rows={1}
            autoFocus
            value={prompt}
            disabled={sending}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setPrompt(e.target.value)
            }
            onKeyDown={onKeyDown}
          />
          <button
            type={sending ? 'button' : 'submit'}
            disabled={!sending && !prompt.trim()}
            onClick={sending ? abort : undefined}
            aria-label={sending ? 'Stop' : 'Send'}
            title={sending ? 'Stop' : 'Send'}
          >
            {sending ? (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: 'currentColor',
                  borderRadius: 2,
                }}
              />
            ) : (
              'Send'
            )}
          </button>
        </form>
      </aside>

      {layout === 'panel' ? (
        <main className="ui-pane">
          <PanelView
            renders={renders}
            sandboxUrl={sandboxUrl}
            agentEndpoint={agentEndpoint}
            getAuthToken={getAuthToken}
            onAppMessage={handleAppMessage}
          />
        </main>
      ) : null}
    </div>
  );
}

function EmptyState({
  introQ,
  sending,
  onStart,
}: {
  introQ: string;
  sending: boolean;
  onStart: (text: string) => void;
}) {
  const starters = [
    '오늘 나 어디로 떠나면 좋아?',
    '재물운 올리려면 어디가 좋아?',
    '이번 주말 여행지 추천해줘',
  ];
  return (
    <div className="empty-state">
      <div className="empty-state-wordmark" aria-label="Lucky Matching">
        Lucky Matching
      </div>
      <h2>럭키매칭에게 물어봐!</h2>
      <p>아래에서 골라 시작하거나, 직접 물어봐도 돼요.</p>
      <div className="empty-state-examples ggui-starters">
        {introQ ? (
          <button
            type="button"
            className="ggui-starter ggui-starter-primary"
            disabled={sending}
            onClick={() => onStart(introQ)}
          >
            ✨ 내 사주로 여행 추천받기
          </button>
        ) : null}
        {starters.map((s) => (
          <button
            key={s}
            type="button"
            className="ggui-starter"
            disabled={sending}
            onClick={() => onStart(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatEntryView({
  entry,
  renderInline,
  sandboxUrl,
  agentEndpoint,
  getAuthToken,
  onAppMessage,
}: {
  entry: ChatEntry;
  renderInline: boolean;
  sandboxUrl: string;
  agentEndpoint: string;
  getAuthToken: () => string | undefined;
  onAppMessage: AppMessageHandler;
}) {
  if (entry.kind === 'render') {
    if (renderInline) {
      return (
        <div className="msg render-wrap">
          <ResourceFrame
            item={entry.render}
            sandboxUrl={sandboxUrl}
            agentEndpoint={agentEndpoint}
            getAuthToken={getAuthToken}
            onAppMessage={onAppMessage}
          />
        </div>
      );
    }
    return (
      <div className="msg tool">
        ← UI · {shortLabel(entry.render)}
      </div>
    );
  }
  if (entry.kind === 'end') {
    return (
      <div className="msg turn-end" data-testid="turn-end">
        turn ended · {entry.subtype}
      </div>
    );
  }
  if (entry.kind === 'tool-call') {
    return <ToolCallView entry={entry} />;
  }
  return <div className={`msg ${entry.kind}`}>{entry.text}</div>;
}

function ToolCallView({ entry }: { entry: ToolCallEntry }) {
  const [open, setOpen] = useState(false);
  const shortName = entry.name.replace(/^mcp__[^_]+__/, '');
  const pending = entry.result === undefined && entry.isError !== true;
  const status = entry.isError ? 'error' : pending ? 'pending' : 'ok';
  return (
    <div className={`msg tool-call tool-call-${status}`}>
      <button
        type="button"
        className="tool-call-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tool-call-chevron">{open ? '▾' : '▸'}</span>
        <span className="tool-call-name">{shortName}</span>
        <span className={`tool-call-status tool-call-status-${status}`}>
          {pending ? '…' : entry.isError ? 'error' : 'ok'}
        </span>
      </button>
      {open ? (
        <div className="tool-call-body">
          <div className="tool-call-section">
            <div className="tool-call-section-label">input</div>
            <pre className="tool-call-json">{prettyJson(entry.input)}</pre>
          </div>
          <div className="tool-call-section">
            <div className="tool-call-section-label">
              {entry.isError ? 'error result' : 'result'}
            </div>
            <pre className="tool-call-json">
              {entry.result === undefined
                ? '(awaiting)'
                : prettyJson(entry.result)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function PanelView({
  renders,
  sandboxUrl,
  agentEndpoint,
  getAuthToken,
  onAppMessage,
}: {
  renders: ReadonlyArray<RenderRef>;
  sandboxUrl: string;
  agentEndpoint: string;
  getAuthToken: () => string | undefined;
  onAppMessage: AppMessageHandler;
}) {
  const top = useMemo(() => renders[renders.length - 1], [renders]);
  if (!top) {
    return (
      <div className="ui-placeholder">
        <p>The rendered UI will appear here once the agent emits one.</p>
      </div>
    );
  }
  return (
    <div className="panel-frame">
      <ResourceFrame
        item={top}
        sandboxUrl={sandboxUrl}
        agentEndpoint={agentEndpoint}
        getAuthToken={getAuthToken}
        onAppMessage={onAppMessage}
        fillContainer
      />
    </div>
  );
}

/**
 * Render one MCP-Apps resource. Mounts straight from the inlined
 * resource `@ggui-ai/agent-server`'s tool-result interceptor stamped
 * on `_meta.ui.resource` (zero-round-trip mount). On rehydration the
 * `GET /agent` replay re-inlines each render FRESH from the MCP, so
 * the inlined HTML always reflects current server state. When no
 * inlined HTML is present (a render that no longer resolves), the
 * frame shows a small "not inlined" notice rather than fetching.
 */
function ResourceFrame({
  item,
  sandboxUrl,
  agentEndpoint,
  getAuthToken,
  fillContainer = false,
  onAppMessage,
}: {
  item: RenderRef;
  sandboxUrl: string;
  agentEndpoint: string;
  getAuthToken: () => string | undefined;
  fillContainer?: boolean;
  onAppMessage?: AppMessageHandler;
}) {
  // Inlined resource ride-along from the library's interceptor wins.
  // No fetch needed — render straight from `inlinedResource.text`.
  const html = item.inlinedResource?.text;
  const inlinedCsp = item.inlinedResource?.csp;

  const sandbox = useMemo(() => {
    if (!inlinedCsp) return { url: new URL(sandboxUrl) };
    // SandboxConfig wants mutable string[] arrays; the RenderRef
    // shape keeps them readonly so reassignment doesn't leak. Copy
    // here at the boundary.
    const csp: {
      connectDomains?: string[];
      resourceDomains?: string[];
    } = {};
    if (inlinedCsp.connectDomains) {
      csp.connectDomains = [...inlinedCsp.connectDomains];
    }
    if (inlinedCsp.resourceDomains) {
      csp.resourceDomains = [...inlinedCsp.resourceDomains];
    }
    return { url: new URL(sandboxUrl), csp };
  }, [sandboxUrl, inlinedCsp]);

  // Spec-canonical tools/call proxy. The iframe holds no MCP client
  // credential, so we relay through the agent backend's single
  // `POST /agent` endpoint with the `kind:'tool-call'` discriminator.
  const onCallTool = useCallback(
    async (
      params: CallToolRequest['params'],
      _extra: RequestHandlerExtra,
    ): Promise<CallToolResult> => {
      console.log('[ResourceFrame] tool_call', params);
      try {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(`${agentEndpoint}/agent`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            kind: 'tool-call',
            name: params.name,
            arguments: params.arguments ?? {},
          }),
        });
        if (!resp.ok) {
          console.warn('[ResourceFrame] relay non-2xx', resp.status);
          return { isError: true, content: [] };
        }
        const jsonRpc = (await resp.json()) as {
          readonly result?: CallToolResult;
          readonly error?: { readonly message?: string };
        };
        if (jsonRpc.error !== undefined) {
          console.warn('[ResourceFrame] relay error envelope', jsonRpc.error);
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: jsonRpc.error.message ?? 'relay error',
              },
            ],
          };
        }
        return jsonRpc.result ?? { content: [] };
      } catch (err) {
        console.warn('[ResourceFrame] relay transport error', err);
        return { isError: true, content: [] };
      }
    },
    [agentEndpoint, getAuthToken],
  );

  // The frontend's `onReadResource` callback shouldn't normally fire
  // any more — the library inlines the iframe HTML alongside every
  // tool result. Keep a defensive implementation that throws a
  // descriptive error, so any guest-initiated `resources/list-changed`
  // → re-read surfaces a clear message in dev tools rather than
  // hanging.
  const onReadResource = useCallback(
    async (
      params: ReadResourceRequest['params'],
      _extra: RequestHandlerExtra,
    ): Promise<ReadResourceResult> => {
      throw new Error(
        `[ResourceFrame] resources/read for ${params.uri} requested ` +
          `post-mount, but the host doesnt operate a relay endpoint. ` +
          `The agent-server library inlines resources on the FIRST tool ` +
          `result; guest-initiated re-reads need the host to add a custom ` +
          `relay (or upgrade to AppRenderer's built-in MCP client).`,
      );
    },
    [],
  );

  // No local `ui/message` parsing: the hook's `handleAppMessage`
  // joins the text + forwards the content block's `_meta` opaquely.
  // This sample stays ggui-protocol-agnostic — the agent-server backend
  // is the sole party that recognizes + guards `ai.ggui/*` keys.

  return (
    <div className="render">
      <div className="render-chrome">
        <span className="render-id">{shortLabel(item)}</span>
        <span className="render-action">{item.action}</span>
      </div>
      <div
        className="render-frame"
        style={fillContainer ? { flex: 1, minHeight: 0 } : undefined}
      >
        {html !== undefined ? (
          <AppRenderer
            key={item.resourceUri}
            toolName="ggui_render"
            sandbox={sandbox}
            html={html}
            onReadResource={onReadResource}
            onCallTool={onCallTool}
            {...(onAppMessage !== undefined ? { onMessage: onAppMessage } : {})}
            onError={(err) =>
              console.warn('[ResourceFrame] AppRenderer error', err)
            }
          />
        ) : (
          <div className="render-loading" aria-hidden="true">
            <p style={{ padding: 12, fontSize: 13, color: '#888' }}>
              Resource not inlined — the agent-server didn't pre-fetch the
              iframe HTML for <code>{item.resourceUri}</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function shortLabel(item: RenderRef): string {
  if (item.toolUseId !== undefined && item.toolUseId.length > 0) {
    return `#${item.toolUseId.slice(0, 12)}`;
  }
  const tail = item.resourceUri.split('/').filter(Boolean).pop() ?? '';
  return tail.length > 0 ? `#${tail.slice(0, 12)}` : '#render';
}
