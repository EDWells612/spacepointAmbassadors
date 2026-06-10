import { useEffect, useState } from "react"
import { useParams } from "@tanstack/react-router"
import logo from "@/assets/logo.svg"
import api from "@/api/client"
import { TitleBadge } from "@/components/title"
import { DynamicIcon } from "@/components/icons"

interface PublicProfileData {
  name: string
  country: string | null
  member_since: string | null
  points: number
  title: { id: string; name: string; min_points: number; icon: string | null; color: string | null } | null
  impact: {
    active_teachers?: number
    active_instructors?: number
    sessions_done: number
    students_reached: number
    converted_leads?: number
  }
  badges: { code: string; label: string; description: string; icon: string }[]
}

export default function PublicProfile({ kind = "ambassador" }: { kind?: "ambassador" | "teacher" }) {
  const params = useParams({ strict: false }) as { ambassadorId?: string; teacherId?: string }
  const id = kind === "teacher" ? params.teacherId : params.ambassadorId
  const [data, setData] = useState<PublicProfileData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<PublicProfileData>(`/public/${kind}/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError(true))
  }, [id, kind])

  if (error) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">{kind === "teacher" ? "Teacher" : "Ambassador"} not found.</div>
  }
  if (!data) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  }

  const impact: [string, number][] =
    kind === "teacher"
      ? [
          ["Students reached", data.impact.students_reached],
          ["Sessions delivered", data.impact.sessions_done],
        ]
      : [
          ["Students reached", data.impact.students_reached],
          ["Sessions delivered", data.impact.sessions_done],
          ["Active teachers", data.impact.active_teachers ?? 0],
          ["Active instructors", data.impact.active_instructors ?? 0],
          ["Leads converted", data.impact.converted_leads ?? 0],
        ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-snuff/30 to-white flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 justify-center mb-8">
          <img src={logo} alt="SpacePoint" className="h-10 w-auto object-contain" />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-lg p-8 text-center">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">{kind === "teacher" ? "Teacher Certificate" : "Ambassador Certificate"}</p>
          <h1 className="text-3xl font-bold text-black font-outfit">{data.name}</h1>
          {data.country && <p className="text-sm text-gray-500 mt-1">{data.country}</p>}
          <div className="mt-4 flex justify-center"><TitleBadge title={data.title} /></div>
          <p className="text-sm text-gray-500 mt-3">{data.points.toLocaleString()} lifetime points</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
            {impact.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4">
                <p className="text-2xl font-bold text-black font-outfit">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {data.badges.length > 0 && (
            <div className="mt-8">
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Badges</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {data.badges.map((b) => (
                  <span key={b.code} className="inline-flex items-center gap-1.5 rounded-full border border-heliotrope/40 bg-snuff/20 px-3 py-1 text-xs font-semibold text-affair">
                    <DynamicIcon name={b.icon} size={13} /> {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.member_since && (
            <p className="text-xs text-gray-400 mt-8">
              Member since {new Date(data.member_since).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
