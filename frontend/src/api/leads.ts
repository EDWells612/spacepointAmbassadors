import api from "./client"
import type { Lead, LeadComment } from "@/types"

export const getLeadsApi = () => api.get<Lead[]>("/leads").then((r) => r.data)

export const createLeadApi = (data: {
  contact_name: string
  company?: string
  type: string
  notes?: string
}) => api.post<Lead>("/leads", data).then((r) => r.data)

export const updateLeadStatusApi = (id: string, status: string) =>
  api.put<Lead>(`/leads/${id}/status`, { status }).then((r) => r.data)

export const editLeadApi = (
  id: string,
  data: Partial<{ contact_name: string; company: string; type: string; notes: string }>
) => api.patch<Lead>(`/leads/${id}`, data).then((r) => r.data)

export const deleteLeadApi = (id: string) =>
  api.delete(`/leads/${id}`).then((r) => r.data)

export const getLeadCommentsApi = (id: string) =>
  api.get<LeadComment[]>(`/leads/${id}/comments`).then((r) => r.data)

export const addLeadCommentApi = (id: string, body: string) =>
  api.post<LeadComment>(`/leads/${id}/comments`, { body }).then((r) => r.data)
