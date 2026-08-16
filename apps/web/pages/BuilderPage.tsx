import { useAppContext } from "@/app/providers"
import BuilderHeader from "@/components/builder-header"
import ChatPanel from "@/components/chat-panel"
import FileExplorer from "@/components/file-explorer"
import Loading from "@/components/loading"
import PreviewPanel from "@/components/preview-panel"
import PublishModal from "@/components/publish-modal"
import { FolderTreeIcon, MessageSquareIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const BuilderPage = () => {
  const { id } = useParams()
  const router = useRouter()
  const [leftTab, setLeftTab] = useState("chat")
  const [publishing, setPublishing] = useState(false)
  const [publishUrl, setPublishUrl] = useState(null)

  const {
    activeProject,
    loadingActiveProject,
    activeFile,
    showCode,
    setActiveFile,
    setShowCode,
    loadProject,
    logout,
    chatLoading,
    handleChat,
  } = useAppContext()

  useEffect(() => {
    if (!id) return
    loadProject(id)
  }, [id])

  const handleOpenPreview = () => {
    if (!id) return
    window.open(`/preview/${id}`, "_blank")
  }

  const handlePublish = async () => {
    if (!id) return
    setPublishing(true)
    try {
      await api.post(`/api/projects/${id}/publish`)
      const url = `${window.location.origin}/publish/${id}`
      setPublishUrl(url)
      toast.success("Website published successfully!")
    } catch (err) {
      console.error("Publish failed:", err)
      toast.error(err?.response?.data?.error || "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  const handleDownload = () => {
    if (!activeProject) return
    // exportProjectZip(activeProject)
  }

  if (loadingActiveProject || !activeProject) {
    return <Loading />
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-white text-zinc-900">
      <BuilderHeader
        projectName={activeProject.name}
        version={activeProject.version}
        showCode={showCode}
        publishing={publishing}
        onToggleShowCode={() => setShowCode(!showCode)}
        onOpenPreview={handleOpenPreview}
        onPublish={handlePublish}
        onDownload={handleDownload}
        onBack={() => router.back()}
        onLogout={logout}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-[320px] shrink-0 flex-col border-r border-zinc-200 bg-white">
          <div className="border-inc-100 flex border-b">
            <button
              onClick={() => setLeftTab("chat")}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${leftTab === "chat" ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}
            >
              <MessageSquareIcon size={13} /> Chat
            </button>

            <button
              onClick={() => setLeftTab("files")}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${leftTab === "files" ? "border-b-2 border-zinc-900 text-zinc-900" : "text-zinc-400 hover:text-zinc-700"}`}
            >
              <FolderTreeIcon size={13} /> Files
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === "chat" ? (
              <ChatPanel
                messages={activeProject.messages}
                onSend={handleChat}
                loading={chatLoading}
              />
            ) : (
              <FileExplorer
                files={activeProject.files}
                activeFile={activeFile}
                onFileSelect={(path) => {
                  setActiveFile(path)
                  setShowCode(true)
                }}
              />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeProject.status === "pending" ||
          activeProject.status === "generating" ||
          activeProject.status === "failed" ? (
            <Loading />
          ) : (
            <PreviewPanel
              project={activeProject}
              activeFile={activeFile}
              showCode={showCode}
            />
          )}
        </div>
      </div>

      {publishUrl && (
        <PublishModal
          publishUrl={publishUrl}
          onClose={() => setPublishUrl(null)}
        />
      )}
    </div>
  )
}

export default BuilderPage
