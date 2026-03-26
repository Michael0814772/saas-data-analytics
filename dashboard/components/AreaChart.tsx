import { useMemo, useRef, useState } from "react"

type Point = {
  date: string
  value: number
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export const AreaChart = ({
  title,
  subtitle,
  points,
}: {
  title: string
  subtitle?: string
  points: Point[]
}) => {
  const width = 920
  const height = 240
  const paddingX = 18
  const paddingY = 18
  const plotW = width - paddingX * 2
  const plotH = height - paddingY * 2

  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const { minV, maxV, pathLine, pathArea, xFor, yFor } = useMemo(() => {
    const values = points.map((p) => p.value)
    const minV = values.length ? Math.min(...values) : 0
    const maxV = values.length ? Math.max(...values) : 0
    const range = maxV - minV || 1

    const xFor = (idx: number) => {
      if (points.length <= 1) {
        return paddingX
      }
      return paddingX + (idx / (points.length - 1)) * plotW
    }
    const yFor = (v: number) => {
      const t = (v - minV) / range
      return paddingY + (1 - t) * plotH
    }

    const line = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${xFor(idx)} ${yFor(p.value)}`)
      .join(" ")
    const area = points.length
      ? `${line} L ${xFor(points.length - 1)} ${paddingY + plotH} L ${xFor(0)} ${paddingY + plotH} Z`
      : ""

    return { minV, maxV, pathLine: line, pathArea: area, xFor, yFor }
  }, [points, plotW, plotH])

  const handleMove = (clientX: number) => {
    const el = wrapRef.current
    if (!el || points.length === 0) {
      return
    }
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left
    const t = clamp((x - 0) / rect.width, 0, 1)
    const idx = Math.round(t * (points.length - 1))
    setHoverIndex(clamp(idx, 0, points.length - 1))
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const hoveredX = hoverIndex !== null ? xFor(hoverIndex) : null
  const hoveredY = hoverIndex !== null ? yFor(points[hoverIndex].value) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        <div className="text-xs text-slate-500">
          min <span className="font-mono text-slate-700">{minV.toLocaleString()}</span>{" "}
          / max{" "}
          <span className="font-mono text-slate-700">{maxV.toLocaleString()}</span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative px-2 py-3"
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="img"
          aria-label={`${title} chart`}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
              <stop offset="80%" stopColor="#0f172a" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* grid */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = paddingY + (i / 4) * plotH
            return (
              <line
                key={i}
                x1={paddingX}
                x2={paddingX + plotW}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            )
          })}

          {points.length ? (
            <>
              <path d={pathArea} fill="url(#areaFill)" />
              <path d={pathLine} fill="none" stroke="#0f172a" strokeWidth="2.25" />
            </>
          ) : null}

          {hovered && hoveredX !== null && hoveredY !== null ? (
            <>
              <line
                x1={hoveredX}
                x2={hoveredX}
                y1={paddingY}
                y2={paddingY + plotH}
                stroke="#94a3b8"
                strokeWidth="1"
              />
              <circle cx={hoveredX} cy={hoveredY} r="5" fill="#0f172a" />
              <circle cx={hoveredX} cy={hoveredY} r="9" fill="#0f172a" opacity="0.12" />
            </>
          ) : null}
        </svg>

        {hovered ? (
          <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-700 shadow-sm backdrop-blur">
            <div className="font-mono text-[11px] text-slate-500">{hovered.date}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {hovered.value.toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

