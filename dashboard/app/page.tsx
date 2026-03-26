"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch, clearLocalSession } from "@/lib/api"
import {
  createApiKey,
  listApiKeys,
  listWorkspaces,
  login,
  refresh,
  register,
  revokeApiKey,
  type ApiKeyListItem,
  type WorkspaceListItem,
} from "@/lib/auth"
import { MetricCard } from "@/components/MetricCard"
import { AreaChart } from "@/components/AreaChart"
import { Sidebar } from "@/components/Sidebar"
import {
  createInvite,
  listInvites,
  listMembers,
  removeMember,
  renameWorkspace,
  transferOwnership,
  updateMemberRole,
  leaveWorkspace,
  revokeInvite,
  type WorkspaceInviteRow,
  type WorkspaceMemberRow,
} from "@/lib/workspaces"

type TotalEvents = { totalEvents: number }
type ActiveUsers = { activeUsers: number }
type Growth = {
  fromDate: string
  toDate: string
  currentTotalEvents: number
  previousFromDate: string
  previousToDate: string
  previousTotalEvents: number
  growthRate: number | null
}
type DailyUsage = {
  rows: Array<{ date: string; events: number; uniqueUsers: number }>
  totalRows: number
}

const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

const LS_ACCESS_TOKEN = "analytics_saas_access_token"
const LS_REFRESH_TOKEN = "analytics_saas_refresh_token"
const LS_WORKSPACE_ID = "analytics_saas_workspace_id"

