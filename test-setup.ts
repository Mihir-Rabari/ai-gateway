/**
 * Shared test setup for AI Gateway backend services.
 *
 * Exports common mock factories for Redis, PostgreSQL (pg), Kafka, and HTTP
 * clients so that each service test suite can build consistent, behavior-rich
 * mocks without re-implementing the plumbing.
 *
 * Usage in a vitest test file:
 *
 *   import { createRedisMock, createPgMock, createKafkaMock, createFetchMock }
 *     from '../../test-setup.js';
 *
 * All factories return plain objects typed `as unknown as <Real>` so they can
 * be passed directly into service constructors that expect real clients.
 */

// ───────────────────────────────────────────────────────────────────────────
// Types (structural — only what the services actually call)
// ───────────────────────────────────────────────────────────────────────────

export type RedisMock = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: unknown[]) => Promise<'OK'>;
  setex: (key: string, ttl: number, value: string) => Promise<'OK'>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  scan: (cursor: string, ...args: unknown[]) => Promise<[string, string[]]>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, ttl: number) => Promise<number>;
  eval: (script: string, numKeys: number, ...args: unknown[]) => Promise<unknown>;
  mget: (...keys: string[]) => Promise<(string | null)[]>;
  exists: (...keys: string[]) => Promise<number>;
};

export type PgMock = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  connect: () => Promise<PgClientMock>;
};

export type PgClientMock = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

export type KafkaMock = {
  publish: (topic: string, msg: object) => Promise<void>;
  disconnect: () => Promise<void>;
};

export type FetchMock = (
  url: string | URL | globalThis.Request,
  init?: RequestInit,
) => Promise<Response>;

// ───────────────────────────────────────────────────────────────────────────
// Redis mock factory
//
// Backed by an in-memory Map so tests can assert on state changes (set/del/scan)
// exactly like a real Redis instance. Supports the subset of commands used by
// the services: get, set, setex, del, keys, scan, incr, expire, eval, mget,
// exists.
// ───────────────────────────────────────────────────────────────────────────

export function createRedisMock(initialState: Record<string, string> = {}): RedisMock {
  const store = new Map<string, string>(Object.entries(initialState));

  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string, ..._args: unknown[]) => {
      store.set(key, value);
      return 'OK';
    },
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) if (store.delete(key)) count++;
      return count;
    },
    keys: async (pattern: string) => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return [...store.keys()].filter((k) => regex.test(k));
    },
    scan: async (_cursor: string, ...args: unknown[]) => {
      // Redis SCAN signature: SCAN cursor MATCH pattern COUNT n
      // args = [cursor, 'MATCH', pattern, 'COUNT', count]
      const pattern = typeof args[1] === 'string' ? args[1] : '*';
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      const all = [...store.keys()].filter((k) => regex.test(k));
      // Simple non-paged implementation: return everything in one batch.
      return ['0', all] as [string, string[]];
    },
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    expire: async (_key: string, _ttl: number) => 1,
    eval: async (script: string, _numKeys: number, ...args: unknown[]) => {
      // Minimal Lua interpreter for the two scripts used in the codebase:
      //  1. SET-if-not-exists (credit lock): returns 1 if set, 0 if exists.
      //  2. INCR-with-EXPIRE (rate limit / failure counter): returns count.
      const key = String(args[0]);
      if (script.includes('EXISTS')) {
        if (store.has(key)) return 0;
        if (typeof args[1] === 'string') store.set(key, args[1]);
        return 1;
      }
      if (script.includes('INCR')) {
        const next = Number(store.get(key) ?? '0') + 1;
        store.set(key, String(next));
        return next;
      }
      return 1;
    },
    mget: async (...keys: string[]) => keys.map((k) => store.get(k) ?? null),
    exists: async (...keys: string[]) => keys.filter((k) => store.has(k)).length,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// PostgreSQL (pg) mock factory
//
// `queryResults` maps SQL substrings to resolved values, letting tests stub
// individual queries (e.g. SELECT EXISTS vs INSERT) with precise control.
// `connect()` returns a transactional client mock that shares the same
// query dispatcher.
// ───────────────────────────────────────────────────────────────────────────

