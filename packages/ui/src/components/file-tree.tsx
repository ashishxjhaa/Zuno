"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  ChevronDownIcon,
  FileCode2Icon,
  FileIcon,
  FileJsonIcon,
  FileTextIcon,
  FileType2Icon,
  FolderIcon,
  FolderOpenIcon,
  ImageIcon,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type FileTreeItem = {
  name: string
  type: "file" | "folder"
  extension?: string
  path?: string
  children?: FileTreeItem[]
}

type FileTreeProps = {
  data: FileTreeItem[]
  selectedPath?: string
  onFileSelect?: (path: string) => void
  defaultOpenPaths?: string[]
  className?: string
  title?: string
}

export function FileTree({
  data,
  selectedPath,
  onFileSelect,
  defaultOpenPaths,
  className,
  title = "Explorer",
}: FileTreeProps) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(defaultOpenPaths ?? collectFolderPaths(data))
  )

  useEffect(() => {
    if (!defaultOpenPaths?.length) return
    setOpen((current) => {
      const next = new Set(current)
      for (const path of defaultOpenPaths) next.add(path)
      return next
    })
  }, [defaultOpenPaths])

  const toggle = (path: string) => {
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-sm border border-zinc-200/80 bg-[#fafafa] text-zinc-800 shadow-[0_8px_30px_rgba(15,17,21,0.06)]",
        className
      )}
    >
      <div className="relative flex h-9 shrink-0 items-center border-b border-zinc-200/80 px-3">
        <div className="flex items-center gap-1.5">
          <span className="size-[9px] rounded-full bg-[#ff5f57]" />
          <span className="size-[9px] rounded-full bg-[#febc2e]" />
          <span className="size-[9px] rounded-full bg-[#28c840]" />
        </div>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-medium tracking-wide text-zinc-400">
          {title}
        </span>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {data.map((item) => (
          <TreeRow
            key={item.path ?? item.name}
            item={item}
            depth={0}
            open={open}
            selectedPath={selectedPath}
            onToggle={toggle}
            onFileSelect={onFileSelect}
          />
        ))}
      </div>
    </div>
  )
}

function TreeRow({
  item,
  depth,
  open,
  selectedPath,
  onToggle,
  onFileSelect,
}: {
  item: FileTreeItem
  depth: number
  open: Set<string>
  selectedPath?: string
  onToggle: (path: string) => void
  onFileSelect?: (path: string) => void
}) {
  const path = item.path ?? item.name
  const isFolder = item.type === "folder"
  const isOpen = isFolder && open.has(path)
  const isSelected = !isFolder && selectedPath === path
  const paddingLeft = 8 + depth * 14

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isFolder) onToggle(path)
          else onFileSelect?.(path)
        }}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-left font-mono text-[12px] tracking-tight transition-[background-color,box-shadow,color] duration-150",
          isSelected
            ? "bg-[#ff5800]/12 text-zinc-950 shadow-[0_0_16px_rgba(255,88,0,0.16)]"
            : "text-zinc-600 hover:bg-zinc-900/[0.04] hover:text-zinc-950 hover:shadow-[0_0_18px_rgba(255,88,0,0.08)]"
        )}
        style={{ paddingLeft }}
      >
        {isFolder ? (
          <ChevronDownIcon
            className={cn(
              "size-3 shrink-0 text-zinc-400 transition-transform duration-200",
              !isOpen && "-rotate-90"
            )}
          />
        ) : (
          <span className="size-3 shrink-0" />
        )}
        <FileGlyph
          item={item}
          open={isOpen}
          active={isSelected}
        />
        <span className="truncate">{item.name}</span>
      </button>
      <AnimatePresence initial={false}>
        {isFolder && isOpen && item.children?.length ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <TreeRow
                key={child.path ?? child.name}
                item={child}
                depth={depth + 1}
                open={open}
                selectedPath={selectedPath}
                onToggle={onToggle}
                onFileSelect={onFileSelect}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function FileGlyph({
  item,
  open,
  active,
}: {
  item: FileTreeItem
  open: boolean
  active: boolean
}) {
  if (item.type === "folder") {
    return open ? (
      <FolderOpenIcon className="size-3.5 shrink-0 text-zinc-800" />
    ) : (
      <FolderIcon className="size-3.5 shrink-0 text-zinc-800" />
    )
  }

  const ext = (item.extension ?? item.name.split(".").pop() ?? "").toLowerCase()
  const className = cn("size-3.5 shrink-0", active && "drop-shadow-[0_0_6px_rgba(255,88,0,0.45)]")

  if (ext === "tsx" || ext === "jsx") {
    return <FileCode2Icon className={cn(className, "text-sky-500")} />
  }
  if (ext === "ts") {
    return <FileType2Icon className={cn(className, "text-blue-500")} />
  }
  if (ext === "js") {
    return <FileCode2Icon className={cn(className, "text-amber-500")} />
  }
  if (ext === "json") {
    return <FileJsonIcon className={cn(className, "text-yellow-500")} />
  }
  if (ext === "css" || ext === "scss") {
    return <FileType2Icon className={cn(className, "text-violet-500")} />
  }
  if (ext === "md" || ext === "txt") {
    return <FileTextIcon className={cn(className, "text-zinc-400")} />
  }
  if (["svg", "png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) {
    return <ImageIcon className={cn(className, "text-emerald-500")} />
  }
  return <FileIcon className={cn(className, "text-zinc-400")} />
}

function collectFolderPaths(items: FileTreeItem[], acc: string[] = []) {
  for (const item of items) {
    if (item.type !== "folder") continue
    const path = item.path ?? item.name
    acc.push(path)
    if (item.children) collectFolderPaths(item.children, acc)
  }
  return acc
}
