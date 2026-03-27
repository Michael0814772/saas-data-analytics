"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { login } from "@/lib/auth"

const LS_ACCESS_TOKEN = "analytics_saas_access_token"
const LS_REFRESH_TOKEN = "analytics_saas_refresh_token"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await login({ email: email.trim(), password })
      window.localStorage.setItem(LS_ACCESS_TOKEN, data.accessToken)
      window.localStorage.setItem(LS_REFRESH_TOKEN, data.refreshToken)
      router.push("/dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.2),transparent_40%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
        <p className="text-xs uppercase tracking-wide text-cyan-300">Welcome back</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Log in to Pulse Analytics</h1>
        <p className="mt-2 text-sm text-slate-300">Access your workspaces, keys, and product metrics.</p>

        <div className="mt-6 grid gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 rounded-xl border border-white/15 bg-slate-900/70 px-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="h-11 w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 pr-11 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-lg text-slate-300 hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-1 h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-400 text-sm font-semibold text-slate-950 shadow-[0_8px_30px_rgba(56,189,248,0.35)] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <p className="mt-5 text-sm text-slate-300">
          No account yet?{" "}
          <Link href="/create-account" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
