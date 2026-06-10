import { Navigate } from "@tanstack/react-router"
import { useAuth } from "@/context/AuthContext"

export default function Home() {
  const { currentUser } = useAuth()
  if (!currentUser) return <Navigate to="/login" />
  if (currentUser.role === "admin") return <Navigate to="/admin" />
  if (currentUser.role === "teacher") return <Navigate to="/teacher" />
  return <Navigate to="/dashboard" />
}
