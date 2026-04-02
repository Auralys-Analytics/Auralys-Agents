export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

type ClientOptions = {
  timeoutMs?: number
}

/**
 * Simple HTTP client for fetching signals from an API.
 */
export class SignalApiClient {
  private readonly base: string
  private readonly timeoutMs: number

  constructor(private baseUrl: string, private apiKey?: string, opts?: ClientOptions) {
    if (!baseUrl) throw new Error("baseUrl is required")
    this.base = baseUrl.replace(/\/+$/, "")
    this.timeoutMs = opts?.timeoutMs ?? 15_000
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async request<T>(path: string): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.base}${path}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: controller.signal,
      })
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
      const data = (await res.json()) as T
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Request failed" }
    } finally {
      clearTimeout(timer)
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    const res = await this.request<unknown>("/signals")
    if (!res.success) return res as ApiResponse<Signal[]>

    const arr = Array.isArray(res.data) ? res.data : []
    const parsed = arr.filter(this.isSignal) as Signal[]
    return { success: true, data: parsed }
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    if (!id) return { success: false, error: "id is required" }
    const res = await this.request<unknown>(`/signals/${encodeURIComponent(id)}`)
    if (!res.success) return res as ApiResponse<Signal>
    return this.isSignal(res.data) ? { success: true, data: res.data } : { success: false, error: "Invalid signal shape" }
  }

  private isSignal(v: any): v is Signal {
    return (
      v &&
      typeof v.id === "string" &&
      typeof v.type === "string" &&
      Number.isFinite(v.timestamp) &&
      v.payload !== null &&
      typeof v.payload === "object"
    )
  }
}
