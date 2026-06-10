import api from "./client"
import type { Badge } from "@/types"

export const getBadgesApi = () => api.get<Badge[]>("/badges").then((r) => r.data)

export const getCriteriaTypesApi = () =>
  api.get<Record<string, string[]>>("/badges/criteria-types").then((r) => r.data)

export const createBadgeApi = (data: Omit<Badge, "id" | "code"> & { code?: string }) =>
  api.post<Badge>("/badges", data).then((r) => r.data)

export const updateBadgeApi = (id: string, data: Partial<Omit<Badge, "id" | "code">>) =>
  api.patch<Badge>(`/badges/${id}`, data).then((r) => r.data)

export const deleteBadgeApi = (id: string) =>
  api.delete(`/badges/${id}`).then((r) => r.data)
