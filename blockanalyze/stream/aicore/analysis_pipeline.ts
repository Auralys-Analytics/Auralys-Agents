(async () => {
  const startedAt = Date.now()

  try {
    // 1) Analyze token activity
    const activityAnalyzer = new TokenActivityAnalyzer("https://solana.rpc")
    const records = await activityAnalyzer.analyzeActivity("MintPubkeyHere", 20)

    // 2) Analyze orderbook depth
    const depthAnalyzer = new TokenDepthAnalyzer("https://dex.api", "MarketPubkeyHere")
    const depthMetrics = await depthAnalyzer.analyze(30)

    // 3) Detect volume patterns
    const volumes = records.map(r => r.amount || 0)
    const patterns = detectVolumePatterns(volumes, 5, 100)

    // 4) Execute a custom task
    const engine = new ExecutionEngine()
    engine.register("report", async (params: { records: unknown[] }) => ({ recordCount: params.records.length }))
    engine.enqueue("task1", "report", { records })
    const taskResults = await engine.runAll()

    // 5) Sign and verify results
    const signer = new SigningEngine()
    const payload = JSON.stringify({ depthMetrics, patterns, taskResults })
    const signature = await signer.sign(payload)
    const signatureValid = await signer.verify(payload, signature)

    // 6) Structured output
    console.log(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
          recordsCount: records.length,
          depthMetrics,
          patternsCount: patterns.length,
          taskResults,
          signature,
          signatureValid,
        },
        null,
        2
      )
    )
  } catch (err: any) {
    console.error(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          error: err?.message ?? String(err),
        },
        null,
        2
      )
    )
    process.exitCode = 1
  }
})()
