export const Sidebar = ({
  workspaceName,
  active,
  onNavigate,
}: {
  workspaceName?: string
  active: "overview" | "api-keys" | "workspace"
  onNavigate: (next: "overview" | "api-keys" | "workspace") => void
}) => {
  return (
    <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="px-6 py-5">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Analytics SaaS
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          Insights
        </div>
      </div>

      <div className="px-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">Workspace</div>
          <div className="mt-1 truncate text-sm font-medium text-slate-900">
            {workspaceName ?? "—"}
          </div>
        </div>
      </div>

      <nav className="mt-6 px-3 pb-6">
        <button
          onClick={() => onNavigate("overview")}
          className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium ${
            active === "overview"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
          aria-label="Navigate to overview"
        >
          Overview
        </button>

        <button
          onClick={() => onNavigate("api-keys")}
          className={`mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium ${
            active === "api-keys"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
          aria-label="Navigate to API keys"
        >
          API keys
        </button>

        <button
          onClick={() => onNavigate("workspace")}
          className={`mt-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium ${
            active === "workspace"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
          aria-label="Navigate to workspace management"
        >
          Workspace
        </button>
      </nav>

      <div className="mt-auto border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        API{" "}
        <span className="font-mono text-[11px] text-slate-700">
          {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}
        </span>
      </div>
    </aside>
  )
}

