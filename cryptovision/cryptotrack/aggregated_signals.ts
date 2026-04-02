import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: unknown
  lastTimestamp: number
}

export class SignalAggregator {
  private counts: Map<string, AggregatedSignal> = new Map()

  /** Process an incoming message and update aggregation */
  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg

    const prev = this.counts.get(topic) ?? {
      topic,
      count: 0,
      lastPayload: undefined,
      lastTimestamp: 0,
    }

    const updated: AggregatedSignal = {
      topic,
      count: prev.count + 1,
      lastPayload: payload,
      lastTimestamp: timestamp,
    }

    this.counts.set(topic, updated)
    return { ...updated }
  }

  /** Retrieve aggregation for a specific topic */
  getAggregated(topic: string): AggregatedSignal | undefined {
    const entry = this.counts.get(topic)
    return entry ? { ...entry } : undefined
  }

  /** Retrieve all current aggregations */
  getAllAggregated(): AggregatedSignal[] {
    return Array.from(this.counts.values()).map(e => ({ ...e }))
  }

  /** Clear all aggregation state */
  reset(): void {
    this.counts.clear()
  }

  /** List all tracked topics */
  listTopics(): string[] {
    return Array.from(this.counts.keys())
  }
}
