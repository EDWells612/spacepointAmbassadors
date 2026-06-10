import { useState } from "react"
import { useParams, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, GraduationCap, Users, CheckSquare } from "lucide-react"
import { getTeacherApi, getTeacherSessionsApi } from "@/api/network"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner, StatCard, StatusPill, EmptyState } from "@/components/common"
import { SessionDetailModal } from "@/components/SessionDetailModal"
import type { TeacherSession } from "@/types"

export default function TeacherProfile() {
  const { teacherId } = useParams({ strict: false }) as { teacherId: string }
  const [selectedSession, setSelectedSession] = useState<TeacherSession | null>(null)

  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ["network-teacher", teacherId],
    queryFn: () => getTeacherApi(teacherId),
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["network-teacher-sessions", teacherId],
    queryFn: () => getTeacherSessionsApi(teacherId),
  })

  if (teacherLoading || !teacher) return <Spinner />

  const initials = teacher.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  const done = sessions.filter(s => s.status === "done")
  const totalAttended = done.reduce((sum, s) => sum + (s.attended_students ?? 0), 0)
  const totalPlanned = sessions.filter(s => s.status !== "cancelled").reduce((sum, s) => sum + (s.planned_students ?? 0), 0)

  return (
    <div>
      <Link to="/network" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-4">
        <ArrowLeft size={16} /> Back to network
      </Link>

      {/* Identity */}
      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black text-white text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-black">{teacher.full_name}</p>
              <StatusPill status={teacher.status} />
            </div>
            <p className="text-sm text-gray-500">{teacher.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Joined {new Date(teacher.created_at).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard icon={<GraduationCap size={20} />} label="Sessions Done" value={done.length} sub={`${sessions.filter(s => s.status === "pending").length} pending`} />
        <StatCard icon={<Users size={20} />} label="Students Reached" value={totalAttended} sub={`${totalPlanned} planned`} />
        <StatCard icon={<CheckSquare size={20} />} label="Total Sessions" value={sessions.filter(s => s.status !== "cancelled").length} sub={`${sessions.filter(s => s.status === "cancelled").length} cancelled`} />
      </div>

      {/* Sessions */}
      <Card>
        <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Spinner />
          ) : sessions.length === 0 ? (
            <EmptyState title="No sessions yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {[...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className="w-full flex items-center justify-between py-3 gap-2 text-left hover:bg-gray-50 rounded-lg px-1"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-black truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.date).toLocaleDateString()}
                      {s.status === "done" ? ` · ${s.attended_students} students` : ` · ${s.planned_students} planned`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.status === "pending" && <span className="w-2 h-2 rounded-full bg-heliotrope" title="Needs review" />}
                    <StatusPill status={s.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSession && (
        <SessionDetailModal session={selectedSession} role="manager" onClose={() => setSelectedSession(null)} />
      )}
    </div>
  )
}
