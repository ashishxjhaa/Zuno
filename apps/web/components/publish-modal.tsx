import { XIcon } from "lucide-react"
import { toast } from "sonner"

const PublishModal = ({ publishUrl, onClose }) => {
  const handleCopyLink = () => {
    if (!publishUrl) return
    navigator.clipboard.writeText(publishUrl)
    toast.success("Public link copied to clipboard!")
  }
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer text-zinc-400 hover:text-zinc-900"
        >
          <XIcon size={16} />
        </button>

        <div className="mb-6">
          <h3 className="mb-1 text-lg font-medium text-zinc-900">
            Your website is live!
          </h3>
          <p className="text-sm text-zinc-500">
            Anyone with the link below can view your published site.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-widest text-zinc-400 uppercase">
              Published Link
            </label>

            <input
              type="text"
              readOnly
              value={publishUrl}
              className="w-full border-b border-zinc-200 bg-transparent px-0 py-2 text-sm text-zinc-900 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 cursor-pointer rounded-lg bg-zinc-950 py-2 text-center text-xs font-medium text-white hover:bg-zinc-800"
            >
              Copy Link
            </button>

            <button
              onClick={() => window.open(publishUrl, "_blank")}
              className="flex-1 cursor-pointer rounded-lg border border-zinc-200 py-2 text-center text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Open Site
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublishModal
