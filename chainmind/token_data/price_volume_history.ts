export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

type HistoryQuery = {
  /** Unix seconds or ms accepted by your API (forwarded as-is) */
  from?: number
  to?: number
  limit?: number
}

export class TokenDataFetcher {
  private readonly timeoutMs: number

  constructor(private readonly apiBase: string, opts?: { timeoutMs?: number }) {
    if (!apiBase) throw new Error("apiBase is required")
    this.timeoutMs = opts?.timeoutMs ?? 15_000
  }

  /** Internal: fetch JSON with an AbortController-based timeout */
  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  /** Normalize incoming records into TokenDataPoint (ms timestamps, finite numbers) */
  private normalize(raw: any): TokenDataPoint | null {
    const secOrMs = Number(raw.time ?? raw.timestamp)
    const price = Number(raw.priceUsd ?? raw.price_usd ?? raw.price)
    const vol = Number(raw.volumeUsd ?? raw.volume_usd ?? raw.volume)
    const mcap = Number(raw.marketCapUsd ?? raw.market_cap_usd ?? raw.marketCap)

    if (!Number.isFinite(secOrMs) || !Number.isFinite(price) || !Number.isFinite(vol) || !Number.isFinite(mcap)) {
      return null
    }

    // Heuristic: if timestamp is < 10^12, assume seconds and convert to ms
    const tsMs = secOrMs < 1_000_000_000_000 ? secOrMs * 1000 : secOrMs

    return {
      timestamp: Math.trunc(tsMs),
      priceUsd: price,
      volumeUsd: vol,
      marketCapUsd: mcap,
    }
  }

  /**
   * Fetch an array of TokenDataPoint for the given token symbol
   * Default endpoint: `${apiBase}/tokens/${symbol}/history`
   * You can pass optional query params (from, to, limit)
   */
  async fetchHistory(symbol: string, q?: HistoryQuery): Promise<TokenDataPoint[]> {
    if (!symbol) throw new Error("symbol is required")

    const params = new URLSearchParams()
    if (q?.from != null) params.set("from", String(q.from))
    if (q?.to != null) params.set("to", String(q.to))
    if (q?.limit != null) params.set("limit", String(q.limit))

    const base = this.apiBase.replace(/\/+$/, "")
    const url = `${base}/tokens/${encodeURIComponent(symbol)}/history${params.toString() ? `?${params}` : ""}`

    const raw = await this.fetchJson<any[]>(url)
    const normalized = Array.isArray(raw) ? raw.map((r) => this.normalize(r)).filter(Boolean) as TokenDataPoint[] : []

    // sort chronologically and de-dup by timestamp
    normalized.sort((a, b) => a.timestamp - b.timestamp)
    const dedup: TokenDataPoint[] = []
    let lastTs = -Infinity
    for (const p of normalized) {
      if (p.timestamp !== lastTs) {
        dedup.push(p)
        lastTs = p.timestamp
      }
    }
    return dedup
  }
}
