import type { ConversationItem, ProjectDetail, ProjectSummary } from "@workspace/shared"

const PROJECTS_KEY = "zuno:mock-projects"

function isProjectDetail(value: unknown): value is ProjectDetail {
  if (value === null || typeof value !== "object") {
    return false
  }

  return (
    "id" in value &&
    "title" in value &&
    "initialPrompt" in value &&
    "files" in value &&
    "conversationHistory" in value
  )
}

function readAll(): ProjectDetail[] {
  const raw = localStorage.getItem(PROJECTS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isProjectDetail)
  } catch {
    return []
  }
}

function writeAll(projects: ProjectDetail[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

function titleFromPrompt(prompt: string): string {
  const words = prompt.trim().split(/\s+/).slice(0, 6)
  return words.join(" ") || "Untitled project"
}

function starterFiles(prompt: string): Record<string, string> {
  return {
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zuno app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "src/main.tsx": `import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
`,
    "src/App.tsx": `export default function App() {
  return (
    <main className="min-h-screen bg-zinc-950 p-10 text-zinc-50">
      <h1 className="text-3xl font-semibold">Your site is ready</h1>
      <p className="mt-3 max-w-xl text-zinc-400">{${JSON.stringify(prompt)}}</p>
    </main>
  )
}
`,
    "src/index.css": `@import "tailwindcss";
`,
    "package.json": `{
  "name": "zuno-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build"
  }
}
`,
  }
}

function previewSrcDoc(prompt: string): string {
  const safe = prompt.replace(/</g, "")
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #0f0f0e; color: #f4f3ee; }
      main { padding: 48px 28px; }
      .chip { display: inline-block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #ff5800; border: 1px dashed #ff5800; border-radius: 999px; padding: 4px 10px; }
      h1 { font-size: 36px; margin: 16px 0 12px; letter-spacing: -0.03em; }
      p { color: #b0aea5; max-width: 40rem; line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <span class="chip">Live sandbox</span>
      <h1>Your site is coming together</h1>
      <p>${safe}</p>
    </main>
  </body>
</html>`
}

function toSummary(project: ProjectDetail): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    initialPrompt: project.initialPrompt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export function listProjects(): ProjectSummary[] {
  return readAll().map(toSummary)
}

export function getProject(id: string): ProjectDetail | null {
  return readAll().find((project) => project.id === id) ?? null
}

export function createProject(initialPrompt: string): ProjectDetail {
  const now = new Date().toISOString()
  const project: ProjectDetail = {
    id: crypto.randomUUID(),
    title: titleFromPrompt(initialPrompt),
    initialPrompt,
    createdAt: now,
    updatedAt: now,
    conversationHistory: [
      {
        id: crypto.randomUUID(),
        type: "TEXT_MESSAGE",
        from: "USER",
        contents: initialPrompt,
        hidden: false,
        toolCall: null,
        createdAt: now,
      },
    ],
    previewUrl: null,
    isGenerating: true,
    files: starterFiles(initialPrompt),
  }

  writeAll([project, ...readAll()])
  return project
}

export function finishGenerating(id: string): ProjectDetail | null {
  const projects = readAll()
  const index = projects.findIndex((project) => project.id === id)
  const current = projects[index]
  if (index === -1 || !current) {
    return null
  }

  const next: ProjectDetail = {
    ...current,
    isGenerating: false,
    previewUrl: previewSrcDoc(current.initialPrompt),
    updatedAt: new Date().toISOString(),
    conversationHistory: [
      ...current.conversationHistory,
      {
        id: crypto.randomUUID(),
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: "First version is ready. You can view the code or ask for changes in chat.",
        hidden: false,
        toolCall: null,
        createdAt: new Date().toISOString(),
      },
    ],
  }

  projects[index] = next
  writeAll(projects)
  return next
}

export function appendConversation(id: string, contents: string): ProjectDetail | null {
  const projects = readAll()
  const index = projects.findIndex((project) => project.id === id)
  const current = projects[index]
  if (index === -1 || !current) {
    return null
  }

  const now = new Date().toISOString()
  const userMessage: ConversationItem = {
    id: crypto.randomUUID(),
    type: "TEXT_MESSAGE",
    from: "USER",
    contents,
    hidden: false,
    toolCall: null,
    createdAt: now,
  }

  const next: ProjectDetail = {
    ...current,
    isGenerating: true,
    updatedAt: now,
    conversationHistory: [...current.conversationHistory, userMessage],
  }

  projects[index] = next
  writeAll(projects)
  return next
}

export function finishConversation(id: string): ProjectDetail | null {
  const projects = readAll()
  const index = projects.findIndex((project) => project.id === id)
  const current = projects[index]
  if (index === -1 || !current) {
    return null
  }

  const lastUser = [...current.conversationHistory]
    .reverse()
    .find((item) => item.from === "USER" && item.type === "TEXT_MESSAGE")

  const next: ProjectDetail = {
    ...current,
    isGenerating: false,
    updatedAt: new Date().toISOString(),
    conversationHistory: [
      ...current.conversationHistory,
      {
        id: crypto.randomUUID(),
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: lastUser
          ? `Updated from chat: “${lastUser.contents}”. Code is still read-only — ask again to change it.`
          : "Updated.",
        hidden: false,
        toolCall: null,
        createdAt: new Date().toISOString(),
      },
    ],
  }

  projects[index] = next
  writeAll(projects)
  return next
}
