export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
}

/** Capabilities specific to Solana-focused agents */
export const SOLANA_AGENT_CAPABILITIES: Readonly<AgentCapabilities> = Object.freeze({
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
})

/** Flags controlling Solana agent response style */
export const SOLANA_AGENT_FLAGS: Readonly<AgentFlags> = Object.freeze({
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
})

/** Utility bundle for convenience */
export const SOLANA_AGENT_PROFILE = Object.freeze({
  capabilities: SOLANA_AGENT_CAPABILITIES,
  flags: SOLANA_AGENT_FLAGS,
})
