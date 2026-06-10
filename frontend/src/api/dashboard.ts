import api from "./client"
import type { DashboardStats, PointsTransaction, Achievement } from "@/types"

export const getDashboardStatsApi = () =>
  api.get<DashboardStats>("/dashboard/stats").then((r) => r.data)

export const getMyPointsApi = () =>
  api.get<PointsTransaction[]>("/points/me").then((r) => r.data)

export const getMyAchievementsApi = () =>
  api.get<Achievement[]>("/achievements/me").then((r) => r.data)
