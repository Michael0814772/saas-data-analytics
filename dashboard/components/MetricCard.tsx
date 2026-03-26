type MetricCardProps = {
  label: string
  value: string
  delta?: { label: string; tone: "up" | "down" | "neutral" }
  hint?: string
}

export const MetricCard = ({ label, value, delta, hint }: MetricCardProps) => {
  const deltaClass =
    delta?.tone === "up"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : delta?.tone === "down"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-50 text-slate-700 border-slate-200"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        {delta ? (
          <div
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${deltaClass}`}
          >
            {delta.label}
          </div>
        ) : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  )
}

