import { publicEnv } from "@/lib/env";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <main className="mx-auto max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Analytics SaaS
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Phase 1 foundation is wired. API base URL comes from env.
          </p>
          <dl className="mt-6 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">NEXT_PUBLIC_API_URL</dt>
              <dd className="truncate font-mono text-xs text-slate-800">
                {publicEnv.apiBaseUrl}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
