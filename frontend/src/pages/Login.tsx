import { useState } from "react"
import logo from "@/assets/logo.svg"
import { Link, useNavigate } from "@tanstack/react-router"

import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate({ to: "/" })
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 justify-center">
          <img src={logo} alt="SpacePoint" className="h-10 w-auto object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-black mb-1 tracking-tight">Sign in</h1>
        <p className="text-sm text-gray-500 mb-8">Welcome back, ambassador.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1.5" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@space.com"
              required
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1.5" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          New ambassador?{" "}
          <Link to="/apply" className="text-heliotrope font-semibold hover:underline">
            Apply here
          </Link>
        </p>
      </div>
    </div>
  )
}
