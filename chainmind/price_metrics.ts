export interface PricePoint {
  timestamp: number
  price: number
}

export interface TokenMetrics {
  averagePrice: number
  volatility: number   // standard deviation
  maxPrice: number
  minPrice: number
}

export class TokenAnalysisCalculator {
  private readonly series: PricePoint[]
  private readonly n: number

  constructor(data: PricePoint[]) {
    // keep only finite points and sort chronologically
    this.series = (Array.isArray(data) ? data : [])
      .filter(p => Number.isFinite(p.timestamp) && Number.isFinite(p.price))
      .sort((a, b) => a.timestamp - b.timestamp)
    this.n = this.series.length
  }

  getAveragePrice(): number {
    if (this.n === 0) return 0
    const sum = this.series.reduce((acc, p) => acc + p.price, 0)
    return sum / this.n
  }

  /**
   * Standard deviation of prices
   * @param useSample if true, uses n-1 in the denominator (sample std dev)
   */
  getVolatility(useSample: boolean = false): number {
    if (this.n === 0) return 0
    const mean = this.getAveragePrice()
    const varianceNumer = this.series.reduce((acc, p) => {
      const d = p.price - mean
      return acc + d * d
    }, 0)
    const denom = useSample ? Math.max(this.n - 1, 1) : this.n
    return Math.sqrt(varianceNumer / denom)
  }

  getMaxPrice(): number {
    if (this.n === 0) return 0
    let max = -Infinity
    for (const p of this.series) if (p.price > max) max = p.price
    return Number.isFinite(max) ? max : 0
  }

  getMinPrice(): number {
    if (this.n === 0) return 0
    let min = Infinity
    for (const p of this.series) if (p.price < min) min = p.price
    return Number.isFinite(min) ? min : 0
  }

  computeMetrics(opts?: { sampleVolatility?: boolean }): TokenMetrics {
    return {
      averagePrice: this.getAveragePrice(),
      volatility: this.getVolatility(!!opts?.sampleVolatility),
      maxPrice: this.getMaxPrice(),
      minPrice: this.getMinPrice(),
    }
  }
}