export default function Home() {
  const today = useMemo(() => new Date(), [])
  const defaultTo = useMemo(() => toDateStr(today), [today])
  const defaultFrom = useMemo(() => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - 13)
    return toDateStr(d)
  }, [today])

  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [workspaceId, setWorkspaceId] = useState("")
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"overview" | "api-keys" | "workspace">("overview")

  const [totalEvents, setTotalEvents] = useState<TotalEvents | null>(null)
  const [activeUsers, setActiveUsers] = useState<ActiveUsers | null>(null)
  const [growth, setGrowth] = useState<Growth | null>(null)
  const [daily, setDaily] = useState<DailyUsage | null>(null)

  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([])
  const [newApiKeyName, setNewApiKeyName] = useState("Ingestion key")
  const [newApiKeySourceId, setNewApiKeySourceId] = useState("default_datasource")
  const [createdKeyOnce, setCreatedKeyOnce] = useState<string | null>(null)

  const [members, setMembers] = useState<WorkspaceMemberRow[]>([])
  const [invites, setInvites] = useState<WorkspaceInviteRow[]>([])
  const [renameDraft, setRenameDraft] = useState("")
  const [inviteEmailDraft, setInviteEmailDraft] = useState("")
  const [inviteRoleDraft, setInviteRoleDraft] = useState("member")
  const [createdInviteTokenOnce, setCreatedInviteTokenOnce] = useState<string | null>(null)
  const [transferNewOwnerUserId, setTransferNewOwnerUserId] = useState("")
  const [memberRoleEdits, setMemberRoleEdits] = useState<Record<string, string>>({})

  const isAuthed = accessToken.trim() && refreshToken.trim()
  const canRun = isAuthed && workspaceId.trim() && fromDate && toDate

  useEffect(() => {
    try {
      const savedToken = window.localStorage.getItem(LS_ACCESS_TOKEN) ?? ""
      const savedRefresh = window.localStorage.getItem(LS_REFRESH_TOKEN) ?? ""
      const savedWorkspaceId = window.localStorage.getItem(LS_WORKSPACE_ID) ?? ""
      if (savedToken) {
        setAccessToken(savedToken)
      }
      if (savedRefresh) {
        setRefreshToken(savedRefresh)
      }
      if (savedWorkspaceId) {
        setWorkspaceId(savedWorkspaceId)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (accessToken.trim()) {
        window.localStorage.setItem(LS_ACCESS_TOKEN, accessToken)
      }
    } catch {}
  }, [accessToken])

  useEffect(() => {
    try {
      if (refreshToken.trim()) {
        window.localStorage.setItem(LS_REFRESH_TOKEN, refreshToken)
      }
    } catch {}
  }, [refreshToken])

  useEffect(() => {
    try {
      if (workspaceId.trim()) {
        window.localStorage.setItem(LS_WORKSPACE_ID, workspaceId)
      }
    } catch {}
  }, [workspaceId])

  const handleLogout = () => {
    clearLocalSession()
    setAccessToken("")
    setRefreshToken("")
    setWorkspaceId("")
    setWorkspaces([])
    setTotalEvents(null)
    setActiveUsers(null)
    setGrowth(null)
    setDaily(null)
    setError(null)
  }

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setError("Email + password required")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data =
        mode === "register"
          ? await register({ email: email.trim(), password })
          : await login({ email: email.trim(), password })
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      setPassword("")
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthed) {
      return
    }
    void handleLoadWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  const handleLoadWorkspaces = async () => {
    if (!isAuthed) {
      setError("Not authenticated")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const ws = await listWorkspaces({ accessToken: accessToken.trim() })
      setWorkspaces(ws)
      const saved = window.localStorage.getItem(LS_WORKSPACE_ID) ?? ""
      const canKeep = saved && ws.some((w) => w.id === saved)
      if (canKeep) {
        setWorkspaceId(saved)
        return
      }
      if (ws.length > 0) {
        setWorkspaceId(ws[0].id)
        return
      }
      setWorkspaceId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }

  const withRefresh = async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
    try {
      return await fn(accessToken.trim())
    } catch (e) {
      const msg = e instanceof Error ? e.message : ""
      if (!msg.includes("UNAUTHORIZED")) {
        throw e
      }
      const next = await refresh({ refreshToken: refreshToken.trim() })
      setAccessToken(next.accessToken)
      setRefreshToken(next.refreshToken)
      return fn(next.accessToken)
    }
  }

  const handleLoad = async () => {
    if (!canRun) {
      setError("Missing login, workspace, or date range")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const wsId = workspaceId.trim()
      const [events, users, growthRes, dailyRes] = await Promise.all([
        withRefresh((t) =>
          apiFetch<TotalEvents>({
            path: "/v1/metrics/events",
            accessToken: t,
            workspaceId: wsId,
            query: { fromDate, toDate },
          }),
        ),
        withRefresh((t) =>
          apiFetch<ActiveUsers>({
            path: "/v1/metrics/active-users",
            accessToken: t,
            workspaceId: wsId,
            query: { fromDate, toDate },
          }),
        ),
        withRefresh((t) =>
          apiFetch<Growth>({
            path: "/v1/metrics/growth",
            accessToken: t,
            workspaceId: wsId,
            query: { fromDate, toDate },
          }),
        ),
        withRefresh((t) =>
          apiFetch<DailyUsage>({
            path: "/v1/metrics/daily",
            accessToken: t,
            workspaceId: wsId,
            query: { fromDate, toDate, limit: "60", offset: "0" },
          }),
        ),
      ])

      setTotalEvents(events)
      setActiveUsers(users)
      setGrowth(growthRes)
      setDaily(dailyRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics")
    } finally {
      setLoading(false)
    }
  }

  const handleLoadApiKeys = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await withRefresh((t) =>
        listApiKeys({ accessToken: t, workspaceId: workspaceId.trim() }),
      )
      setApiKeys(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApiKey = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    if (!newApiKeyName.trim() || !newApiKeySourceId.trim()) {
      setError("API key name and sourceId are required")
      return
    }
    setLoading(true)
    setError(null)
    setCreatedKeyOnce(null)
    try {
      const created = await withRefresh((t) =>
        createApiKey({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          name: newApiKeyName.trim(),
          sourceId: newApiKeySourceId.trim(),
        }),
      )
      setCreatedKeyOnce(created.key)
      await handleLoadApiKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeApiKey = async (apiKeyId: string) => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        revokeApiKey({ accessToken: t, workspaceId: workspaceId.trim(), apiKeyId }),
      )
      await handleLoadApiKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke API key")
    } finally {
      setLoading(false)
    }
  }

  const handleLoadWorkspaceManagement = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }

    setLoading(true)
    setError(null)
    setCreatedInviteTokenOnce(null)

    try {
      const wsId = workspaceId.trim()
      const [memberRows, inviteRows] = await Promise.all([
        withRefresh((t) => listMembers({ accessToken: t, workspaceId: wsId })),
        withRefresh((t) => listInvites({ accessToken: t, workspaceId: wsId })),
      ])

      setMembers(memberRows)
      setInvites(inviteRows)
      setMemberRoleEdits(Object.fromEntries(memberRows.map((m) => [m.userId, m.role])))

      const wsName = workspaces.find((w) => w.id === wsId)?.name ?? ""
      setRenameDraft(wsName)
      setTransferNewOwnerUserId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workspace management")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMemberRole = async (params: { userId: string; role: string }) => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    if (!params.role) {
      setError("Role is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        updateMemberRole({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          userId: params.userId,
          role: params.role,
        }),
      )
      await handleLoadWorkspaceManagement()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update member role")
      setLoading(false)
    }
  }

  const handleRemoveMember = async (params: { userId: string }) => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        removeMember({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          userId: params.userId,
        }),
      )
      await handleLoadWorkspaceManagement()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member")
    } finally {
      setLoading(false)
    }
  }

  const handleRenameWorkspace = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    const name = renameDraft.trim()
    if (!name) {
      setError("Workspace name is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        renameWorkspace({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          name,
        }),
      )
      await handleLoadWorkspaceManagement()
      await handleLoadWorkspaces()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename workspace")
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveWorkspace = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) => leaveWorkspace({ accessToken: t, workspaceId: workspaceId.trim() }))
      await handleLoadWorkspaces()
      setWorkspaceId("")
      setView("overview")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave workspace")
    } finally {
      setLoading(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }

    const newOwnerUserId = transferNewOwnerUserId.trim()
    if (!newOwnerUserId) {
      setError("newOwnerUserId is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        transferOwnership({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          newOwnerUserId,
        }),
      )
      await handleLoadWorkspaceManagement()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to transfer ownership")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    const email = inviteEmailDraft.trim()
    const role = inviteRoleDraft
    if (!email) {
      setError("Invite email is required")
      return
    }
    setLoading(true)
    setError(null)
    setCreatedInviteTokenOnce(null)
    try {
      const created = await withRefresh((t) =>
        createInvite({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          email,
          role,
        }),
      )
      setCreatedInviteTokenOnce(created.token ?? null)
      await handleLoadWorkspaceManagement()
      setInviteEmailDraft("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invite")
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!isAuthed || !workspaceId.trim()) {
      setError("Login and select a workspace first")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await withRefresh((t) =>
        revokeInvite({
          accessToken: t,
          workspaceId: workspaceId.trim(),
          inviteId,
        }),
      )
      await handleLoadWorkspaceManagement()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite")
    } finally {
      setLoading(false)
    }
  }

  const growthLabel = useMemo(() => {
    if (!growth) {
      return "—"
    }
    if (growth.growthRate === null) {
      return "n/a"
    }
    const pct = growth.growthRate * 100
    const sign = pct > 0 ? "+" : ""
    return `${sign}${pct.toFixed(1)}%`
  }, [growth])

  const growthDelta = useMemo(() => {
    if (!growth) {
      return undefined
    }
    if (growth.growthRate === null) {
      return { label: "n/a", tone: "neutral" as const }
    }
    const pct = growth.growthRate * 100
    const sign = pct > 0 ? "+" : ""
    const tone = pct > 0 ? ("up" as const) : pct < 0 ? ("down" as const) : ("neutral" as const)
    return { label: `${sign}${pct.toFixed(1)}%`, tone }
  }, [growth])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar
          workspaceName={
            workspaces.find((w) => w.id === workspaceId)?.name
          }
          active={view}
          onNavigate={(next) => {
            setView(next)
            if (next === "api-keys") {
              void handleLoadApiKeys()
            }
            if (next === "workspace") {
              void handleLoadWorkspaceManagement()
            }
          }}
        />

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {view === "overview" ? "Overview" : view === "api-keys" ? "API keys" : "Workspace"}
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {view === "overview"
                      ? "Product analytics"
                      : view === "api-keys"
                        ? "Developer access"
                        : "Workspace management"}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {view === "overview" ? (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <label className="text-xs font-medium text-slate-600">
                          From
                        </label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-slate-400"
                          aria-label="From date"
                        />
                        <label className="text-xs font-medium text-slate-600">
                          To
                        </label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-slate-400"
                          aria-label="To date"
                        />
                      </div>

                      <button
                        onClick={handleLoad}
                        disabled={!canRun || loading}
                        className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Refresh metrics"
                      >
                        {loading ? "Refreshing…" : "Refresh"}
                      </button>
                    </>
                  ) : view === "api-keys" ? (
                    <button
                      onClick={handleLoadApiKeys}
                      disabled={!isAuthed || !workspaceId.trim() || loading}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Refresh API keys"
                    >
                      {loading ? "Refreshing…" : "Refresh keys"}
                    </button>
                  ) : (
                    <button
                      onClick={handleLoadWorkspaceManagement}
                      disabled={!isAuthed || !workspaceId.trim() || loading}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Refresh workspace"
                    >
                      {loading ? "Refreshing…" : "Refresh workspace"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!isAuthed ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Sign in
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("login")}
                    className={`h-8 rounded-xl border px-3 text-xs font-semibold ${
                      mode === "login"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    aria-label="Switch to login"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setMode("register")}
                    className={`h-8 rounded-xl border px-3 text-xs font-semibold ${
                      mode === "register"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    aria-label="Switch to register"
                  >
                    Register
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    aria-label="Email"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    aria-label="Password"
                  />
                </label>
              </div>

              <button
                onClick={handleAuth}
                disabled={loading}
                className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Submit auth"
              >
                {loading ? "Working…" : mode === "register" ? "Create account" : "Login"}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                  Workspace
                </div>
                <button
                  onClick={handleLogout}
                  className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-700">Select workspace</span>
                  <select
                    value={workspaceId}
                    onChange={(e) => {
                      const next = e.target.value
                      setWorkspaceId(next)
                      if (view === "workspace" && next.trim()) {
                        void handleLoadWorkspaceManagement()
                      }
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    aria-label="Workspace select"
                  >
                    <option value="">Choose…</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.role})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    onClick={handleLoadWorkspaces}
                    disabled={loading}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Refresh workspace list"
                  >
                    {loading ? "Loading…" : "Refresh list"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
            </div>

            {view === "overview" ? (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Total events"
                    value={totalEvents ? totalEvents.totalEvents.toLocaleString() : "—"}
                  />
                  <MetricCard
                    label="Active users"
                    value={activeUsers ? activeUsers.activeUsers.toLocaleString() : "—"}
                    hint="Based on properties.userId (if present)"
                  />
                  <MetricCard
                    label="Growth"
                    value={growthLabel}
                    delta={growthDelta}
                    hint={
                      growth
                        ? `vs ${growth.previousFromDate} → ${growth.previousToDate}`
                        : undefined
                    }
                  />
                </div>

                <div className="mt-8">
                  <AreaChart
                    title="Daily events"
                    subtitle="Aggregates only (daily_event_aggregates)"
                    points={(daily?.rows ?? []).map((r) => ({ date: r.date, value: r.events }))}
                  />
                </div>
              </>
            ) : view === "api-keys" ? (
              <div className="mt-8 grid gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Create API key</div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-700">Name</span>
                      <input
                        value={newApiKeyName}
                        onChange={(e) => setNewApiKeyName(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                        aria-label="API key name"
                      />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-medium text-slate-700">Source ID</span>
                      <input
                        value={newApiKeySourceId}
                        onChange={(e) => setNewApiKeySourceId(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                        aria-label="API key source id"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      Permissions: <span className="font-mono">events:ingest</span>
                    </div>
                    <button
                      onClick={handleCreateApiKey}
                      disabled={!isAuthed || !workspaceId.trim() || loading}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Create API key"
                    >
                      {loading ? "Creating…" : "Create key"}
                    </button>
                  </div>

                  {createdKeyOnce ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-xs font-semibold text-emerald-800">
                        Copy this key now (shown once)
                      </div>
                      <div className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-900">
                        {createdKeyOnce}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">API keys</div>
                    <button
                      onClick={handleLoadApiKeys}
                      disabled={!isAuthed || !workspaceId.trim() || loading}
                      className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Reload API keys"
                    >
                      Reload
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-12 gap-3 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                      <div className="col-span-4">Name</div>
                      <div className="col-span-3">Prefix</div>
                      <div className="col-span-3">Source</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    {apiKeys.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-600">
                        No keys yet
                      </div>
                    ) : (
                      apiKeys.map((k) => (
                        <div
                          key={k.id}
                          className="grid grid-cols-12 gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-800"
                        >
                          <div className="col-span-4 truncate font-medium text-slate-900">
                            {k.name}
                          </div>
                          <div className="col-span-3 font-mono text-xs text-slate-700">
                            {k.keyPrefix}
                          </div>
                          <div className="col-span-3 truncate text-slate-700">
                            {k.sourceId}
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => handleRevokeApiKey(k.id)}
                              className="h-8 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700"
                              aria-label={`Revoke API key ${k.name}`}
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">Members</div>
                      <button
                        onClick={handleLoadWorkspaceManagement}
                        disabled={!isAuthed || !workspaceId.trim() || loading}
                        className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Reload members"
                      >
                        Reload
                      </button>
                    </div>

                    {members.length === 0 ? (
                      <div className="mt-6 px-2 text-sm text-slate-600">
                        No members found
                      </div>
                    ) : (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                        <div className="grid grid-cols-12 gap-3 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                          <div className="col-span-4">Email</div>
                          <div className="col-span-2">Role</div>
                          <div className="col-span-3">Joined</div>
                          <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {members.map((m) => {
                          const selectedRole = memberRoleEdits[m.userId] ?? m.role
                          return (
                            <div
                              key={m.userId}
                              className="grid grid-cols-12 gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-800"
                            >
                              <div className="col-span-4 truncate font-medium text-slate-900">
                                {m.email}
                              </div>

                              <div className="col-span-2">
                                <select
                                  value={selectedRole}
                                  onChange={(e) => {
                                    const next = e.target.value
                                    setMemberRoleEdits((prev) => ({ ...prev, [m.userId]: next }))
                                  }}
                                  className="h-8 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-slate-400"
                                  aria-label={`Select new role for ${m.email}`}
                                >
                                  <option value="owner">owner</option>
                                  <option value="admin">admin</option>
                                  <option value="member">member</option>
                                </select>
                              </div>

                              <div className="col-span-3 text-slate-700">
                                {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                              </div>

                              <div className="col-span-3 flex justify-end gap-2">
                                <button
                                  onClick={() =>
                                    void handleUpdateMemberRole({
                                      userId: m.userId,
                                      role: selectedRole,
                                    })
                                  }
                                  className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                  aria-label={`Update role for ${m.email}`}
                                  disabled={loading}
                                >
                                  Update
                                </button>

                                <button
                                  onClick={() => void handleRemoveMember({ userId: m.userId })}
                                  className="h-8 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 disabled:opacity-60"
                                  aria-label={`Remove member ${m.email}`}
                                  disabled={loading}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">Invites</div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-700">Email</span>
                        <input
                          value={inviteEmailDraft}
                          onChange={(e) => setInviteEmailDraft(e.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                          aria-label="Invite email"
                          placeholder="user@company.com"
                        />
                      </label>

                      <label className="grid gap-1">
                        <span className="text-xs font-medium text-slate-700">Role</span>
                        <select
                          value={inviteRoleDraft}
                          onChange={(e) => setInviteRoleDraft(e.target.value)}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                          aria-label="Invite role"
                        >
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Pending invites expire automatically
                      </div>
                      <button
                        onClick={handleCreateInvite}
                        disabled={!isAuthed || !workspaceId.trim() || loading || !inviteEmailDraft.trim()}
                        className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Create invite"
                      >
                        {loading ? "Creating…" : "Create invite"}
                      </button>
                    </div>

                    {createdInviteTokenOnce ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="text-xs font-semibold text-emerald-800">
                          Copy invite token (shown once)
                        </div>
                        <div className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-900">
                          {createdInviteTokenOnce}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                      <div className="grid grid-cols-12 gap-3 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                        <div className="col-span-5">Email</div>
                        <div className="col-span-2">Role</div>
                        <div className="col-span-3">Expires</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>

                      {invites.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-600">
                          No pending invites
                        </div>
                      ) : (
                        invites.map((i) => (
                          <div
                            key={i.id}
                            className="grid grid-cols-12 gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-800"
                          >
                            <div className="col-span-5 truncate font-medium text-slate-900">
                              {i.email}
                            </div>
                            <div className="col-span-2 text-slate-700">
                              {i.role}
                            </div>
                            <div className="col-span-3 text-slate-700">
                              {i.expiresAt ? new Date(i.expiresAt).toLocaleDateString() : "—"}
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <button
                                onClick={() => void handleRevokeInvite(i.id)}
                                className="h-8 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 disabled:opacity-60"
                                aria-label={`Revoke invite for ${i.email}`}
                                disabled={loading}
                              >
                                Revoke
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Workspace settings</div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-700">Rename workspace</span>
                      <input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                        aria-label="Workspace name"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        onClick={() => void handleRenameWorkspace()}
                        disabled={!isAuthed || !workspaceId.trim() || loading || !renameDraft.trim()}
                        className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Save workspace name"
                      >
                        {loading ? "Saving…" : "Save name"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => void handleLeaveWorkspace()}
                      disabled={!isAuthed || !workspaceId.trim() || loading}
                      className="h-10 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Leave workspace"
                    >
                      {loading ? "Leaving…" : "Leave workspace"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-700">Transfer ownership to</span>
                      <select
                        value={transferNewOwnerUserId}
                        onChange={(e) => setTransferNewOwnerUserId(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                        aria-label="Transfer new owner"
                      >
                        <option value="">Choose member…</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.email}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-end">
                      <button
                        onClick={() => void handleTransferOwnership()}
                        disabled={!isAuthed || !workspaceId.trim() || loading || !transferNewOwnerUserId.trim()}
                        className="h-10 w-full rounded-xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Transfer ownership"
                      >
                        {loading ? "Transferring…" : "Transfer ownership"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 text-xs text-slate-500">
              Inspired by modern analytics SaaS layout patterns (persistent nav + KPI cards + chart focus).
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
