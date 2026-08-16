"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import debounce from "lodash.debounce"

type AppContextType = {
  user: null
  loadingUser: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  projects: any[]
  loadingProjects: boolean
  activeProject: any | null
  loadingActiveProject: boolean
  chatLoading: boolean
  generatingProject: boolean
  activeFile: string
  setActiveFile: React.Dispatch<React.SetStateAction<string>>
  showCode: boolean
  setShowCode: React.Dispatch<React.SetStateAction<boolean>>
  loadProjects: () => Promise<void>
  loadProject: (id: string, silent?: boolean) => Promise<void>
  handleGenerate: (prompt: string) => Promise<void>
  handleDelete: (id: string) => Promise<void>
  handleChat: (prompt: string) => Promise<void>
  updateProjectFiles: (files: Record<string, string>) => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [activeProject, setActiveProject] = useState(null)
  const [loadingActiveProject, setLoadingActiveProject] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [generatingProject, setGeneratingProject] = useState(false)
  const [activeFile, setActiveFile] = useState("/App.ts")
  const [showCode, setShowCode] = useState(false)

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
  }, [])

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password })
      setUser(data.user)
      toast.success("Welcome back!")
      router.push("/")
    } catch (err) {
      console.error("Login failed:", err)
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
      console.error("Registration failed:", err)
      const errMsg = err?.response?.data?.error || "Registration failed"
      toast.error(errMsg)
      throw new Error(errMsg)
    }
  }

  const logout = async () => {
    try {
      await api.post("/api/auth/logout")
      setUser(null)
      setProjects([])
      setActiveProject(null)
      toast.success("Logged out successfully")
      router.push("/login")
    } catch (err) {
      console.error("Logout failed:", err)
      toast.error("Logout failed")
    }
  }

  const loadProjects = async () => {
    if (!user) return
    try {
      const { data } = await api.get("/api/projects")
      setProjects(data)
    } catch (err) {
      console.error("Failed to list projects:", err)
      toast.error("Failed to load projects list")
    } finally {
      setLoadingProjects(false)
    }
  }

  const loadProject = async (id, silent = false) => {
    if (!user) return
    if (!silent) setLoadingActiveProject(true)
    try {
      const { data } = await api.get(`/api/projects/${id}`)
      setActiveProject(data)

      const files = Object.keys(data.files)
      if (files.length > 0) {
        setActiveFile((prev) => {
          if (files.includes(prev)) return prev
          if (files.includes("/App.ts")) return "/App.ts"
          return files[0]
        })
      }
    } catch (err) {
      console.error("Failed to load project:", err)
      if (!silent) {
        toast.error("Failed to load project details")
        router.push("/")
      }
    } finally {
      if (!silent) setLoadingActiveProject(false)
    }
  }

  useEffect(() => {
    if (!activeProject?._id || !user) return

    const isOngoing =
      activeProject.status === "generating" ||
      activeProject.status === "pending" ||
      activeProject.status === "revising"

    if (isOngoing) {
      setChatLoading(true)
      const interval = setInterval(() => {
        loadProject(activeProject._id, true)
      }, 2000)
      return () => clearInterval(interval)
    } else {
      setChatLoading(false)
    }
  }, [activeProject?._id, activeProject?.status, loadProject, user])

  const handleGenerate = useCallback(
    async (prompt) => {
      if (!user) return

      setGeneratingProject(true)
      try {
        const { data } = await api.post("/api/projects", { prompt })
        toast.success("AI Agent is planning structure...")
        router.push(`/builder/${data._id}`)
      } catch (err) {
        console.error("Failed to generate project:", err)
        toast.error(err?.response?.data?.error || "Failed to generate project")
      } finally {
        setGeneratingProject(false)
      }
    },
    [router, user]
  )

  const handleDelete = useCallback(
    async (id) => {
      if (!user) return

      try {
        await api.delete(`/api/projects/${id}`)
        setProjects((prev) => prev.filter((p) => p._id !== id))
        toast.success("Project deleted successfully")
      } catch (err) {
        console.error("Failed to delete project:", err)
        toast.error("Failed to delete project")
      }
    },
    [user]
  )

  const handleChat = useCallback(
    async (prompt) => {
      if (!activeProject || !user) return
      setChatLoading(true)
      try {
        const { data } = await api.post(
          `/api/projects/${activeProject._id}/chat`,
          { prompt }
        )
        setActiveProject(data)
        if (data.errors && data.lenght > 0) {
          toast.error(`${data.error.length} revision patch(es) failed`)
        } else {
          toast.success(`Updated to version ${data.version}`)
        }
      } catch (err) {
        console.error("Revision request failed:", err)
        toast.error(err?.response?.data?.error || "Revision request failed")
      } finally {
        setChatLoading(false)
      }
    },
    [activeProject, user]
  )

  const debouncedSave = React.useMemo(
    () =>
      debounce(async (files, id) => {
        try {
          await api.put(`/api/projects/${id}/files`, { files })
        } catch (err) {
          console.error("Failed to auto-save files:", err)
          toast.error("Failed to save code modifications")
        }
      }, 1000),
    []
  )

  useEffect(() => {
    return () => {
      debouncedSave.flush()
    }
  }, [debouncedSave])

  const updateProjectFiles = useCallback(
    async (files) => {
      if (!activeProject || !user) return
      debouncedSave(files, activeProject._id)
    },
    [activeProject, user, debouncedSave]
  )

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        login,
        register,
        logout,
        projects,
        loadingProjects,
        activeProject,
        loadingActiveProject,
        chatLoading,
        generatingProject,
        activeFile,
        setActiveFile,
        showCode,
        setShowCode,
        loadProjects,
        loadProject,
        handleGenerate,
        handleDelete,
        handleChat,
        updateProjectFiles,
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
