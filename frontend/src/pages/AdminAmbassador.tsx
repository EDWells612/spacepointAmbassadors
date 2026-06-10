import { useQuery } from "@tanstack/react-query"
import { useParams, Link } from "@tanstack/react-router"
import {
  ArrowLeft, GraduationCap, Users, UserCheck, Target, CheckSquare, ExternalLink,
} from "lucide-react"
import { getAmbassadorStatsApi, getAmbassadorNetworkApi, getAmbassadorPointsLogApi } from "@/api/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner, StatCard, StatusPill, EmptyState } from "@/components/common"
import { TitleProgress, AchievementGrid } from "@/components/title"
import { NetworkTree } from "@/components/network/NetworkTree"

export default function AdminAmbassador() {
  const { ambassadorId } = useParams({ strict: false }) as { ambassadorId: string }

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-ambassador-stats", ambassadorId],
    queryFn: () => getAmbassadorStatsApi(ambassadorId),
  })
  const { data: network } = useQuery({
    queryKey: ["admin-network", ambassadorId],
    queryFn: () => getAmbassadorNetworkApi(ambassadorId),
  })
  const { data: pointsLog = [] } = useQuery({
    queryKey: ["admin-ambassador-points", ambassadorId],
    queryFn: () => getAmbassadorPointsLogApi(ambassadorId),
  })

  if (isLoading || !stats) return <Spinner />

  const a = stats.ambassador
  const o = stats.overview
  const initials = a.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <div>
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-4">
        <ArrowLeft size={16} /> Back to admin
      </Link>

      {/* Identity */}
      <Card className="mb-6">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-black text-white text-xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-black">{a.full_name}</p>
              <StatusPill status={a.status} />
            </div>
            <p className="text-sm text-gray-500">{a.email}{a.country ? ` · ${a.country}` : ""}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.rank != null ? `Rank #${stats.rank} · ` : ""}{stats.points.balance.toLocaleString()} lifetime pts · {stats.points.season.toLocaleString()} this month
              {a.invite_code ? ` · invite ${a.invite_code}` : ""}
            </p>
          </div>
          <a href={`/a/${a.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><ExternalLink size={14} /> Public certificate</Button>
          </a>
        </CardContent>
      </Card>

      {/* Title + points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0"><CardTitle>Title</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <TitleProgress
              current={stats.current_title}
              next={stats.next_title}
              pointsToNext={stats.points_to_next}
              progress={stats.progress_to_next}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Lifetime points</p>
            <p className="text-4xl font-bold text-black font-outfit mt-1">{stats.points.balance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard icon={<GraduationCap size={20} />} label="Sessions Done" value={o.sessions_done} sub={`${o.sessions_pending} pending`} />
        <StatCard icon={<Users size={20} />} label="Students Reached" value={o.students_reached} />
        <StatCard icon={<UserCheck size={20} />} label="Teachers" value={o.active_teachers} sub={`${o.pending_teachers} pending`} />
        <StatCard icon={<UserCheck size={20} />} label="Instructors" value={o.active_instructors} sub={`${o.pending_instructors} pending`} />
        <StatCard icon={<Target size={20} />} label="Leads Converted" value={o.converted_leads} sub={`${o.total_leads} total`} />
        <StatCard icon={<CheckSquare size={20} />} label="Tasks Done" value={o.completed_tasks} sub={`${o.pending_tasks} pending`} />
      </div>

      {/* Badges */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Badges</CardTitle></CardHeader>
        <CardContent><AchievementGrid achievements={stats.achievements} /></CardContent>
      </Card>

      {/* Network */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Network</CardTitle></CardHeader>
        <CardContent>
          {network ? (
            <NetworkTree
              rootName={a.full_name}
              teachers={network.teachers}
              instructors={network.instructors}
              sessions={network.sessions}
            />
          ) : (
            <EmptyState title="Loading network…" />
          )}
        </CardContent>
      </Card>

      {/* Points log */}
      <Card>
        <CardHeader>
          <CardTitle>Points log</CardTitle>
          <p className="text-xs text-gray-400">Every entry that makes up the {stats.points.balance.toLocaleString()} lifetime total.</p>
        </CardHeader>
        <CardContent>
          {pointsLog.length === 0 ? (
            <EmptyState title="No points yet" />
          ) : (
            <div className="divide-y divide-gray-50">
              {pointsLog.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-black truncate">{p.reason}</p>
                    <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${p.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                    {p.amount < 0 ? "" : "+"}{p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
