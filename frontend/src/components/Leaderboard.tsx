import { Medal } from "lucide-react"
import type { LeaderboardEntry } from "@/types"
import { cn } from "@/lib/utils"
import { EmptyState } from "./common"

// Monochrome podium shades for ranks 1, 2, 3.
const MEDAL_SHADES = ["text-gray-900", "text-gray-500", "text-gray-400"]

export function LeaderboardTable({
  rows,
  highlightId,
  myRank,
  onRowClick,
}: {
  rows: LeaderboardEntry[]
  highlightId?: string
  myRank?: number
  onRowClick?: (id: string) => void
}) {
  if (!rows.length) return <EmptyState title="No leaderboard data yet" />

  const inTop = highlightId ? rows.some((r) => r.id === highlightId) : true

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-100">
            <th className="py-2.5 pr-3 font-semibold">#</th>
            <th className="py-2.5 pr-3 font-semibold">Ambassador</th>
            <th className="py-2.5 pr-3 font-semibold">Country</th>
            <th className="py-2.5 pr-3 font-semibold text-center">Teachers</th>
            <th className="py-2.5 pr-3 font-semibold text-center">Sessions</th>
            <th className="py-2.5 pr-3 font-semibold text-center">Students</th>
            <th className="py-2.5 pr-3 font-semibold text-center">Converted</th>
            <th className="py-2.5 pr-3 font-semibold text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const me = r.id === highlightId
            return (
              <tr
                key={r.id}
                onClick={onRowClick ? () => onRowClick(r.id) : undefined}
                className={cn(
                  "border-b border-gray-50 last:border-0",
                  me && "bg-snuff/20",
                  onRowClick && "cursor-pointer hover:bg-gray-50"
                )}
              >
                <td className="py-2.5 pr-3 font-bold text-gray-500">
                  {i < 3 ? <Medal size={18} className={cn("inline", MEDAL_SHADES[i])} strokeWidth={2.2} /> : `#${i + 1}`}
                </td>
                <td className="py-2.5 pr-3 font-semibold text-black">{r.name}{me && " (you)"}</td>
                <td className="py-2.5 pr-3 text-gray-500">{r.country}</td>
                <td className="py-2.5 pr-3 text-center text-black">{r.teachers}</td>
                <td className="py-2.5 pr-3 text-center text-green-600 font-semibold">{r.sessions_done}</td>
                <td className="py-2.5 pr-3 text-center text-black">{r.students_reached}</td>
                <td className="py-2.5 pr-3 text-center text-blue-600 font-semibold">{r.converted_leads}</td>
                <td className="py-2.5 pr-3 text-right font-bold text-affair">{r.points.toLocaleString()}</td>
              </tr>
            )
          })}
          {!inTop && myRank && (
            <tr className="border-t-2 border-heliotrope bg-snuff/30">
              <td className="py-2.5 pr-3 font-bold text-affair">#{myRank}</td>
              <td className="py-2.5 pr-3 font-semibold text-black" colSpan={7}>You</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
