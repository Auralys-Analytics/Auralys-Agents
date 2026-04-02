export interface PatternMatch {
  index: number
  window: number
  average: number
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  if (!Array.isArray(volumes) || volumes.length === 0) return []
  if (windowSize <= 0 || threshold < 0) throw new Error("Invalid parameters")

  const matches: PatternMatch[] = []
  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    if (avg >= threshold) {
      matches.push({
        index: i,
        window: windowSize,
        average: Number(avg.toFixed(4)),
      })
    }
  }
  return matches
}
