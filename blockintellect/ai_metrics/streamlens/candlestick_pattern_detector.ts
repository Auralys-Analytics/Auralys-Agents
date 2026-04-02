import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  private readonly timeoutMs: number

  constructor(private readonly apiUrl: string, opts?: { timeoutMs?: number }) {
    if (!apiUrl) throw new Error("apiUrl is required")
    this.timeoutMs = opts?.timeoutMs ?? 10_000
  }

  /** Fetch recent OHLC candles using an explicit abortable timeout */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const url = `${this.apiUrl}/markets/${encodeURIComponent(symbol)}/candles?limit=${limit}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
      const data = (await res.json()) as Candle[]
      return Array.isArray(data) ? data.filter(this.isValidCandle) : []
    } finally {
      clearTimeout(timer)
    }
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isValidCandle = (c: any): c is Candle =>
    c &&
    Number.isFinite(c.timestamp) &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close)

  private range(c: Candle): number {
    const r = c.high - c.low
    return Number.isFinite(r) && r > 0 ? r : 0
  }

  private body(c: Candle): number {
    return Math.abs(c.close - c.open)
  }

  private isHammer(c: Candle): number {
    const r = this.range(c)
    if (r === 0) return 0
    const b = this.body(c)
    const lowerWick = Math.min(c.open, c.close) - c.low
    if (b <= 0) return 0
    const bodyToRange = b / r
    const wickToBody = lowerWick / b
    return wickToBody > 2 && bodyToRange < 0.3 ? Math.min(wickToBody / 3, 1) : 0
  }

  private isShootingStar(c: Candle): number {
    const r = this.range(c)
    if (r === 0) return 0
    const b = this.body(c)
    const upperWick = c.high - Math.max(c.open, c.close)
    if (b <= 0) return 0
    const bodyToRange = b / r
    const wickToBody = upperWick / b
    return wickToBody > 2 && bodyToRange < 0.3 ? Math.min(wickToBody / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const up = curr.close > curr.open
    const down = prev.close < prev.open
    const engulf = curr.close > Math.max(prev.open, prev.close) && curr.open < Math.min(prev.open, prev.close)
    if (!(up && down && engulf)) return 0
    const bodyPrev = this.body(prev)
    const bodyCurr = this.body(curr)
    if (bodyCurr <= 0) return 0
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const down = curr.close < curr.open
    const up = prev.close > prev.open
    const engulf = curr.open > Math.max(prev.open, prev.close) && curr.close < Math.min(prev.open, prev.close)
    if (!(down && up && engulf)) return 0
    const bodyPrev = this.body(prev)
    const bodyCurr = this.body(curr)
    if (bodyCurr <= 0) return 0
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle): number {
    const r = this.range(c)
    if (r === 0) return 0
    const b = this.body(c)
    const ratio = b / r
    return ratio < 0.1 ? Math.max(1 - ratio * 10, 0) : 0
  }

  /* ------------------------- Public API --------------------------- */

  /**
   * Scan a series of candles and emit pattern signals
   * @param candles chronological array (oldest -> newest)
   * @param minConfidence threshold in [0,1] to include a signal
   */
  scan(candles: Candle[], minConfidence = 0.35): PatternSignal[] {
    const out: PatternSignal[] = []
    if (!Array.isArray(candles) || candles.length === 0) return out

    const pushIf = (timestamp: number, pattern: CandlestickPattern, conf: number) => {
      if (conf >= minConfidence) out.push({ timestamp, pattern, confidence: Number(conf.toFixed(3)) })
    }

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      if (!this.isValidCandle(c)) continue

      // single-candle patterns
      pushIf(c.timestamp, "Hammer", this.isHammer(c))
      pushIf(c.timestamp, "ShootingStar", this.isShootingStar(c))
      pushIf(c.timestamp, "Doji", this.isDoji(c))

      // two-candle patterns (needs previous)
      if (i > 0) {
        const p = candles[i - 1]
        if (this.isValidCandle(p)) {
          pushIf(c.timestamp, "BullishEngulfing", this.isBullishEngulfing(p, c))
          pushIf(c.timestamp, "BearishEngulfing", this.isBearishEngulfing(p, c))
        }
      }
    }
    return out
  }

  /**
   * Convenience: fetch candles for a symbol and run scan
   */
  async detect(symbol: string, limit = 100, minConfidence = 0.35): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    // Expect chronological series; if API returns newest-first, reverse safely
    if (candles.length >= 2 && candles[0].timestamp > candles[candles.length - 1].timestamp) {
      candles.reverse()
    }
    return this.scan(candles, minConfidence)
  }
}
