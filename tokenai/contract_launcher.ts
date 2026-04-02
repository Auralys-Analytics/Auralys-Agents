export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
}

export class LaunchNode {
  private readonly timeoutMs: number

  constructor(private readonly config: LaunchConfig) {
    if (!config.contractName) throw new Error("contractName is required")
    if (!config.deployEndpoint) throw new Error("deployEndpoint is required")
    this.timeoutMs = config.timeoutMs ?? 20_000
  }

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters } = this.config
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ contractName, parameters }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const json = await res.json().catch(() => ({}))

      if (
        json &&
        typeof json.contractAddress === "string" &&
        typeof json.txHash === "string"
      ) {
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
        }
      }

      return { success: false, error: "Invalid response format" }
    } catch (err: any) {
      return { success: false, error: err?.message ?? "Deployment failed" }
    } finally {
      clearTimeout(timer)
    }
  }
}
