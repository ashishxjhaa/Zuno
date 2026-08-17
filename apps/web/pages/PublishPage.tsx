import FullPagePreview from "@/components/fullpage-preview"
import Loading from "@/components/loading"
import { AlertCircleIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const PublishPage = () => {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!id) return

    const fetchPublishProject = async () => {
      try {
        const { data } = await api.get(`/api/projects/public/${id}`)
        setProject(data)
      } catch (err) {
        console.error("Failed to load public project:", err)
        setError(
          err?.response?.data?.error ||
            "This website is not available or is not published yet."
        )
      } finally {
        setLoading(false)
      }
    }
    fetchPublishProject()
  }, [id])

  if (loading) {
    return <Loading />
  }

  if (error || !project) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircleIcon size={24} />
        </div>
        <h1 className="mb-1.5 text-lg font-semibold text-zinc-900">
          Webiste Unavailable
        </h1>
        <p className="mb-6 max-w-sm text-sm leading-relaxed text-zinc-500">
          {error}
        </p>
        <div className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
          Zuno
        </div>
      </div>
    )
  }

  return <FullPagePreview files={project.files} />
}

export default PublishPage
