"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { PublicUser, SigninInput, SignupInput } from "@workspace/shared"
import {
  AuthError,
  clearMockUser,
  readMockUser,
  signinMockUser,
  signupMockUser,
} from "@/lib/auth"

type SessionContextValue = {
  user: PublicUser | null
  isLoading: boolean
  signin: (input: SigninInput) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  signout: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setUser(readMockUser())
    setIsLoading(false)
  }, [])

  const signin = useCallback(async (input: SigninInput) => {
    setUser(signinMockUser(input.email))
  }, [])

  const signup = useCallback(async (input: SignupInput) => {
    setUser(signupMockUser(input.name, input.email))
  }, [])

  const signout = useCallback(() => {
    clearMockUser()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, signin, signup, signout }),
    [user, isLoading, signin, signup, signout]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}

export { AuthError }
