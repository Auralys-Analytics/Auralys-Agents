export interface PricePoint {
  timestamp: number
  priceUsd: number
}

export type TrendDirection = "upward" | "downward" | "neutral"

export interface TrendResult {
  startTime: number
  endTime: number
  trend: TrendDirection
  changePct: number
}

/**
 * Analyze a series of price points to determine overall trend segments
 * - Ensures chronological order
 * - Ignores tiny moves via minChangePct
 * - Requires a minimum run length before closing a segment
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5,
  minChangePct: number = 0.25
): TrendResult[] {
  const results: TrendResult[] = []
  if (!Array.isArray(points) || points.length < minSegmentLength) return results

  // sanitize: filter invalid points and sort chronologically if needed
  const series = points
    .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.priceUsd))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (series.length < minSegmentLength) return results

  const pct = (from: number, to: number) =>
    from !== 0 ? ((to - from) / from) * 100 : 0

  const dir = (from: number, to: number): 1 | -1 | 0 =>
    to > from ? 1 : to < from ? -1 : 0

  let segStart = 0
  let currentDir: 1 | -1 | 0 = 0

  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].priceUsd
    const curr = series[i].priceUsd
    const d = dir(prev, curr)

    // initialize direction when we first see movement
    if (currentDir === 0 && d !== 0) currentDir = d

    const isLast = i === series.length - 1
    const nextDir = !isLast ? dir(curr, series[i + 1].priceUsd) : 0
    const runLen = i - segStart + 1

    // close segment if:
    //  - we reached the end
    //  - direction flips
    //  - current direction is flat but next moves opposite the established run
    const shouldClose =
      (runLen >= minSegmentLength && (isLast || (currentDir !== 0 && nextDir !== currentDir && nextDir !== 0))) ||
      (isLast && runLen >= minSegmentLength)

    if (shouldClose) {
      const start = series[segStart]
      const end = series[i]
      const change = pct(start.priceUsd, end.priceUsd)
      const absChange = Math.abs(change)

      let trend: TrendDirection = "neutral"
      if (absChange >= minChangePct) {
        trend = change > 0 ? "upward" : change < 0 ? "downward" : "neutral"
      }

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend,
        changePct: Math.round(change * 100) / 100,
      })

      // start new segment at current index
      segStart = i
      currentDir = 0
    } else if (d !== 0) {
      // update current direction while the run is forming
      currentDir = currentDir === 0 ? d : currentDir
    }
  }

  return results
}
