import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string              // where the iframe is hosted
  apiBase: string                // where token history is fetched from
  token: string
  refreshMs?: number             // optional polling interval
  targetOrigin?: string          // strict postMessage target; defaults to iframeUrl origin
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement
  private intervalId?: number
  private destroyed = false
  private readonly targetOrigin: string

  constructor(private readonly cfg: DataIframeConfig) {
    const url = new URL(cfg.iframeUrl)
    this.targetOrigin = cfg.targetOrigin ?? `${url.protocol}//${url.host}`
  }

  async init(): Promise<void> {
    if (this.destroyed) throw new Error("Instance has been destroyed")

    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    const iframe = document.createElement("iframe")
    iframe.src = this.cfg.iframeUrl
    iframe.style.border = "none"
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.referrerPolicy = "no-referrer"
    iframe.onload = () => this.postTokenData().catch(() => void 0)

    container.appendChild(iframe)
    this.iframe = iframe

    if (this.cfg.refreshMs && this.cfg.refreshMs > 0) {
      // use window.setInterval to get a numeric id in browsers
      this.intervalId = window.setInterval(
        () => this.postTokenData().catch(() => void 0),
        this.cfg.refreshMs
      )
    }
  }

  /** Tear down the embed and timers */
  destroy(): void {
    this.destroyed = true
    if (this.intervalId != null) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    if (this.iframe?.parentElement) {
      this.iframe.parentElement.removeChild(this.iframe)
    }
    this.iframe = undefined
  }

  private async postTokenData(): Promise<void> {
    if (this.destroyed) return
    const win = this.iframe?.contentWindow
    if (!win) return

    try {
      const { TokenDataFetcher } = await import("./tokenDataFetcher")
      const fetcher = new TokenDataFetcher(this.cfg.apiBase)
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)

      // message payload kept generic and vendor-neutral
      win.postMessage(
        { type: "TOKEN_DATA_STREAM", token: this.cfg.token, data },
        this.targetOrigin
      )
    } catch (err) {
      // avoid throwing to keep embed stable
      console.error("[TokenDataIframeEmbedder] Failed to fetch/post data:", err)
    }
  }
}
