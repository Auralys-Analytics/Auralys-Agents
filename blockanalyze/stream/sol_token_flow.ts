/**
 * On-chain token activity analyzer (Solana JSON-RPC, no mock data)
 * - Uses real JSON-RPC methods: getSignaturesForAddress, getTransaction
 * - Computes token balance deltas per transaction to infer transfers
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
  mint: string
}

type JsonRpcParams = any[] | Record<string, unknown>
interface JsonRpcResponse<T> {
  jsonrpc: "2.0"
  id: string | number | null
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

interface TokenBalanceInfo {
  accountIndex: number
  mint: string
  owner?: string | null
  uiTokenAmount: { uiAmount: number | null }
}

interface ParsedTransactionMeta {
  preTokenBalances?: TokenBalanceInfo[]
  postTokenBalances?: TokenBalanceInfo[]
}

interface ParsedTransaction {
  blockTime?: number
  meta: ParsedTransactionMeta | null
}

export class TokenActivityAnalyzer {
  private timeoutMs: number
  private commitment: "confirmed" | "finalized" | "processed"

  constructor(
    private rpcEndpoint: string,
    opts?: { timeoutMs?: number; commitment?: "confirmed" | "finalized" | "processed" }
  ) {
    if (!rpcEndpoint || typeof rpcEndpoint !== "string") {
      throw new Error("rpcEndpoint must be a non-empty string")
    }
    this.timeoutMs = opts?.timeoutMs ?? 20_000
    this.commitment = opts?.commitment ?? "confirmed"
  }

  private async rpc<T>(method: string, params: JsonRpcParams): Promise<T> {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as JsonRpcResponse<T>
      if (json.error) throw new Error(`RPC ${json.error.code}: ${json.error.message}`)
      if (json.result === undefined) throw new Error("RPC result is undefined")
      return json.result
    } finally {
      clearTimeout(t)
    }
  }

  async fetchRecentSignatures(address: string, limit = 100): Promise<string[]> {
    const result = await this.rpc<Array<{ signature: string }>>(
      "getSignaturesForAddress",
      [address, { limit, commitment: this.commitment }]
    )
    return result.map((e) => e.signature)
  }

  private async fetchParsedTransaction(signature: string): Promise<ParsedTransaction | null> {
    return await this.rpc<ParsedTransaction | null>("getTransaction", [
      signature,
      { commitment: this.commitment, maxSupportedTransactionVersion: 0 },
    ])
  }

  async analyzeActivity(address: string, limit = 50): Promise<ActivityRecord[]> {
    const sigs = await this.fetchRecentSignatures(address, limit)
    const out: ActivityRecord[] = []

    for (const sig of sigs) {
      const tx = await this.fetchParsedTransaction(sig)
      if (!tx || !tx.meta) continue

      const pre = tx.meta.preTokenBalances ?? []
      const post = tx.meta.postTokenBalances ?? []

      const key = (b: TokenBalanceInfo) => `${b.accountIndex}:${b.mint}`
      const preMap = new Map<string, TokenBalanceInfo>()
      for (const b of pre) preMap.set(key(b), b)

      for (const p of post) {
        const q = preMap.get(key(p))
        const postAmt = p.uiTokenAmount.uiAmount ?? 0
        const preAmt = q?.uiTokenAmount.uiAmount ?? 0
        const delta = postAmt - preAmt

        if (delta !== 0) {
          const when = (tx.blockTime ?? 0) * 1000
          out.push({
            timestamp: when,
            signature: sig,
            source: delta > 0 ? q?.owner ?? "unknown" : p.owner ?? "unknown",
            destination: delta > 0 ? p.owner ?? "unknown" : q?.owner ?? "unknown",
            amount: Math.abs(delta),
            mint: p.mint,
          })
        }
      }
    }
    return out
  }
}
