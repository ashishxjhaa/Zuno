import { useAppContext } from "@/app/providers"
import FullPagePreview from "@/components/fullpage-preview"
import Loading from "@/components/loading"
import { AlertCircleIcon } from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

const PreviewPage = () => {
  const { id } = useParams()
  const {
    activeProject: project,
    loadingActiveProject: loading,
    loadProject,
  } = useAppContext()

  useEffect(() => {
    if (id) {
      loadProject(id)
    }
  }, [id])

  if (loading || !project) {
    return <Loading />
  }

  return <FullPagePreview files={project.files} />
}

export default PreviewPage
