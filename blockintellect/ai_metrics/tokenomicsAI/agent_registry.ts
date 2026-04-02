import type { BaseAgentAction, AgentActionResponse } from "./baseAgentAction"
import { z } from "zod"

export interface AgentContext {
  apiEndpoint: string
  apiKey: string
}

/**
 * Central Agent: routes calls to registered actions.
 */
export class Agent {
  private readonly actions = new Map<string, BaseAgentAction<any, any, AgentContext>>()

  /** Register a new action */
  register<S, R>(action: BaseAgentAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" is already registered`)
    }
    this.actions.set(action.id, action)
  }

  /** Invoke a registered action by id */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<AgentActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) throw new Error(`Unknown action "${actionId}"`)

    // Validate payload against the action’s schema if available
    if ("schema" in action && action.schema) {
      const schema = action.schema as z.ZodTypeAny
      payload = schema.parse(payload)
    }

    return action.execute({ payload, context: ctx }) as Promise<AgentActionResponse<R>>
  }

  /** List all registered actions */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }
}
