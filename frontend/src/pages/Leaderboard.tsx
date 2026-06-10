import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Medal } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getAdminLeaderboardApi } from "@/api/admin"
import { getDashboardStatsApi } from "@/api/dashboard"
import { getTeacherLeaderboardApi } from "@/api/teacher"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, Spinner, EmptyState } from "@/components/common"
import { LeaderboardTable } from "@/components/Leaderboard"

const MEDAL_SHADES = ["text-gray-900", "text-gray-500", "text-gray-400"]

export default function LeaderboardPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const isAdmin = currentUser?.role === "admin"
  const isTeacher = currentUser?.role === "teacher"
  const [season, setSeason] = useState(false)

  if (isTeacher) return <TeacherLeaderboard meId={currentUser?.id} />

  // Admins get the full board; ambassadors reuse their dashboard board.
  const adminQuery = useQuery({
    queryKey: ["admin-leaderboard", season],
    queryFn: () => getAdminLeaderboardApi(season),
    enabled: isAdmin,
  })
  const dashQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardStatsApi,
    enabled: !isAdmin,
  })

  const rows = isAdmin
    ? adminQuery.data ?? []
    : (season ? dashQuery.data?.season_leaderboard : dashQuery.data?.leaderboard) ?? []
  const loading = isAdmin ? adminQuery.isLoading : dashQuery.isLoading

  return (
    <div>
      <PageHeader title="Leaderboard" subtitle="Ambassadors ranked by points earned." />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{season ? "This month" : "All-time"}</CardTitle>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            <button onClick={() => setSeason(false)} className={!season ? "px-3 py-1.5 bg-black text-white" : "px-3 py-1.5 text-gray-500"}>All-time</button>
            <button onClick={() => setSeason(true)} className={season ? "px-3 py-1.5 bg-black text-white" : "px-3 py-1.5 text-gray-500"}>This month</button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Spinner />
          ) : (
            <LeaderboardTable
              rows={rows}
              highlightId={currentUser?.id}
              myRank={dashQuery.data?.my_rank}
              onRowClick={isAdmin ? (id) => navigate({ to: "/admin/ambassador/$ambassadorId", params: { ambassadorId: id } }) : undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TeacherLeaderboard({ meId }: { meId?: string }) {
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["teacher-leaderboard"], queryFn: getTeacherLeaderboardApi })

  return (
    <div>
      <PageHeader title="Teacher Leaderboard" subtitle="Teachers ranked by students reached." />
      <Card>
        <CardContent>
          {isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No teachers yet" />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2.5 pr-3 font-semibold">#</th>
                    <th className="py-2.5 pr-3 font-semibold">Teacher</th>
                    <th className="py-2.5 pr-3 font-semibold">Country</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">Sessions</th>
                    <th className="py-2.5 pr-3 font-semibold text-center">Points</th>
                    <th className="py-2.5 pr-3 font-semibold text-right">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t, i) => {
                    const me = t.id === meId
                    return (
                      <tr key={t.id} className={`border-b border-gray-50 last:border-0 ${me ? "bg-snuff/20" : ""}`}>
                        <td className="py-2.5 pr-3 font-bold text-gray-500">
                          {i < 3 ? <Medal size={18} className={`inline ${MEDAL_SHADES[i]}`} strokeWidth={2.2} /> : `#${i + 1}`}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-black">{t.name}{me && " (you)"}</td>
                        <td className="py-2.5 pr-3 text-gray-500">{t.country}</td>
                        <td className="py-2.5 pr-3 text-center text-green-600 font-semibold">{t.sessions_done}</td>
                        <td className="py-2.5 pr-3 text-center text-affair font-semibold">{t.points.toLocaleString()}</td>
                        <td className="py-2.5 pr-3 text-right font-bold text-black">{t.students_reached.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
