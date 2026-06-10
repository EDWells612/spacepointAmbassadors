import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight font-outfit">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 flex items-center gap-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="w-11 h-11 rounded-xl bg-snuff/40 text-affair flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-black font-outfit leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  // generic
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  submitted: "bg-amber-50 text-amber-600 border-amber-200",
  "in review": "bg-blue-50 text-blue-600 border-blue-200",
  accepted: "bg-blue-50 text-blue-600 border-blue-200",
  approved: "bg-green-50 text-green-600 border-green-200",
  active: "bg-green-50 text-green-600 border-green-200",
  converted: "bg-green-50 text-green-600 border-green-200",
  done: "bg-green-50 text-green-600 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
  edit_requested: "bg-purple-50 text-purple-600 border-purple-200",
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500 border-gray-200"
      )}
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <p className="text-base font-semibold text-black">{title}</p>
      {hint && <p className="text-sm text-gray-400 mt-1 max-w-xs">{hint}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
