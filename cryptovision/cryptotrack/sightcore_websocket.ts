export interface SightCoreConfig {
  url: string
  protocols?: string[]
  reconnectIntervalMs?: number
  autoReconnect?: boolean
}

export interface SightCoreMessage {
  topic: string
  payload: unknown
  timestamp: number
}

export class SightCoreWebSocket {
  private socket?: WebSocket
  private readonly url: string
  private readonly protocols?: string[]
  private readonly reconnectInterval: number
  private readonly autoReconnect: boolean
  private manualClose = false

  constructor(config: SightCoreConfig) {
    if (!config.url) throw new Error("WebSocket URL is required")
    this.url = config.url
    this.protocols = config.protocols
    this.reconnectInterval = config.reconnectIntervalMs ?? 5000
    this.autoReconnect = config.autoReconnect ?? true
  }

  connect(
    onMessage: (msg: SightCoreMessage) => void,
    onOpen?: () => void,
    onClose?: () => void
  ): void {
    this.manualClose = false
    this.socket = this.protocols
      ? new WebSocket(this.url, this.protocols)
      : new WebSocket(this.url)

    this.socket.onopen = () => {
      onOpen?.()
    }

    this.socket.onmessage = event => {
      try {
        const msg = JSON.parse(event.data) as SightCoreMessage
        if (msg && typeof msg.topic === "string" && typeof msg.timestamp === "number") {
          onMessage(msg)
        }
      } catch {
        // ignore invalid messages
      }
    }

    this.socket.onclose = () => {
      onClose?.()
      if (this.autoReconnect && !this.manualClose) {
        setTimeout(
          () => this.connect(onMessage, onOpen, onClose),
          this.reconnectInterval
        )
      }
    }

    this.socket.onerror = () => {
      this.socket?.close()
    }
  }

  /** Send a message with topic + payload */
  send(topic: string, payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const msg: SightCoreMessage = {
        topic,
        payload,
        timestamp: Date.now(),
      }
      this.socket.send(JSON.stringify(msg))
    }
  }

  /** Close connection explicitly (disables auto-reconnect) */
  disconnect(): void {
    this.manualClose = true
    this.socket?.close()
    this.socket = undefined
  }

  /** Get current readyState */
  get readyState(): number | undefined {
    return this.socket?.readyState
  }
}
