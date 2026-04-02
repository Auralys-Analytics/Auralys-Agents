import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

const FETCH_PREFIX = "liquidityscan" as const
const HEALTH_PREFIX = "poolhealth" as const

const makeKey = (prefix: string, key: string): string => `${prefix}-${key}`

export interface LiquidityToolRegistry extends Record<string, Toolkit> {}

/**
 * Toolkit exposing liquidity-related actions:
 * - fetch raw pool data
 * - run health / risk analysis on a liquidity pool
 */
const registry = {
  [makeKey(FETCH_PREFIX, FETCH_POOL_DATA_KEY)]: toolkitBuilder(new FetchPoolDataAction()),
  [makeKey(HEALTH_PREFIX, ANALYZE_POOL_HEALTH_KEY)]: toolkitBuilder(new AnalyzePoolHealthAction()),
} as const satisfies LiquidityToolRegistry

export const LIQUIDITY_ANALYSIS_TOOLS: LiquidityToolRegistry = Object.freeze({ ...registry })

/** Optional helper to retrieve a tool by full key */
export const getLiquidityTool = (key: string): Toolkit | undefined =>
  LIQUIDITY_ANALYSIS_TOOLS[key]
