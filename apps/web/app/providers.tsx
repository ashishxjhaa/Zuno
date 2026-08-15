"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type AppContextType = {
  user: null
  loadingUser: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const router = useRouter()

  const checkSession = async () => {
    // try {
    //   const { data } = await api.get("/api/auth/me")
    //     setUser(data.user)
    // } catch (error) {
    //   setUser(null)
    // } finally {
    //   setLoadingUser(false)
    // }
  }

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password })
      setUser(data.user)
      toast.success("Welcome back!")
      router.push("/")
    } catch (err) {
      console.log("Login failed:", err)
      const errMsg = err?.response?.data?.error || "Invalid email or password"
      toast.error(errMsg)
      throw new Error(errMsg)
    }
  }

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post("/api/auth/register", {
        name,
        email,
        password,
      })
      setUser(data.user)
      toast.success("Account created successfully!")
      router.push("/")
    } catch (err) {
      console.log("Registration failed:", err)
      const errMsg = err?.response?.data?.error || "Registration failed"
      toast.error(errMsg)
      throw new Error(errMsg)
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("UseAppContext must be used within an AppContextProvider")
  }
  return context
}
