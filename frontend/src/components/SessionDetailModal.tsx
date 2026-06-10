import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2, Ban } from "lucide-react"
import type { TeacherSession } from "@/types"
import {
  editSessionApi, deleteSessionApi, markSessionDoneApi,
  approveSessionApi, rejectSessionApi, materialSentApi, cancelSessionApi,
} from "@/api/network"
import { getMaterialsApi } from "@/api/materials"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/common"

function toLocalInput(iso: string) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

/**
 * role:
 *  - "teacher"  → owner: view, edit, delete, mark delivered (with attendance)
 *  - "manager"  → ambassador / admin: view, approve, reject, mark material sent
 */
export function SessionDetailModal({
  session,
  role = "teacher",
  onClose,
}: {
  session: TeacherSession
  role?: "teacher" | "manager"
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [attended, setAttended] = useState(session.planned_students || 0)
  const [materialLink, setMaterialLink] = useState("")
  const [edit, setEdit] = useState({
    title: session.title,
    description: session.description ?? "",
    date: toLocalInput(session.date),
    planned_students: session.planned_students,
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-sessions"] })
    qc.invalidateQueries({ queryKey: ["sessions"] })
    qc.invalidateQueries({ queryKey: ["admin-sessions"] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
    qc.invalidateQueries({ queryKey: ["notifications"] })
  }
  const onDone = { onSuccess: () => { refresh(); onClose() } }
  const save = useMutation({
    mutationFn: () => editSessionApi(session.id, {
      title: edit.title, description: edit.description,
      date: new Date(edit.date).toISOString(), planned_students: Number(edit.planned_students),
    }),
    ...onDone,
  })
  const remove = useMutation({ mutationFn: () => deleteSessionApi(session.id), ...onDone })
  const deliver = useMutation({ mutationFn: () => markSessionDoneApi(session.id, Number(attended)), ...onDone })
  const approve = useMutation({ mutationFn: () => approveSessionApi(session.id), ...onDone })
  const reject = useMutation({ mutationFn: () => rejectSessionApi(session.id), ...onDone })
  const material = useMutation({ mutationFn: () => materialSentApi(session.id, materialLink || undefined), ...onDone })
  const cancel = useMutation({ mutationFn: () => cancelSessionApi(session.id, cancelReason.trim() || undefined), ...onDone })

  const isDone = session.status === "done"
  const isCancelled = session.status === "cancelled"
  const isTeacher = role === "teacher"
  const isManager = role === "manager"
  const canDeliver = isTeacher && session.status === "approved" && session.material_sent && !isDone
  const busy = approve.isPending || reject.isPending || material.isPending || deliver.isPending || remove.isPending || cancel.isPending

  // Library suggestions for the material link (manager view only).
  const { data: library = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterialsApi(),
    enabled: isManager && session.status === "approved" && !session.material_sent,
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap pr-6">
            {session.title} <StatusPill status={session.status} />
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="flex flex-col gap-3 mt-2">
            <input className="input" placeholder="Title" value={edit.title} onChange={(e) => setEdit((s) => ({ ...s, title: e.target.value }))} required />
            <textarea className="input h-20 py-2 resize-none" placeholder="Description" value={edit.description} onChange={(e) => setEdit((s) => ({ ...s, description: e.target.value }))} />
            <input className="input" type="datetime-local" value={edit.date} onChange={(e) => setEdit((s) => ({ ...s, date: e.target.value }))} required />
            <input className="input" type="number" min={0} placeholder="Planned students" value={edit.planned_students} onChange={(e) => setEdit((s) => ({ ...s, planned_students: Number(e.target.value) }))} />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            {session.teacher_name && <p className="text-gray-500">Teacher <span className="text-black font-medium">{session.teacher_name}</span></p>}
            {session.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Description</p>
                <p className="text-gray-700 whitespace-pre-wrap">{session.description}</p>
              </div>
            )}
            <p className="text-gray-500">Date <span className="text-black font-medium">{new Date(session.date).toLocaleString()}</span></p>
            <p className="text-gray-500">Planned students <span className="text-black font-medium">{session.planned_students}</span></p>
            {isDone && <p className="text-gray-500">Attended <span className="text-black font-medium">{session.attended_students}</span></p>}
            <p className="text-gray-500">Material <span className="text-black font-medium">{session.material_sent ? "sent" : "not sent yet"}</span></p>
            {(session.status === "rejected" || isCancelled) && session.status_note && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-xs font-semibold text-red-600 mb-0.5">{isCancelled ? "Cancellation reason" : "Rejection reason"}</p>
                <p className="text-red-700 whitespace-pre-wrap">{session.status_note}</p>
              </div>
            )}
            {isTeacher && session.status === "rejected" && (
              <p className="text-xs text-gray-400">Edit this session to fix it and resubmit it for approval.</p>
            )}

            {/* Status timeline */}
            <div className="flex items-center gap-1 pt-1">
              {["pending", "approved", "delivered"].map((step, i) => {
                const reached =
                  (step === "pending") ||
                  (step === "approved" && (session.status === "approved" || isDone)) ||
                  (step === "delivered" && isDone)
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`flex-1 h-1.5 rounded-full ${reached ? "bg-heliotrope" : "bg-gray-200"}`} />
                    {i < 2 && <span className="w-1" />}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 -mt-1">
              <span>Submitted</span><span>Approved</span><span>Delivered</span>
            </div>

            {/* Open material (anyone, once shared) */}
            {session.material_link && (
              <a href={session.material_link} target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full">Open session material</Button>
              </a>
            )}

            {/* Teacher: mark delivered */}
            {canDeliver && (
              <div className="rounded-lg border border-gray-100 p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Students attended</label>
                <div className="flex gap-2">
                  <input className="input flex-1" type="number" min={0} value={attended} onChange={(e) => setAttended(Number(e.target.value))} />
                  <Button variant="primary" disabled={busy} onClick={() => deliver.mutate()}>Mark delivered</Button>
                </div>
              </div>
            )}

            {/* Manager (ambassador/admin) actions */}
            {isManager && session.status === "pending" && (
              <div className="flex gap-2">
                <Button variant="primary" disabled={busy} onClick={() => approve.mutate()}>Approve</Button>
                <Button variant="destructive" disabled={busy} onClick={() => reject.mutate()}>Reject</Button>
              </div>
            )}
            {isManager && session.status === "approved" && !session.material_sent && (
              <div className="rounded-lg border border-gray-100 p-3 space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Material link (optional)</label>
                {library.length > 0 && (
                  <select className="input" value="" onChange={(e) => e.target.value && setMaterialLink(e.target.value)}>
                    <option value="">Pick from the materials library…</option>
                    {library.map((m) => <option key={m.id} value={m.link}>{m.title}{m.category ? ` · ${m.category}` : ""}</option>)}
                  </select>
                )}
                <input className="input" placeholder="https://… slides, deck, guide" value={materialLink} onChange={(e) => setMaterialLink(e.target.value)} />
                <Button variant="primary" disabled={busy} onClick={() => material.mutate()} className="w-full">Submit material</Button>
              </div>
            )}
            {isManager && session.status === "approved" && (
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => reject.mutate()}>Reject session</Button>
            )}
            {isManager && session.status === "approved" && session.material_sent && (
              <p className="text-xs text-gray-400">Material sent — awaiting the teacher to mark it delivered.</p>
            )}

            {/* Teacher: edit / cancel / delete */}
            {isTeacher && !isDone && !isCancelled && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {cancelling ? (
                  <div className="rounded-lg border border-gray-100 p-3 space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Why are you cancelling? (optional)</label>
                    <input className="input" placeholder="e.g. school closed that day" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" disabled={busy} onClick={() => cancel.mutate()}>Confirm cancel</Button>
                      <Button variant="outline" size="sm" onClick={() => setCancelling(false)}>Keep session</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCancelling(true)}>
                      <Ban size={14} /> Cancel session
                    </Button>
                    {session.status === "pending" && (
                      <Button variant="ghost" size="sm" disabled={busy}
                        onClick={() => { if (confirm(`Delete session "${session.title}"?`)) remove.mutate() }}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    )}
                  </div>
                )}
                {session.status === "approved" && (
                  <p className="text-xs text-gray-400">Editing an approved session sends it back to your ambassador for re-approval.</p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
