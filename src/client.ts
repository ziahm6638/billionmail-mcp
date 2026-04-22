import { BillionMailResponse, LoginResponse } from "./types.js";

export class BillionMailClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private safePath: string | undefined;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private sessionCookie: string | null = null;

  constructor(baseUrl: string, username: string, password: string, safePath?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.username = username;
    this.password = password;
    this.safePath = safePath;
  }

  private async ensureSafePath(): Promise<void> {
    if (!this.safePath || this.sessionCookie) return;

    const res = await fetch(`${this.baseUrl}/${this.safePath}`, {
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/^([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
      }
    }
  }

  private getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = { ...extra };
    if (this.sessionCookie) {
      headers["Cookie"] = this.sessionCookie;
    }
    return headers;
  }

  private async login(): Promise<void> {
    await this.ensureSafePath();

    const res = await fetch(`${this.baseUrl}/api/login`, {
      method: "POST",
      headers: this.getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    const json = (await res.json()) as BillionMailResponse<LoginResponse>;

    if (!json.success || !json.data?.token) {
      throw new Error(`BillionMail login failed: ${json.msg || res.statusText}`);
    }

    this.token = json.data.token;
    this.refreshToken = json.data.refreshToken;
    this.tokenExpiry = Date.now() + (json.data.ttl - 60) * 1000;
  }

  private async ensureAuth(): Promise<string> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      if (this.refreshToken) {
        try {
          const res = await fetch(`${this.baseUrl}/api/refresh-token`, {
            method: "POST",
            headers: this.getHeaders({
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.refreshToken}`,
            }),
          });
          const json = (await res.json()) as BillionMailResponse<LoginResponse>;
          if (json.success && json.data?.token) {
            this.token = json.data.token;
            this.refreshToken = json.data.refreshToken;
            this.tokenExpiry = Date.now() + (json.data.ttl - 60) * 1000;
            return this.token;
          }
        } catch {
          // Fall through to full login
        }
      }
      await this.login();
    }
    return this.token!;
  }

  async get<T = any>(path: string, params?: Record<string, any>): Promise<BillionMailResponse<T>> {
    const token = await this.ensureAuth();
    const url = new URL(`${this.baseUrl}/api${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const res = await fetch(url.toString(), {
      headers: this.getHeaders({ Authorization: `Bearer ${token}` }),
    });
    return (await res.json()) as BillionMailResponse<T>;
  }

  async post<T = any>(path: string, body?: Record<string, any>): Promise<BillionMailResponse<T>> {
    const token = await this.ensureAuth();
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: "POST",
      headers: this.getHeaders({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }),
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json()) as BillionMailResponse<T>;
  }
}
