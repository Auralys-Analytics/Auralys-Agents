export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
}

/**
 * Detects spikes in trading volume compared to a rolling average window
 * - Ensures chronological order
 * - Filters invalid points
 * - Debounces consecutive spikes in adjacent candles (optional)
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0,
  opts?: {
    /** Minimum absolute volume to consider a spike */
    minVolumeUsd?: number
    /** Minimum index gap between detected spikes to reduce clustering */
    minGap?: number
  }
): SpikeEvent[] {
  const events: SpikeEvent[] = []
  if (!Array.isArray(points) || windowSize <= 0) return events

  const minVolumeUsd = opts?.minVolumeUsd ?? 0
  const minGap = Math.max(0, opts?.minGap ?? 0)

  // sanitize: keep only finite points and sort chronologically
  const series = points
    .filter(
      p =>
        p &&
        Number.isFinite(p.timestamp) &&
        Number.isFinite(p.volumeUsd) &&
        p.volumeUsd >= 0
    )
    .sort((a, b) => a.timestamp - b.timestamp)

  if (series.length <= windowSize) return events

  // precompute volumes for speed
  const volumes = series.map(p => p.volumeUsd)

  // rolling sum for O(n) SMA
  let rollingSum = 0
  for (let i = 0; i < windowSize; i++) rollingSum += volumes[i]

  let lastSpikeIndex = -Infinity

  for (let i = windowSize; i < volumes.length; i++) {
    const curr = volumes[i]
    rollingSum += curr
    const avg = rollingSum / (windowSize + 1) // include current for smoother baseline

    // compute ratio against baseline excluding current to avoid self-inflation
    const baseline = (rollingSum - curr) / windowSize
    const ratio = baseline > 0 ? curr / baseline : Infinity

    // prepare next window (slide window: remove i - windowSize)
    rollingSum -= volumes[i - windowSize]

    // basic checks
    if (!Number.isFinite(ratio)) continue
    if (curr < minVolumeUsd) continue
    if (ratio < spikeThreshold) continue
    if (i - lastSpikeIndex < minGap) continue

    events.push({
      timestamp: series[i].timestamp,
      volume: curr,
      spikeRatio: Math.round(ratio * 100) / 100,
    })
    lastSpikeIndex = i
  }

  return events
}
