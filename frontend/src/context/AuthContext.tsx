import { createContext, useContext, useState, useEffect } from "react"
import type { ReactNode } from "react"
import type { User } from "@/types"
import { loginApi, getMeApi } from "@/api/auth"

interface AuthContextType {
  currentUser: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setCurrentUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      getMeApi()
        .then(setCurrentUser)
        .catch(() => {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const tokens = await loginApi(email, password)
    localStorage.setItem("access_token", tokens.access_token)
    localStorage.setItem("refresh_token", tokens.refresh_token)
    setCurrentUser(await getMeApi())
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
