import { publicEnv } from "./env"

export type ApiOk<T> = { success: true; data: T }
export type ApiErr = { success: false; error: string; message: string }
export type ApiResponse<T> = ApiOk<T> | ApiErr

export const apiFetch = async <T>(params: {
  path: string
  accessToken: string
  workspaceId: string
  query?: Record<string, string | undefined>
}): Promise<T> => {
  const url = new URL(publicEnv.apiBaseUrl.replace(/\/$/, "") + params.path)
  for (const [k, v] of Object.entries(params.query ?? {})) {
    if (v !== undefined && v !== "") {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "x-workspace-id": params.workspaceId,
    },
  })

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) {
    throw new Error(`Request failed (invalid JSON) status=${res.status}`)
  }
  if (!json.success) {
    throw new Error(`${json.error}: ${json.message}`)
  }
  return json.data
}

export const clearLocalSession = () => {
  try {
    window.localStorage.removeItem("analytics_saas_access_token")
    window.localStorage.removeItem("analytics_saas_refresh_token")
    window.localStorage.removeItem("analytics_saas_workspace_id")
  } catch {}
}

