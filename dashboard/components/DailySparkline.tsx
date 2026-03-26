type Point = { date: string; value: number }

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export const DailySparkline = ({
  points,
  height = 64,
}: {
  points: Point[]
  height?: number
}) => {
  const width = 320
  const padding = 8

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No data
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const xFor = (idx: number) => {
    if (points.length === 1) {
      return padding
    }
    return padding + (idx / (points.length - 1)) * (width - padding * 2)
  }

  const yFor = (v: number) => {
    const t = (v - minV) / range
    const y = padding + (1 - t) * (height - padding * 2)
    return clamp(y, padding, height - padding)
  }

  const d = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFor(idx)} ${yFor(p.value)}`)
    .join(" ")

  const last = points[points.length - 1]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-sm font-medium text-slate-800">Daily activity</div>
        <div className="text-xs text-slate-500">
          last: <span className="font-mono">{last.date}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-20 w-full"
        aria-label="Daily activity sparkline"
        role="img"
      >
        <path d={d} fill="none" stroke="#0f172a" strokeWidth="2" />
      </svg>
      <div className="mt-2 text-xs text-slate-500">
        min {minV.toLocaleString()} / max {maxV.toLocaleString()}
      </div>
    </div>
  )
}

