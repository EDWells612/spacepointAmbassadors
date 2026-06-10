import api from "./client"
import type { Title } from "@/types"

export const getTitlesApi = () => api.get<Title[]>("/titles").then((r) => r.data)

export const createTitleApi = (data: Omit<Title, "id">) =>
  api.post<Title>("/titles", data).then((r) => r.data)

export const updateTitleApi = (id: string, data: Partial<Omit<Title, "id">>) =>
  api.patch<Title>(`/titles/${id}`, data).then((r) => r.data)

export const deleteTitleApi = (id: string) =>
  api.delete(`/titles/${id}`).then((r) => r.data)
