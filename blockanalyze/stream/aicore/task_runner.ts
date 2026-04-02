/**
 * Simple task executor: registers handlers and runs queued tasks.
 */
type Handler = (params: any) => Promise<any>

type Task = { id: string; type: string; params: any }
type TaskResult = { id: string; result?: any; error?: string }

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Task[] = []

  register(type: string, handler: Handler): void {
    if (this.handlers[type]) throw new Error(`Handler already registered for type "${type}"`)
    this.handlers[type] = handler
  }

  unregister(type: string): void {
    delete this.handlers[type]
  }

  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) throw new Error(`No handler for task type "${type}"`)
    this.queue.push({ id, type, params })
  }

  listPending(): Array<{ id: string; type: string }> {
    return this.queue.map(({ id, type }) => ({ id, type }))
  }

  clearQueue(): void {
    this.queue = []
  }

  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      try {
        const data = await this.handlers[task.type](task.params)
        results.push({ id: task.id, result: data })
      } catch (err: any) {
        results.push({ id: task.id, error: err?.message ?? "Unknown error" })
      }
    }
    return results
  }

  /** Run up to `n` tasks in parallel (defaults to sequential when n=1). */
  async runBatch(concurrency = 1): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    const workers = Math.max(1, Math.floor(concurrency))
    const runWorker = async () => {
      while (this.queue.length) {
        const task = this.queue.shift()!
        try {
          const data = await this.handlers[task.type](task.params)
          results.push({ id: task.id, result: data })
        } catch (err: any) {
          results.push({ id: task.id, error: err?.message ?? "Unknown error" })
        }
      }
    }
    await Promise.all(Array.from({ length: workers }, runWorker))
    return results
  }
}
