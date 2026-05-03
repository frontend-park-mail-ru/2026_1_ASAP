import { vi } from 'vitest';

export interface MockFetchResponse {
    ok?: boolean;
    status?: number;
    json?: unknown;
    headers?: Record<string, string>;
    throws?: Error;
}

/**
 * Создаёт ответ-заглушку, совместимый с fetch Response API
 * (поддерживает .ok, .status, .json(), .headers.get()).
 */
export function makeResponse(opts: MockFetchResponse): Response {
    const status = opts.status ?? (opts.ok === false ? 500 : 200);
    const ok = opts.ok ?? (status >= 200 && status < 300);
    const headers = new Headers(opts.headers ?? {});
    return {
        ok,
        status,
        headers,
        json: async () => {
            if (opts.json === undefined) {
                throw new SyntaxError('Unexpected end of JSON input');
            }
            return opts.json;
        },
        text: async () => (typeof opts.json === 'string' ? opts.json : JSON.stringify(opts.json ?? '')),
    } as unknown as Response;
}

/**
 * Создаёт мок fetch, который возвращает ответы по очереди (sequential queue).
 * Если queue пустая — кидает "Unexpected fetch call".
 */
export function mockFetchSequence(responses: MockFetchResponse[]): ReturnType<typeof vi.fn> {
    const queue = [...responses];
    const fn = vi.fn(async (_url: string | URL, _init?: RequestInit) => {
        const next = queue.shift();
        if (!next) {
            throw new Error(`Unexpected fetch call: ${_url}`);
        }
        if (next.throws) throw next.throws;
        return makeResponse(next);
    });
    vi.stubGlobal('fetch', fn);
    return fn;
}

/**
 * Создаёт мок fetch с роутингом по URL+method.
 * routes — массив { match, response } где match — substring URL или RegExp, или функция.
 */
export interface MockRoute {
    match: string | RegExp | ((url: string, init?: RequestInit) => boolean);
    method?: string;
    response: MockFetchResponse;
}

export function mockFetchRoutes(routes: MockRoute[]): ReturnType<typeof vi.fn> {
    const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url.toString();
        const method = (init?.method ?? 'GET').toUpperCase();
        for (const r of routes) {
            const methodOk = !r.method || r.method.toUpperCase() === method;
            if (!methodOk) continue;
            const matched =
                typeof r.match === 'string'
                    ? u.includes(r.match)
                    : r.match instanceof RegExp
                        ? r.match.test(u)
                        : r.match(u, init);
            if (matched) {
                if (r.response.throws) throw r.response.throws;
                return makeResponse(r.response);
            }
        }
        throw new Error(`Unexpected fetch: ${method} ${u}`);
    });
    vi.stubGlobal('fetch', fn);
    return fn;
}

/**
 * Возвращает аргументы вызова fetch № index в виде { url, method, body }
 */
export function getFetchCall(fn: ReturnType<typeof vi.fn>, index = 0): { url: string; method: string; body: any; headers: Headers } {
    const call = fn.mock.calls[index];
    if (!call) throw new Error(`fetch call #${index} not found`);
    const [url, init] = call as [string, RequestInit | undefined];
    let body: any = init?.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { /* keep raw */ }
    }
    return {
        url: String(url),
        method: (init?.method ?? 'GET').toUpperCase(),
        body,
        headers: new Headers(init?.headers ?? {}),
    };
}
