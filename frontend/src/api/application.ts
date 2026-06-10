import api from "./client"
import type { ApplicationQuestion, TeacherApplication } from "@/types"

// Public
export const getTeacherApplicationQuestionsApi = () =>
  api.get<ApplicationQuestion[]>("/public/teacher-application-questions").then((r) => r.data)

// Admin
export const listApplicationQuestionsApi = () =>
  api.get<ApplicationQuestion[]>("/admin/application-questions").then((r) => r.data)

export const createApplicationQuestionApi = (data: {
  question_text: string
  question_type: string
  required: boolean
  options?: string[]
}) => api.post<ApplicationQuestion>("/admin/application-questions", data).then((r) => r.data)

export const updateApplicationQuestionApi = (id: string, data: {
  question_text?: string
  question_type?: string
  required?: boolean
  order?: number
  options?: string[]
}) => api.put<ApplicationQuestion>(`/admin/application-questions/${id}`, data).then((r) => r.data)

export const deleteApplicationQuestionApi = (id: string) =>
  api.delete(`/admin/application-questions/${id}`).then((r) => r.data)

export const listTeacherApplicationsApi = (status?: string) =>
  api.get<TeacherApplication[]>("/admin/teacher-applications", { params: status ? { status } : undefined }).then((r) => r.data)

export const getTeacherApplicationApi = (id: string) =>
  api.get<TeacherApplication>(`/admin/teacher-applications/${id}`).then((r) => r.data)

export const approveTeacherApplicationAdminApi = (id: string) =>
  api.put(`/admin/teacher-applications/${id}/approve`).then((r) => r.data)

export const rejectTeacherApplicationAdminApi = (id: string) =>
  api.put(`/admin/teacher-applications/${id}/reject`).then((r) => r.data)

// Ambassador
export const listMyTeacherApplicationsApi = () =>
  api.get<TeacherApplication[]>("/network/teacher-applications").then((r) => r.data)

export const getMyTeacherApplicationApi = (id: string) =>
  api.get<TeacherApplication>(`/network/teacher-applications/${id}`).then((r) => r.data)

export const approveTeacherApplicationApi = (id: string) =>
  api.put<TeacherApplication>(`/network/teacher-applications/${id}/approve`).then((r) => r.data)

export const rejectTeacherApplicationApi = (id: string) =>
  api.put<TeacherApplication>(`/network/teacher-applications/${id}/reject`).then((r) => r.data)
