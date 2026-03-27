"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setIsLoading(false), 1200)
    return () => window.clearTimeout(id)
  }, [])

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_45%),radial-gradient(circle_at_75%_70%,rgba(168,85,247,0.28),transparent_45%)]" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
          <p className="animate-pulse text-sm font-medium tracking-wide text-white/80">
            Loading Pulse Analytics
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(56,189,248,0.22),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.24),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.2),transparent_38%)]" />
        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="text-xl font-semibold tracking-tight">Pulse Analytics</div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/90 transition hover:border-white/40 hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/create-account"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Create account
            </Link>
          </div>
        </header>

        <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
              Real-time product intelligence
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Understand your product in minutes, not weeks
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              Pulse Analytics unifies event ingestion, workspace governance, API key controls, and actionable
              dashboards so teams can ship faster with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/create-account"
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_8px_30px_rgba(56,189,248,0.35)] transition hover:brightness-110"
              >
                Start free
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/5 p-5 shadow-2xl backdrop-blur-md">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Daily events</p>
                <p className="mt-2 text-2xl font-semibold">1.28M</p>
                <p className="mt-1 text-xs text-emerald-300">+12.4% this week</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Active users</p>
                <p className="mt-2 text-2xl font-semibold">48,392</p>
                <p className="mt-1 text-xs text-cyan-300">Across 18 workspaces</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">What you get</p>
                <ul className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                  <li>• Secure API keys with scoped permissions</li>
                  <li>• Multi-tenant workspace governance</li>
                  <li>• High-throughput event ingestion + idempotency</li>
                  <li>• Clean KPI dashboards for product teams</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
