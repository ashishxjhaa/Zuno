"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { frontend } from "@/lib/api"

type User = {
  id: string
  name: string
  email: string
}

const SessionContext = createContext<{
  user: User | null
  isLoading: boolean
  signin: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  signout: () => Promise<void>
} | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    frontend
      .get("/api/v1/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function signin(email: string, password: string) {
    const res = await frontend.post("/api/v1/auth/signin", { email, password })
    setUser(res.data.user)
  }

  async function signup(name: string, email: string, password: string) {
    await frontend.post("/api/v1/auth/signup", { name, email, password })
  }

  async function signout() {
    await frontend.post("/api/v1/auth/signout")
    setUser(null)
  }

  return (
    <SessionContext.Provider
      value={{ user, isLoading, signin, signup, signout }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
