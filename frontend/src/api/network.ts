import api from "./client"
import type { Teacher, Instructor, TeacherSession } from "@/types"

export const getMyTeachersApi = () =>
  api.get<Teacher[]>("/network/teachers").then((r) => r.data)

export const getTeacherApi = (teacherId: string) =>
  api.get<Teacher>(`/network/teachers/${teacherId}`).then((r) => r.data)

export const getMyInstructorsApi = () =>
  api.get<Instructor[]>("/network/instructors").then((r) => r.data)

export const updateTeacherStatusApi = (id: string, status: "active" | "rejected") =>
  api.put<Teacher>(`/network/teachers/${id}/status`, { status }).then((r) => r.data)

export const getAllSessionsApi = () =>
  api.get<TeacherSession[]>("/network/all-sessions").then((r) => r.data)

export const getTeacherSessionsApi = (teacherId: string) =>
  api.get<TeacherSession[]>(`/network/teachers/${teacherId}/sessions`).then((r) => r.data)

export const createSessionApi = (
  teacherId: string,
  data: { title: string; description?: string; date: string; planned_students: number }
) => api.post<TeacherSession>(`/network/teachers/${teacherId}/sessions`, data).then((r) => r.data)

export const approveSessionApi = (id: string) =>
  api.put<TeacherSession>(`/network/sessions/${id}/approve`).then((r) => r.data)

export const rejectSessionApi = (id: string) =>
  api.put<TeacherSession>(`/network/sessions/${id}/reject`).then((r) => r.data)

export const materialSentApi = (id: string, material_link?: string) =>
  api.put<TeacherSession>(`/network/sessions/${id}/material-sent`, { material_link }).then((r) => r.data)

export const markSessionDoneApi = (id: string, attended_students: number) =>
  api.put<TeacherSession>(`/network/sessions/${id}/done`, { attended_students }).then((r) => r.data)

export const editSessionApi = (
  id: string,
  data: Partial<{ title: string; description: string; date: string; planned_students: number }>,
) => api.patch<TeacherSession>(`/network/sessions/${id}`, data).then((r) => r.data)

export const cancelSessionApi = (id: string, reason?: string) =>
  api.put<TeacherSession>(`/network/sessions/${id}/cancel`, { reason }).then((r) => r.data)

export const deleteSessionApi = (id: string) =>
  api.delete(`/network/sessions/${id}`).then((r) => r.data)
