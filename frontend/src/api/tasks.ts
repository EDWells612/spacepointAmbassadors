import api from "./client"
import type { Task, AssignableUser } from "@/types"

export const getTasksApi = (view?: "assigned" | "created") =>
  api.get<Task[]>("/tasks", { params: view ? { view } : undefined }).then((r) => r.data)

export const getAssignableUsersApi = () =>
  api.get<AssignableUser[]>("/tasks/assignable-users").then((r) => r.data)

export const createTaskApi = (data: {
  assigned_to: string
  title: string
  description?: string
  deadline?: string | null
  points_reward: number
}) => api.post<Task>("/tasks", data).then((r) => r.data)

export const updateTaskStatusApi = (
  id: string,
  status: string,
  opts?: { edit_notes?: string; submission?: string },
) => api.put<Task>(`/tasks/${id}/status`, { status, ...opts }).then((r) => r.data)

export const editTaskApi = (
  id: string,
  data: Partial<{ title: string; description: string; deadline: string | null; points_reward: number }>,
) => api.patch<Task>(`/tasks/${id}`, data).then((r) => r.data)

export const deleteTaskApi = (id: string) =>
  api.delete(`/tasks/${id}`).then((r) => r.data)
