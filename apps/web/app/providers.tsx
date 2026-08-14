"use client"

import { createContext, useContext, useEffect, useState } from "react"

type AppContextType = {
  user: null
  loadingUser: boolean
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

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

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
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
