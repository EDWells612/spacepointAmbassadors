import api from "./client"
import type { User, TokenResponse } from "@/types"

export const loginApi = (email: string, password: string) =>
  api.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data)

export const getMeApi = () => api.get<User>("/users/me").then((r) => r.data)

export const applyAmbassadorApi = (data: {
  full_name: string
  email: string
  password: string
  country?: string
}) => api.post<User>("/auth/apply", data).then((r) => r.data)

export const applyTeacherApi = (data: {
  full_name: string
  email: string
  password: string
  invite_code: string
}) => api.post<User>("/auth/teacher-apply", data).then((r) => r.data)

export const applyInstructorApi = (data: {
  full_name: string
  email: string
  invite_code: string
}) => api.post("/auth/instructor-apply", data).then((r) => r.data)

export const validateInviteApi = (code: string) =>
  api.get<{ ambassador_name: string; valid: boolean }>(`/auth/invite/${code}`).then((r) => r.data)
