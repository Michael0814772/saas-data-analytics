import { publicEnv } from "@/lib/env"
import type { ApiResponse } from "./api"

export type WorkspaceMemberRow = {
  userId: string
  email: string
  role: string
  joinedAt: string
}

export type WorkspaceInviteRow = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  token?: string
}

const apiRequest = async <T>(params: {
  method: string
  path: string
  accessToken: string
  workspaceId: string
  body?: unknown
}): Promise<T> => {
  const url = publicEnv.apiBaseUrl.replace(/\/$/, "") + params.path
  const res = await fetch(url, {
    method: params.method,
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "x-workspace-id": params.workspaceId,
      "Content-Type": "application/json",
    },
    body: params.body !== undefined ? JSON.stringify(params.body) : undefined,
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

export const listMembers = async (params: {
  accessToken: string
  workspaceId: string
}): Promise<WorkspaceMemberRow[]> => {
  return apiRequest<WorkspaceMemberRow[]>({
    method: "GET",
    path: "/v1/workspaces/members",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
  })
}

export const updateMemberRole = async (params: {
  accessToken: string
  workspaceId: string
  userId: string
  role: string
}): Promise<{ userId: string; role: string }> => {
  return apiRequest<{ userId: string; role: string }>({
    method: "PATCH",
    path: `/v1/workspaces/members/${params.userId}`,
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
    body: { role: params.role },
  })
}

export const removeMember = async (params: {
  accessToken: string
  workspaceId: string
  userId: string
}): Promise<{ removed: true; userId: string }> => {
  return apiRequest<{ removed: true; userId: string }>({
    method: "DELETE",
    path: `/v1/workspaces/members/${params.userId}`,
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
  })
}

export const renameWorkspace = async (params: {
  accessToken: string
  workspaceId: string
  name: string
}): Promise<{ id: string; name: string }> => {
  return apiRequest<{ id: string; name: string }>({
    method: "PATCH",
    path: "/v1/workspaces",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
    body: { name: params.name },
  })
}

export const leaveWorkspace = async (params: {
  accessToken: string
  workspaceId: string
}): Promise<{ left: true }> => {
  return apiRequest<{ left: true }>({
    method: "POST",
    path: "/v1/workspaces/leave",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
  })
}

export const transferOwnership = async (params: {
  accessToken: string
  workspaceId: string
  newOwnerUserId: string
}): Promise<{ newOwnerUserId: string; yourNewRole: string }> => {
  return apiRequest<{ newOwnerUserId: string; yourNewRole: string }>({
    method: "POST",
    path: "/v1/workspaces/ownership/transfer",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
    body: { newOwnerUserId: params.newOwnerUserId },
  })
}

export const createInvite = async (params: {
  accessToken: string
  workspaceId: string
  email: string
  role: string
}): Promise<WorkspaceInviteRow> => {
  return apiRequest<WorkspaceInviteRow>({
    method: "POST",
    path: "/v1/workspaces/invites",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
    body: { email: params.email, role: params.role },
  })
}

export const listInvites = async (params: {
  accessToken: string
  workspaceId: string
}): Promise<WorkspaceInviteRow[]> => {
  return apiRequest<WorkspaceInviteRow[]>({
    method: "GET",
    path: "/v1/workspaces/invites",
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
  })
}

export const revokeInvite = async (params: {
  accessToken: string
  workspaceId: string
  inviteId: string
}): Promise<{ revoked: true; id: string }> => {
  return apiRequest<{ revoked: true; id: string }>({
    method: "DELETE",
    path: `/v1/workspaces/invites/${params.inviteId}`,
    accessToken: params.accessToken,
    workspaceId: params.workspaceId,
  })
}

