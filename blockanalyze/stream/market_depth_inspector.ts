/**
 * On-chain orderbook depth analyzer
 * - Computes average bid/ask depth and spread
 * - Uses JSON fetch from RPC endpoint
 */

export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  bidCount: number
  askCount: number
}

export class TokenDepthAnalyzer {
  constructor(private rpcEndpoint: string, private marketId: string) {
    if (!rpcEndpoint || !marketId) {
      throw new Error("Both rpcEndpoint and marketId are required")
    }
  }

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url = `${this.rpcEndpoint}/orderbook/${this.marketId}?depth=${depth}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status}`)
    const json = (await res.json()) as { bids: Order[]; asks: Order[] }

    return {
      bids: Array.isArray(json.bids) ? json.bids : [],
      asks: Array.isArray(json.asks) ? json.asks : [],
    }
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    const avg = (arr: Order[]) =>
      arr.length === 0 ? 0 : arr.reduce((s, o) => s + o.size, 0) / arr.length

    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0

    return {
      averageBidDepth: avg(bids),
      averageAskDepth: avg(asks),
      spread: bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0,
      bidCount: bids.length,
      askCount: asks.length,
    }
  }
}
