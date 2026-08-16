import {
  ArrowLeftIcon,
  Code2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  GlobeIcon,
  Loader2Icon,
} from "lucide-react"
import Image from "next/image"

const BuilderHeader = ({
  projectName,
  version,
  showCode,
  publishing,
  onToggleShowCode,
  onOpenPreview,
  onPublish,
  onDownload,
  onBack,
  onLogout,
}) => {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="cursor-pointer rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <Image src="/" alt="" className="size-5 invert" />
        <span className="max-w-38 truncate text-sm font-semibold md:max-w-50">
          {projectName}
        </span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          v{version}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleShowCode}
          className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 ${
            showCode ? "bg-zinc-100 text-zinc-900" : "bg-white"
          }`}
        >
          {showCode ? (
            <>
              <EyeIcon size={13} /> Preview
            </>
          ) : (
            <>
              <Code2Icon size={13} /> Code
            </>
          )}
        </button>
        <button
          onClick={onOpenPreview}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ExternalLinkIcon size={13} /> Open Preview
        </button>

        <button
          onClick={onPublish}
          disabled={publishing}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing ? (
            <Loader2Icon size={13} className="animate-spin" />
          ) : (
            <GlobeIcon size={13} />
          )}{" "}
          Publish
        </button>

        <button
          onClick={onDownload}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <DownloadIcon size={13} /> Export
        </button>

        <button
          onClick={onLogout}
          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export default BuilderHeader
