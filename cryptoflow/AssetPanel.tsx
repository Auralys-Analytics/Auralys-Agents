import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
}

type FetchState = "idle" | "loading" | "error" | "success"

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [state, setState] = useState<FetchState>("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    async function fetchInfo() {
      setState("loading")
      setError(null)
      try {
        const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as AssetOverview
        if (isMounted) {
          setInfo(json)
          setState("success")
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message ?? "Unknown error")
          setState("error")
        }
      }
    }
    fetchInfo()
    return () => {
      isMounted = false
    }
  }, [assetId])

  if (state === "loading" || state === "idle") {
    return <div>Loading asset overview...</div>
  }

  if (state === "error") {
    return <div className="text-red-600">Failed to load asset data: {error}</div>
  }

  if (!info) {
    return <div>No data available</div>
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <p><strong>ID:</strong> {assetId}</p>
      <p><strong>Name:</strong> {info.name}</p>
      <p><strong>Price (USD):</strong> ${info.priceUsd.toFixed(2)}</p>
      <p><strong>Circulating Supply:</strong> {info.supply.toLocaleString()}</p>
      <p><strong>Holders:</strong> {info.holders.toLocaleString()}</p>
    </div>
  )
}

export default AssetOverviewPanel