export interface PgMockOptions {
  /** Map of SQL-substring → result. The first matching substring wins. */
  queryResults?: Record<string, { rows: unknown[]; rowCount?: number }>;
  /** Default result when no substring matches. */
  defaultResult?: { rows: unknown[]; rowCount?: number };
}

function dispatchQuery(
  text: string,
  queryResults: Record<string, { rows: unknown[]; rowCount?: number }>,
  defaultResult: { rows: unknown[]; rowCount?: number },
): { rows: unknown[]; rowCount: number } {
  for (const [substr, result] of Object.entries(queryResults)) {
    if (text.includes(substr)) {
      return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
    }
  }
  return { rows: defaultResult.rows, rowCount: defaultResult.rowCount ?? defaultResult.rows.length };
}

export function createPgMock(options: PgMockOptions = {}): PgMock {
  const queryResults = options.queryResults ?? {};
  const defaultResult = options.defaultResult ?? { rows: [], rowCount: 0 };

  const client: PgClientMock = {
    query: async (text: string) => dispatchQuery(text, queryResults, defaultResult),
    release: () => {},
  };

  return {
    query: async (text: string) => dispatchQuery(text, queryResults, defaultResult),
    connect: async () => client,
  };
}

/**
 * Create a pg mock where each sequential `query` call returns the next entry in
 * `sequence`. Useful when order matters (e.g. emailExists → create user).
 */
export function createPgSequenceMock(
  sequence: { rows: unknown[]; rowCount?: number }[],
): PgMock {
  let idx = 0;
  const clientQuery = async () => {
    const result = sequence[Math.min(idx, sequence.length - 1)];
    idx++;
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  };
  const client: PgClientMock = { query: clientQuery, release: () => {} };
  return {
    query: clientQuery,
    connect: async () => client,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Kafka mock factory
// ───────────────────────────────────────────────────────────────────────────

export function createKafkaMock(): KafkaMock & {
  /** Spy on published messages for assertions. */
  _messages: { topic: string; msg: object }[];
} {
  const _messages: { topic: string; msg: object }[] = [];
  return {
    publish: async (topic: string, msg: object) => {
      _messages.push({ topic, msg });
    },
    disconnect: async () => {},
    _messages,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// HTTP (fetch) mock factory
//
// Routes by URL substring to a handler function. Each handler receives the
// init object and returns a Response-like object. Provides sensible defaults
// for the internal endpoints used across services.
// ───────────────────────────────────────────────────────────────────────────

export type FetchRouteHandler = (init?: RequestInit) => {
  status?: number;
  ok?: boolean;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
  body?: ReadableStream<Uint8Array> | null;
};

export interface FetchMockOptions {
  routes?: Record<string, FetchRouteHandler>;
  /** Default response when no route matches. */
  defaultResponse?: () => {
    status?: number;
    ok?: boolean;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };
}

export function createFetchMock(options: FetchMockOptions = {}): FetchMock {
  const routes = options.routes ?? {};
  return (async (url: string | URL | globalThis.Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : String(url);
    for (const [substr, handler] of Object.entries(routes)) {
      if (urlString.includes(substr)) {
        const r = handler(init);
        const status = r.status ?? 200;
        return {
          ok: r.ok ?? (status >= 200 && status < 300),
          status,
          json: r.json ?? (async () => ({})),
          text: r.text ?? (async () => ''),
          body: r.body ?? null,
        } as Response;
      }
    }
    const d = options.defaultResponse?.() ?? {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    };
    return {
      ok: d.ok ?? true,
      status: d.status ?? 200,
      json: d.json ?? (async () => ({})),
      text: d.text ?? (async () => ''),
      body: null,
    } as Response;
  }) as FetchMock;
}

/**
 * Create a minimal ReadableStream from an array of string chunks. Used to mock
 * streaming responses (SSE) for the routing/gateway services.
 */
export function createReadableStreamMock(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
