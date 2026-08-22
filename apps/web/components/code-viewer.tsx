"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckIcon,
  CopyIcon,
  FileCode2Icon,
  FileIcon,
  FileJsonIcon,
  FileTextIcon,
  FileType2Icon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function CodeViewer({ files }: { files: Record<string, string> }) {
  const paths = useMemo(() => Object.keys(files).sort(), [files])
  const [activePath, setActivePath] = useState(paths[0] ?? "")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!paths.includes(activePath)) {
      setActivePath(paths[0] ?? "")
    }
  }, [paths, activePath])

  const contents = files[activePath] ?? ""
  const language = getLanguage(activePath)
  const tree = useMemo(() => buildTree(paths), [paths])
  const openFolders = useMemo(() => getOpenFolders(activePath, tree), [activePath, tree])

  const copy = async () => {
    await navigator.clipboard.writeText(contents)
    setCopied(true)
    toast.success("Copied")
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="no-scrollbar flex w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-[#161614]">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Explorer
          </span>
          <span className="rounded bg-[#ff5800]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#ff5800]">
            {paths.length}
          </span>
        </div>
        <div className="flex-1 p-2">
          {tree.children.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              onSelect={setActivePath}
              openFolders={openFolders}
            />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-[#0d0d0c]">
        <div className="flex items-center justify-between border-b border-border bg-[#161614] px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <FileIconFor path={activePath} className="size-3.5 text-muted-foreground" />
            <p className="truncate text-xs text-foreground">{activePath || "No file selected"}</p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={() => void copy()}>
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            Copy
          </Button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-auto p-4">
          {activePath ? (
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              showLineNumbers
              lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#6e7681" }}
              customStyle={{
                margin: 0,
                padding: 0,
                background: "transparent",
                fontSize: "13px",
                lineHeight: "1.6",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              }}
            >
              {contents || "// No content"}
            </SyntaxHighlighter>
          ) : (
            <p className="text-sm text-muted-foreground">Select a file to view code.</p>
          )}
        </div>
      </div>
    </div>
  )
}

type TreeNode = {
  name: string
  path: string
  type: "file" | "folder"
  children: TreeNode[]
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] }

  for (const fullPath of paths) {
    const parts = fullPath.split("/").filter(Boolean)
    let current = root
    let builtPath = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      builtPath = builtPath ? `${builtPath}/${part}` : part
      const isLast = i === parts.length - 1
      const targetType = isLast ? "file" : "folder"

      let child = current.children.find((c) => c.name === part && c.type === targetType)
      if (!child) {
        child = { name: part, path: builtPath, type: targetType, children: [] }
        current.children.push(child)
        current.children.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === "folder" ? -1 : 1
        })
      }
      current = child
    }
  }

  return root
}

function getOpenFolders(activePath: string, tree: TreeNode): Set<string> {
  const open = new Set<string>()
  if (!activePath) return open

  function walk(node: TreeNode, pathParts: string[]): boolean {
    if (node.type === "file") return node.path === activePath
    let hasActive = false
    for (const child of node.children) {
      if (walk(child, [...pathParts, child.name])) {
        hasActive = true
      }
    }
    if (hasActive && node.path) open.add(node.path)
    return hasActive
  }

  walk(tree, [])
  return open
}

function TreeNodeItem({
  node,
  depth,
  activePath,
  onSelect,
  openFolders,
}: {
  node: TreeNode
  depth: number
  activePath: string
  onSelect: (path: string) => void
  openFolders: Set<string>
}) {
  const [isOpen, setIsOpen] = useState(() => openFolders.has(node.path) || depth === 0)

  useEffect(() => {
    if (openFolders.has(node.path)) {
      setIsOpen(true)
    }
  }, [node.path, openFolders])

  const paddingLeft = depth * 12 + 8

  if (node.type === "folder") {
    return (
      <div>
        {depth > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs text-muted-foreground transition-colors hover:bg-white/5"
            style={{ paddingLeft }}
          >
            {isOpen ? (
              <FolderOpenIcon className="size-3.5 text-[#ff5800]" />
            ) : (
              <FolderIcon className="size-3.5 text-[#ff5800]" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
        )}
        {isOpen && (
          <div className="mt-0.5">
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
                openFolders={openFolders}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = node.path === activePath
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition-colors",
        isActive
          ? "bg-[#ff5800]/15 text-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
      style={{ paddingLeft }}
    >
      <FileIconFor
        path={node.path}
        className={cn("size-3.5", isActive ? "text-[#ff5800]" : "text-muted-foreground")}
      />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

function FileIconFor({ path, className }: { path: string; className?: string }) {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "json") return <FileJsonIcon className={className} />
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return <FileCode2Icon className={className} />
  if (["md", "txt"].includes(ext)) return <FileTextIcon className={className} />
  if (["css", "scss", "less"].includes(ext)) return <FileType2Icon className={className} />
  return <FileIcon className={className} />
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  switch (ext) {
    case "ts":
    case "tsx":
      return "tsx"
    case "js":
    case "jsx":
      return "jsx"
    case "json":
      return "json"
    case "css":
      return "css"
    case "html":
      return "html"
    case "md":
      return "markdown"
    default:
      return "typescript"
  }
}
