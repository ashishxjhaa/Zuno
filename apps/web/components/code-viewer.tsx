"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckIcon, CopyIcon, FileIcon } from "lucide-react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  FileTree,
  type FileTreeItem,
} from "@workspace/ui/components/file-tree"

export function CodeViewer({ files }: { files: Record<string, string> }) {
  const paths = useMemo(() => {
    const keys = Object.keys(files)
    const hasApp = keys.some((k) => /^(app|src|components)\//.test(k))
    return keys
      .filter((path) => {
        const parts = path.split("/")
        const base = parts[parts.length - 1] || path
        if (parts.some((d) => d === "node_modules" || d === "dist" || d === ".turbo")) return false
        if (parts.includes(".next") || parts.includes(".git")) return false
        if (base.startsWith(".env")) return false
        if (base.startsWith(".") && base.endsWith("ignore")) return false
        if (base.endsWith(".lock") || base.endsWith("-lock.yaml") || base === "package-lock.json") return false
        if (base === "README.md" || base === "LICENSE") return false
        if (base === "components.json") return false
        if (/^(tsconfig|next\.config|vite\.config|eslint\.config|postcss\.config|tailwind\.config)/.test(base)) return false
        if (hasApp && !(/^(app|src|components)\//.test(path) || path === "package.json")) return false
        return true
      })
      .sort()
  }, [files])

  const [activePath, setActivePath] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (paths.length === 0) {
      setActivePath("")
      return
    }
    if (!paths.includes(activePath)) {
      const prefs = [
        "app/page.tsx",
        "app/page.jsx",
        "src/app/page.tsx",
        "src/App.tsx",
        "src/App.jsx",
        "src/main.tsx",
      ]
      const hit =
        prefs.find((x) => paths.includes(x)) ||
        paths.find((x) => /\.(tsx|jsx)$/.test(x)) ||
        paths[0] ||
        ""
      setActivePath(hit)
    }
  }, [paths, activePath])

  const contents = files[activePath] ?? ""
  const language = getLanguage(activePath)
  const tree = useMemo(() => toFileTreeData(buildTree(paths).children), [paths])
  const openFolders = useMemo(
    () => ancestorFolders(activePath),
    [activePath]
  )

  const copy = async () => {
    await navigator.clipboard.writeText(contents)
    setCopied(true)
    toast.success("Copied")
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-60 shrink-0 flex-col p-2">
        <FileTree
          data={tree}
          selectedPath={activePath}
          onFileSelect={setActivePath}
          defaultOpenPaths={openFolders}
          className="h-full"
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col border-l border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-zinc-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <FileIcon className="size-3.5 text-muted-foreground" />
            <p className="truncate font-mono text-xs text-foreground">
              {activePath || "No file selected"}
            </p>
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
              style={oneLight}
              showLineNumbers
              lineNumberStyle={{ minWidth: "2.5em", paddingRight: "1em", color: "#a1a1aa" }}
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

function toFileTreeData(nodes: TreeNode[]): FileTreeItem[] {
  return nodes.map((node) => ({
    name: node.name,
    type: node.type,
    path: node.path,
    extension: node.type === "file" ? node.name.split(".").pop() : undefined,
    children: node.type === "folder" ? toFileTreeData(node.children) : undefined,
  }))
}

function ancestorFolders(path: string) {
  if (!path) return []
  const parts = path.split("/").filter(Boolean)
  const folders: string[] = []
  let built = ""
  for (let i = 0; i < parts.length - 1; i++) {
    built = built ? `${built}/${parts[i]}` : parts[i]!
    folders.push(built)
  }
  return folders
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
