/**
 * ProductBoard API v2 HTTP client.
 * Handles auth, base URL, error normalisation, and rate-limit headers.
 */

const BASE_URL = 'https://api.productboard.com/v2';

export class ProductBoardClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    options: { query?: Record<string, string | string[] | boolean | undefined>; body?: unknown } = {}
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(`${key}[]`, v);
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`ProductBoard API error ${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T = unknown>(path: string, query?: Record<string, string | string[] | boolean | undefined>) {
    return this.request<T>('GET', path, { query });
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body });
  }

  delete<T = unknown>(path: string) {
    return this.request<T>('DELETE', path);
  }
}
