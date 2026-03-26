import { publicEnv } from "./env"
import type { ApiResponse } from "./api"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  accessExpiresIn: string
}

export type AuthUser = {
  id: string
  email: string
}

export type AuthRegisterResponse = {
  user: AuthUser
} & AuthTokens

export type AuthLoginResponse = {
  user: AuthUser
} & AuthTokens

export type WorkspaceListItem = {
  id: string
  name: string
  role: string
  createdAt: string
}

export type ApiKeyCreateResponse = {
  id: string
  name: string
  key: string
  keyPrefix: string
  permissions: string[]
  sourceId: string
  createdAt: string
}

export type ApiKeyListItem = {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  sourceId: string
  createdAt: string
  lastUsedAt: string | null
}

const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(publicEnv.apiBaseUrl.replace(/\/$/, "") + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

const apiGet = async <T>(params: {
  path: string
  accessToken: string
}): Promise<T> => {
  const res = await fetch(publicEnv.apiBaseUrl.replace(/\/$/, "") + params.path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
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

export const register = async (params: {
  email: string
  password: string
}): Promise<AuthRegisterResponse> => {
  return apiPost<AuthRegisterResponse>("/v1/auth/register", params)
}

export const login = async (params: {
  email: string
  password: string
}): Promise<AuthLoginResponse> => {
  return apiPost<AuthLoginResponse>("/v1/auth/login", params)
}

export const refresh = async (params: {
  refreshToken: string
}): Promise<AuthTokens> => {
  return apiPost<AuthTokens>("/v1/auth/refresh", params)
}

export const listWorkspaces = async (params: {
  accessToken: string
}): Promise<WorkspaceListItem[]> => {
  return apiGet<WorkspaceListItem[]>({ path: "/v1/workspaces", accessToken: params.accessToken })
}

export const createApiKey = async (params: {
  accessToken: string
  workspaceId: string
  name: string
  sourceId: string
}): Promise<ApiKeyCreateResponse> => {
  const res = await fetch(publicEnv.apiBaseUrl.replace(/\/$/, "") + "/v1/workspaces/api-keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
      "x-workspace-id": params.workspaceId,
    },
    body: JSON.stringify({
      name: params.name,
      sourceId: params.sourceId,
      permissions: ["events:ingest"],
    }),
  })
  const json = (await res.json().catch(() => null)) as ApiResponse<ApiKeyCreateResponse> | null
  if (!json) {
    throw new Error(`Request failed (invalid JSON) status=${res.status}`)
  }
  if (!json.success) {
    throw new Error(`${json.error}: ${json.message}`)
  }
  return json.data
}

export const listApiKeys = async (params: {
  accessToken: string
  workspaceId: string
}): Promise<ApiKeyListItem[]> => {
  const res = await fetch(publicEnv.apiBaseUrl.replace(/\/$/, "") + "/v1/workspaces/api-keys", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "x-workspace-id": params.workspaceId,
    },
  })
  const json = (await res.json().catch(() => null)) as ApiResponse<ApiKeyListItem[]> | null
  if (!json) {
    throw new Error(`Request failed (invalid JSON) status=${res.status}`)
  }
  if (!json.success) {
    throw new Error(`${json.error}: ${json.message}`)
  }
  return json.data
}

export const revokeApiKey = async (params: {
  accessToken: string
  workspaceId: string
  apiKeyId: string
}): Promise<{ revoked: true }> => {
  const res = await fetch(
    publicEnv.apiBaseUrl.replace(/\/$/, "") + `/v1/workspaces/api-keys/${params.apiKeyId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "x-workspace-id": params.workspaceId,
      },
    },
  )
  const json = (await res.json().catch(() => null)) as ApiResponse<{ revoked: true }> | null
  if (!json) {
    throw new Error(`Request failed (invalid JSON) status=${res.status}`)
  }
  if (!json.success) {
    throw new Error(`${json.error}: ${json.message}`)
  }
  return json.data
}

