import type { Signal } from "./SignalApiClient"

/**
 * Processes raw signals into actionable events.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    if (!Array.isArray(signals)) return []
    return signals.filter(
      s =>
        s &&
        typeof s.type === "string" &&
        s.type === type &&
        Number.isFinite(s.timestamp) &&
        s.timestamp > sinceTimestamp
    )
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   * @param caseInsensitive If true, treats types case-insensitively
   */
  aggregateByType(signals: Signal[], caseInsensitive = false): Record<string, number> {
    return (signals ?? []).reduce((acc, s) => {
      if (!s || typeof s.type !== "string") return acc
      const key = caseInsensitive ? s.type.toLowerCase() : s.type
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const ts = Number(signal.timestamp)
    const time = Number.isFinite(ts) ? new Date(ts).toISOString() : "invalid-time"
    const payload = JSON.stringify(signal.payload ?? {}, null, 2)
    return `[${time}] ${signal.type.toUpperCase()}: ${payload}`
  }

  /**
   * Summarize multiple signals in chronological order.
   */
  summarizeBatch(signals: Signal[]): string {
    return (signals ?? [])
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(s => this.summarize(s))
      .join("\n")
  }
}
