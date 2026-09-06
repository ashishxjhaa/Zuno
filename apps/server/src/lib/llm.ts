import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { z } from "zod"
import type { Sandbox } from "e2b"
import type { ToolCallKind } from "../generated/prisma/client"
import { prisma } from "./prisma"
import { queueSaveProjectSnapshot } from "./snapshot"
import {
  connectSandbox,
  createSandboxWithTemplate,
  deleteProjectFile,
  editProjectFile,
  ensureDevServer,
  getPreviewUrl,
  smokeLocalPreview,
  installDependencies,
  listProjectPaths,
  readSandboxFile,
  resolveTemplate,
  updateProjectFile,
  writeProjectFile,
  writeProjectFiles,
} from "./e2b"
import { buildSystemPrompt } from "../prompts/system"

const MAX_STEPS = 36
// Max tool rounds for the first build (often finishes earlier)
const FIRST_BUILD_STEPS = 28
// Extra rounds only to fix missing @/ imports on first build
const IMPORT_REPAIR_EXTRA_STEPS = 10
// Earliest step that may stop early (still needs a solid site and resolved imports)
const EARLY_COMPLETE_MIN_STEP = 0

const pathSchema = z.object({ path: z.string().min(1) })
const writeSchema = z.object({
  path: z.string().min(1),
  contents: z.string(),
})
const editSchema = z.object({
  path: z.string().min(1),
  find: z.string().min(1),
  replace: z.string(),
  replaceAll: z.boolean().optional(),
})
const writeFilesSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        contents: z.string(),
      })
    )
    .min(1)
    .max(24),
})

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a project file. Path is relative to the project root.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description:
        "Create or overwrite a project file. Prefer writeFiles when creating several files in one step.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          contents: { type: "string" },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "writeFiles",
      description:
        "Create or overwrite multiple project files in one call. Prefer this for first paint: entry page + section components together. Each item needs path and full contents.",
      parameters: {
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                contents: { type: "string" },
              },
              required: ["path", "contents"],
            },
          },
        },
        required: ["files"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateFile",
      description:
        "Replace an ENTIRE existing file. You must send the COMPLETE new file contents from the first line to the last. Partial fragments corrupt the project and are rejected. For small targeted changes, use editFile instead.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          contents: { type: "string" },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editFile",
      description:
        "Make a targeted edit inside an existing file without rewriting it. Replaces the exact `find` text with `replace` text. The find text must match the file exactly once unless replaceAll is true. Prefer this over updateFile for small changes.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          find: { type: "string" },
          replace: { type: "string" },
          replaceAll: { type: "boolean" },
        },
        required: ["path", "find", "replace"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a project file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
]

const KIND: Record<string, ToolCallKind> = {
  readFile: "READ_FILE",
  writeFile: "WRITE_FILE",
  writeFiles: "WRITE_FILE",
  updateFile: "UPDATE_FILE",
  editFile: "UPDATE_FILE",
  deleteFile: "DELETE_FILE",
}


// Send text in small chunks so the chat bubble can animate
async function emitTextChunks(
  text: string,
  onToken?: (token: string) => void
) {
  if (!onToken || !text) return
  if (text.length <= 80) {
    onToken(text)
    return
  }
  const size = 24
  for (let i = 0; i < text.length; i += size) {
    onToken(text.slice(i, i + size))
    if (i + size < text.length) await new Promise((r) => setTimeout(r, 0))
  }
}

export type GenerateStreamHandlers = {
  onToken?: (token: string) => void
  onStatus?: (status: "tools" | "reply") => void
}

export type GenerateStreamResult = {
  messageId: string | null
  contents: string | null
}

function getDeepseek() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set")
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    // Cap API wait time so a hung call cannot block a build forever
    timeout: 120_000,
    maxRetries: 1,
  })
}

// Boot sandbox, open preview, then let the model edit files over HMR
export async function startProjectBuild(projectId: string) {
  let sandbox: Sandbox | null = null
  const t0 = Date.now()
  try {
    // Phase A: create sandbox and start the dev server. Failures here are sandbox errors.
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new Error("Project not found")
    }

    const created = await createSandboxWithTemplate(
      project.framework,
      project.language
    )
    sandbox = created.sandbox
    const { template, prebaked } = created
    const sandboxId = sandbox.sandboxId

    // Save sandbox id first. Do not set previewUrl until the port is open
    await prisma.project.update({
      where: { id: projectId },
      data: {
        sandboxId,
        phase: "BUILDING",
        lastActiveAt: new Date(),
      },
    })

    if (!prebaked) {
      await installDependencies(sandbox)
    }

    // Start the dev server while the first model round runs. Set previewUrl when the port opens.
    const bootPreview = (async () => {
      await ensureDevServer(sandbox!, template.port, template.kind)
      const previewUrl = getPreviewUrl(sandbox!, template.port)
      console.log(
        `[bootstrap] ${projectId} preview up in ${Date.now() - t0}ms (prebaked=${prebaked})`
      )
      await prisma.project.update({
        where: { id: projectId },
        data: { previewUrl, phase: "READY" },
      })
    })()

    // Phase B: generate the site. Keep sandbox and preview if the model fails
    try {
      await Promise.all([
        bootPreview,
        runGeneration(projectId, {
          maxSteps: FIRST_BUILD_STEPS,
          firstPaint: true,
        }),
      ])

      // Mark generating done as soon as the model finishes. Snapshot runs in the background.
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })

      void (async () => {
        try {
          const live = await connectSandbox(sandboxId)
          await ensureDevServer(live, template.port, template.kind)
        } catch (error) {
          console.error(`[bootstrap] ${projectId} post-gen ensureDevServer`, error)
        }
        queueSaveProjectSnapshot(projectId)
      })()
    } catch (genError) {
      console.error(`[bootstrap] ${projectId} generation`, genError)
      try {
        await bootPreview
      } catch {
        // ignore boot errors after a generation failure
      }
      try {
        await prisma.conversationHistory.create({
          data: {
            projectId,
            type: "TEXT_MESSAGE",
            from: "ASSISTANT",
            contents:
              "Preview is up, but generation hit an API error. Try again in chat.",
          },
        })
      } catch {
        // project may already be deleted
      }
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })
    }
  } catch (error) {
    console.error(`[bootstrap] ${projectId}`, error)
    if (sandbox) {
      try {
        await sandbox.kill()
      } catch {
        // ignore
      }
    }
    const reason =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 500)
        : "Unknown sandbox error"
    const userMessage = reason.toLowerCase().includes("could not start")
      ? reason
      : `Could not start the sandbox. ${reason}`
    try {
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TEXT_MESSAGE",
          from: "ASSISTANT",
          contents: userMessage,
        },
      })
      await prisma.project.update({
        where: { id: projectId },
        data: {
          isGenerating: false,
          previewUrl: null,
          sandboxId: null,
        },
      })
    } catch {
      // project may already be deleted
    }
  } finally {
    try {
      const current = await prisma.project.findUnique({
        where: { id: projectId },
        select: { isGenerating: true },
      })
      if (current?.isGenerating) {
        await prisma.project.update({
          where: { id: projectId },
          data: { isGenerating: false },
        })
      }
    } catch {
      // ignore
    }
  }
}

// Chat follow-up: edit files, keep the dev server up, optionally stream the final reply
export async function generateForProject(
  projectId: string,
  handlers?: GenerateStreamHandlers
): Promise<GenerateStreamResult> {
  let result: GenerateStreamResult = { messageId: null, contents: null }
  try {
    result = await runGeneration(projectId, undefined, handlers)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (project?.sandboxId) {
      const info = resolveTemplate(project.framework, project.language)
      const sandbox = await connectSandbox(project.sandboxId)
      await ensureDevServer(sandbox, info.port, info.kind)
    }

    queueSaveProjectSnapshot(projectId)
  } catch (error) {
    console.error(`[generate] ${projectId}`, error)
    // Keep sandbox and preview if the model errors after preview is live
    const saved = await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: "Something went wrong while generating. Try again in chat.",
      },
    })
    result = {
      messageId: saved.id,
      contents: saved.contents,
    }
    handlers?.onToken?.(saved.contents)
  } finally {
    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })
    } catch (error) {
      console.error(`[generate] clear flag ${projectId}`, error)
    }
  }
  return result
}

// Connect to the sandbox and loop until the model replies without tools
async function runGeneration(
  projectId: string,
  opts?: { maxSteps?: number; firstPaint?: boolean },
  handlers?: GenerateStreamHandlers
): Promise<GenerateStreamResult> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.sandboxId) {
    throw new Error("Project has no sandbox")
  }

  const sandbox = await connectSandbox(project.sandboxId)
  // List file paths only - do not read every file before the first model turn
  const [filePaths, history] = await Promise.all([
    listProjectPaths(project.sandboxId),
    prisma.conversationHistory.findMany({
      where: { projectId, type: "TEXT_MESSAGE", hidden: false },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const system = buildSystemPrompt({
    framework: project.framework,
    language: project.language,
    brief: project.brief,
  })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "system",
      content: `Project files:\n${filePaths.sort().join("\n") || "(empty)"}`,
    },
  ]

  if (opts?.firstPaint) {
    messages.push({
      role: "system",
      content:
        "First paint (speed + quality): (1) Briefly commit to art direction and a section list (nav, hero, rich sections, CTA, footer). Keep that planning short and never dump it in the final user reply. (2) In the SAME tool round, write the entry page AND every section component it imports together: prefer writeFiles with multiple {path, contents}. Never import @/components/X unless that file is included in the same writeFiles (or already exists). (3) Steps 1-2 must land a polished shell (layout/globals tokens if needed, nav, hero, entry composition) so HMR shows something finished-looking quickly; steps 3-4 enrich remaining sections. (4) Prefer complete file writes over tiny edits. The project file list is already provided: do not re-list or re-read the whole tree; read only files you must patch. (5) Full marketing sites are allowed. Match the quality bar. Never leave the placeholder page. Do not change package.json scripts or vite/next server host/port settings. (6) As soon as nav, hero, multiple rich sections, CTA, and footer are in place, every import resolves, and the site looks finished, stop calling tools and reply with one short done sentence.",
    })
  }

  messages.push(
    ...history.map((row) => ({
      role: (row.from === "USER" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: row.contents,
    }))
  )

  return await runToolLoop(
    projectId,
    sandbox,
    messages,
    opts?.maxSteps ?? MAX_STEPS,
    {
      saveAssistantText: true,
      handlers,
      fallbackReply: opts?.firstPaint ? FIRST_PAINT_DONE_REPLY : DEFAULT_DONE_REPLY,
      earlyComplete: Boolean(opts?.firstPaint),
      framework: project.framework,
      initialPaths: filePaths,
    }
  )
}

// Drop model self-talk and rule chatter from the final chat reply
const META_REPLY_HARD_RE =
  /\b[\w.-]+\.(tsx|jsx|ts|js|css|json|html|md)\b|\b(em|en)[\s‐-―-]?dash|\btypograph|\bintact\b|\bthe ban\b|\b(className|classname|shadcn|tailwind|variant|props?|export(?:s|ed)?|import(?:s|ed)?|component(?:s)?)\b|\bfiles? are in place\b|\boverrid(?:e|ing)\b|\bcursor-pointer\b/i
const META_REPLY_SOFT_RE =
  /\b(I|I'|me|my|we|no)\b[^.!?]{0,80}\b(rules?|guidelines?|instructions?|bans?|banned|violat\w*|allow(?:ed|able)?|acceptable|permitted)\b/i
// Model self-talk like "let me verify" is not a user-facing reply
const META_REPLY_SELF_TALK_RE =
  /\b(let me|i'?ll|i need to|now i'?ll?|i will)\b[^.!?]{0,60}\b(verify|double[\s-]?check|check|review|inspect|confirm|make sure|ensure|fix)\b|\b(no harm|already wrote|was identical|same as before)\b/i
// Hide internal step-budget wording from the user
const META_REPLY_STOP_RE =
  /stopped after too many|too many file edits|step budget|max(?:imum)? steps|ran out of (?:steps|edits)/i

const DEFAULT_DONE_REPLY = "Done. Tell me what to tweak."
const FIRST_PAINT_DONE_REPLY = "Your site is ready. Check the preview."

function doneReply(fallbackReply?: string) {
  const trimmed = fallbackReply?.trim()
  return trimmed || DEFAULT_DONE_REPLY
}

function shortenUserFacingReply(
  raw: string,
  fallback = DEFAULT_DONE_REPLY
) {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim()
  if (
    !cleaned ||
    META_REPLY_HARD_RE.test(cleaned) ||
    META_REPLY_SOFT_RE.test(cleaned) ||
    META_REPLY_SELF_TALK_RE.test(cleaned) ||
    META_REPLY_STOP_RE.test(cleaned)
  ) {
    return fallback
  }
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const two = parts.slice(0, 2).join(" ").trim()
  if (two.length <= 220) return two
  return `${two.slice(0, 217).trim()}...`
}

function normalizeProjectPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "")
}

function isEntryPagePath(path: string) {
  const n = normalizeProjectPath(path)
  return (
    /(^|\/)app\/page\.(tsx|jsx|ts|js)$/.test(n) ||
    /(^|\/)src\/App\.(tsx|jsx|ts|js)$/.test(n) ||
    /(^|\/)App\.(tsx|jsx|ts|js)$/.test(n)
  )
}

function isSectionComponentPath(path: string) {
  const n = normalizeProjectPath(path)
  if (!/\.(tsx|jsx|ts|js)$/.test(n)) return false
  if (/(^|\/)components\/ui\//.test(n)) return false
  return /(^|\/)(src\/)?components\//.test(n)
}

// Collect @/ import paths from import and export lines
function extractAtImports(source: string): string[] {
  const found = new Set<string>()
  const re = /(?:from\s+|import\s*\(\s*)["'](@\/[^"']+)["']/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    const spec = match[1]
    if (spec) found.add(spec)
  }
  return [...found]
}

// Map an @/ import to possible file paths on disk for this stack
function atImportCandidates(
  spec: string,
  framework: "nextjs" | "react"
): string[] {
  const rest = spec.replace(/^@\//, "").replace(/\\/g, "/")
  if (!rest || rest.includes("..")) return []
  const root =
    framework === "nextjs"
      ? rest
      : rest.startsWith("src/")
        ? rest
        : `src/${rest}`
  const normalized = normalizeProjectPath(root)
  if (/\.(tsx|ts|jsx|js|css|json)$/.test(normalized)) {
    return [normalized]
  }
  return [
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.jsx`,
    `${normalized}/index.js`,
  ]
}

function pathSetHas(known: Set<string>, candidates: string[]) {
  for (const c of candidates) {
    if (known.has(normalizeProjectPath(c))) return true
  }
  return false
}

function entryPathFromWrites(writes: Map<string, number>): string | null {
  let best: string | null = null
  let bestBytes = -1
  for (const [path, bytes] of writes) {
    if (isEntryPagePath(path) && bytes >= bestBytes) {
      best = path
      bestBytes = bytes
    }
  }
  return best
}

// Find @/ imports that do not resolve to a written file yet
async function findMissingAtImports(opts: {
  sandbox: Sandbox
  writes: Map<string, number>
  writeContents: Map<string, string>
  knownPaths: Set<string>
  framework: "nextjs" | "react"
}): Promise<string[]> {
  const { sandbox, writes, writeContents, knownPaths, framework } = opts
  const known = new Set(
    [...knownPaths, ...writes.keys()].map((p) => normalizeProjectPath(p))
  )

  const scanPaths = new Set<string>()
  const entry = entryPathFromWrites(writes)
  if (entry) scanPaths.add(entry)
  for (const path of writes.keys()) {
    if (isSectionComponentPath(path) || isEntryPagePath(path)) {
      scanPaths.add(path)
    }
  }

  const missing: string[] = []
  const seenSpec = new Set<string>()

  for (const path of scanPaths) {
    // Prefer in-memory writes from this run. Fall back to a sandbox read if needed.
    let source = writeContents.get(path) ?? ""
    if (!source) {
      try {
        source = await readSandboxFile(sandbox, path)
        writeContents.set(path, source)
      } catch {
        continue
      }
    }
    for (const spec of extractAtImports(source)) {
      if (seenSpec.has(spec)) continue
      seenSpec.add(spec)
      // Skip css and asset imports - they are not components
      if (/\.(css|scss|sass|less|svg|png|jpe?g|webp|gif)$/i.test(spec)) continue
      const candidates = atImportCandidates(spec, framework)
      if (candidates.length === 0) continue
      if (!pathSetHas(known, candidates)) {
        // Files may exist on disk even if write stats missed truncated JSON.
        let onDisk = false
        for (const candidate of candidates) {
          try {
            const body = await readSandboxFile(sandbox, candidate)
            const norm = normalizeProjectPath(candidate)
            writeContents.set(norm, body)
            writes.set(norm, body.length)
            knownPaths.add(norm)
            known.add(norm)
            onDisk = true
            break
          } catch {
            // try next candidate path
          }
        }
        if (!onDisk) missing.push(spec)
      }
    }
  }
  return missing
}

// True when the written files already look like a finished marketing site
function siteLooksSubstantial(writes: Map<string, number>) {
  let entryBytes = 0
  const sectionBytes: number[] = []
  for (const [path, bytes] of writes) {
    if (isEntryPagePath(path)) {
      entryBytes = Math.max(entryBytes, bytes)
    } else if (isSectionComponentPath(path)) {
      sectionBytes.push(bytes)
    }
  }
  // Entry pages are often thin; section components carry most of the content
  if (entryBytes < 180) return false
  const solidSections = sectionBytes.filter((n) => n >= 500)
  if (solidSections.length < 3) return false
  const sectionTotal = sectionBytes.reduce((a, b) => a + b, 0)
  const total = entryBytes + sectionTotal
  if (solidSections.length >= 5 && sectionTotal >= 5500) return true
  if (solidSections.length >= 4 && sectionTotal >= 6500) return true
  if (solidSections.length >= 3 && sectionTotal >= 10000) return true
  if (entryBytes >= 1200 && solidSections.length >= 3 && total >= 7000) return true
  return false
}


// Parse a JSON string starting just after the opening quote
function readJsonStringAt(
  raw: string,
  start: number
): { value: string; end: number } | null {
  let i = start
  let body = ""
  while (i < raw.length) {
    const c = raw[i]
    if (c === "\\") {
      if (i + 1 >= raw.length) return null
      body += c + raw[i + 1]
      i += 2
      continue
    }
    if (c === '"') {
      try {
        return { value: JSON.parse(`"${body}"`) as string, end: i + 1 }
      } catch {
        return null
      }
    }
    body += c
    i++
  }
  return null
}

// Pull complete path/contents pairs out of truncated writeFiles JSON
function recoverWriteFilesArgs(
  rawArgs: string
): Array<{ path: string; contents: string }> {
  const files: Array<{ path: string; contents: string }> = []
  let i = 0
  while (i < rawArgs.length) {
    const pathKey = rawArgs.indexOf('"path"', i)
    if (pathKey < 0) break
    const afterKey = rawArgs.slice(pathKey + 6)
    const colon = afterKey.match(/^\s*:\s*"/)
    if (!colon) {
      i = pathKey + 6
      continue
    }
    const pathStart = pathKey + 6 + colon[0].length
    const pathStr = readJsonStringAt(rawArgs, pathStart)
    if (!pathStr) break
    const afterPath = rawArgs.slice(pathStr.end)
    const contentsKey = afterPath.match(/^\s*,\s*"contents"\s*:\s*"/)
    if (!contentsKey) {
      i = pathStr.end
      continue
    }
    const contentsStart = pathStr.end + contentsKey[0].length
    const contentsStr = readJsonStringAt(rawArgs, contentsStart)
    if (!contentsStr) break // truncated last file - keep prior complete ones
    if (pathStr.value.trim()) {
      files.push({ path: pathStr.value, contents: contentsStr.value })
    }
    i = contentsStr.end
  }
  return files
}

function parseWriteFilesPayload(
  rawArgs: string
): Array<{ path: string; contents: string }> | null {
  try {
    const parsed = writeFilesSchema.safeParse(JSON.parse(rawArgs) as unknown)
    if (parsed.success) return parsed.data.files
  } catch {
    // try recovery for truncated JSON
  }
  const recovered = recoverWriteFilesArgs(rawArgs)
  return recovered.length > 0 ? recovered : null
}

function parseToolArgs(rawArgs: string): unknown {
  try {
    return JSON.parse(rawArgs) as unknown
  } catch {
    // Model JSON can be messy; caller may recover file payloads
    return null
  }
}

function recordWriteStats(
  writes: Map<string, number>,
  writeContents: Map<string, string>,
  knownPaths: Set<string>,
  name: string,
  rawArgs: string
) {
  try {
    const args = parseToolArgs(rawArgs)
    // Truncated writeFiles often fails JSON.parse; still recover complete files.
    if (name === "writeFiles") {
      let list: Array<{ path: string; contents: string }> | null = null
      if (args != null) {
        const parsed = writeFilesSchema.safeParse(args)
        if (parsed.success) list = parsed.data.files
      }
      list = list ?? recoverWriteFilesArgs(rawArgs)
      for (const file of list) {
        const path = normalizeProjectPath(file.path)
        writes.set(path, file.contents.length)
        writeContents.set(path, file.contents)
        knownPaths.add(path)
      }
      return
    }
    if (args == null) return
    if (name === "writeFile" || name === "updateFile") {
      const parsed = writeSchema.safeParse(args)
      if (parsed.success) {
        const path = normalizeProjectPath(parsed.data.path)
        writes.set(path, parsed.data.contents.length)
        writeContents.set(path, parsed.data.contents)
        knownPaths.add(path)
      }
      return
    }
    if (name === "editFile") {
      const parsed = editSchema.safeParse(args)
      if (parsed.success) {
        const path = normalizeProjectPath(parsed.data.path)
        const prev = writeContents.get(path)
        if (prev && prev.includes(parsed.data.find)) {
          const next = parsed.data.replaceAll
            ? prev.split(parsed.data.find).join(parsed.data.replace)
            : prev.replace(parsed.data.find, parsed.data.replace)
          writeContents.set(path, next)
          writes.set(path, next.length)
        }
        knownPaths.add(path)
      }
    }
  } catch {
    // Ignore bad tool args; treat the site as not ready yet
  }
}

async function runToolLoop(
  projectId: string,
  sandbox: Sandbox,
  messages: ChatCompletionMessageParam[],
  maxSteps: number,
  options: {
    saveAssistantText: boolean
    handlers?: GenerateStreamHandlers
    fallbackReply?: string
    earlyComplete?: boolean
    framework?: string | null
    initialPaths?: string[]
  }
): Promise<GenerateStreamResult> {
  const fallback = doneReply(options.fallbackReply)
  const writes = new Map<string, number>()
  const writeContents = new Map<string, string>()
  const knownPaths = new Set(
    (options.initialPaths ?? []).map((p) => normalizeProjectPath(p))
  )
  const framework: "nextjs" | "react" =
    options.framework === "nextjs" ? "nextjs" : "react"
  let importRepairNudge = 0
  // Add rounds only when missing imports would make an early stop wrong
  let stepLimit = maxSteps
  const absoluteStepCap = options.earlyComplete
    ? maxSteps + IMPORT_REPAIR_EXTRA_STEPS
    : maxSteps

  async function unresolvedImports(): Promise<string[]> {
    if (!options.earlyComplete) return []
    return findMissingAtImports({
      sandbox,
      writes,
      writeContents,
      knownPaths,
      framework,
    })
  }

  function extendForImportRepair(missing: string[]) {
    if (!options.earlyComplete || missing.length === 0) return
    if (stepLimit < absoluteStepCap) {
      stepLimit += 1
      console.log(
        `[generate] ${projectId} extending for import repair (stepLimit=${stepLimit}, missing=${missing.join(", ")})`
      )
    }
  }

  async function persistAssistantText(raw: string): Promise<GenerateStreamResult> {
    // First build: ignore model process-talk and use the friendly done line
    const text = options.earlyComplete
      ? fallback
      : shortenUserFacingReply(raw, fallback)
    options.handlers?.onStatus?.("reply")
    await emitTextChunks(text, options.handlers?.onToken)
    const saved = await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: text,
      },
    })
    return { messageId: saved.id, contents: text }
  }

  async function finishEarlyWithDoneReply(): Promise<GenerateStreamResult> {
    if (!options.saveAssistantText) {
      return { messageId: null, contents: null }
    }
    // Prefer the known done line. If missing, ask the model for one short reply with no tools.
    if (options.fallbackReply?.trim()) {
      console.log(`[generate] ${projectId} early-complete with fallbackReply`)
      return persistAssistantText(fallback)
    }

    messages.push({
      role: "system",
      content:
        "The site is complete enough. Do not call any tools. Reply with ONE short user-facing sentence that it is ready. No file names, no process talk.",
    })

    const completion = await getDeepseek().chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      thinking: { type: "disabled" },
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)
    const raw = completion.choices[0]?.message?.content?.trim() ?? ""
    console.log(`[generate] ${projectId} early-complete after final no-tools turn`)
    return persistAssistantText(raw)
  }

  for (let step = 0; step < stepLimit; step++) {
    // Disable model "thinking" for codegen. Stream tokens only for the final user-facing reply.
    const wantStream = Boolean(options.handlers?.onToken)

    let content: string | null = null
    let reasoning_content: string | null | undefined
    let toolCalls: NonNullable<
      OpenAI.Chat.ChatCompletionMessage["tool_calls"]
    > = []

    // First build already has the file list - block readFile so the model writes sooner
    const stepTools = options.earlyComplete
      ? tools.filter(
          (t) =>
            t.type === "function" &&
            t.function.name !== "readFile"
        )
      : tools

    if (wantStream) {
      const stream = await getDeepseek().chat.completions.create({
        model: "deepseek-v4-flash",
        messages,
        tools: stepTools,
        stream: true,
        thinking: { type: "disabled" },
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming)

      let full = ""
      const toolAcc = new Map<
        number,
        { id: string; name: string; arguments: string }
      >()
      let sawTools = false

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as
          | {
              content?: string | null
              tool_calls?: Array<{
                index?: number
                id?: string
                function?: { name?: string; arguments?: string }
              }>
              reasoning_content?: string | null
            }
          | undefined
        if (!delta) continue

        if (typeof delta.reasoning_content === "string") {
          reasoning_content = (reasoning_content ?? "") + delta.reasoning_content
        }

        if (delta.tool_calls?.length) {
          if (!sawTools) {
            sawTools = true
            options.handlers?.onStatus?.("tools")
          }
          for (const part of delta.tool_calls) {
            const idx = part.index ?? 0
            const prev = toolAcc.get(idx) ?? {
              id: "",
              name: "",
              arguments: "",
            }
            if (part.id) prev.id = part.id
            if (part.function?.name) prev.name += part.function.name
            if (part.function?.arguments) prev.arguments += part.function.arguments
            toolAcc.set(idx, prev)
          }
        }

        if (delta.content) {
          full += delta.content
          // Buffer tokens until we know this turn is a final reply with no tools
        }
      }

      content = full
      toolCalls = [...toolAcc.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, t]) => ({
          id: t.id,
          type: "function" as const,
          function: { name: t.name, arguments: t.arguments },
        }))
    } else {
      const completion = await getDeepseek().chat.completions.create({
        model: "deepseek-v4-flash",
        messages,
        tools: stepTools,
        thinking: { type: "disabled" },
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)

      const choice = completion.choices[0]?.message
      if (!choice) {
        throw new Error("Empty model response")
      }
      const apiMessage = choice as typeof choice & {
        reasoning_content?: string | null
      }
      content = apiMessage.content
      reasoning_content = apiMessage.reasoning_content
      toolCalls = apiMessage.tool_calls ?? []
    }

    if (toolCalls.length === 0) {
      // Do not finish first build while @/ imports are still missing
      if (options.earlyComplete) {
        const missing = await unresolvedImports()
        if (missing.length > 0) {
          importRepairNudge += 1
          extendForImportRepair(missing)
          console.log(
            `[generate] ${projectId} blocked done reply; missing imports: ${missing.join(", ")}`
          )
          messages.push({
            role: "assistant",
            content: content,
            reasoning_content,
          } as ChatCompletionMessageParam)
          messages.push({
            role: "system",
            content:
              `CRITICAL: Do not finish yet. These @/ imports are unresolved (file missing): ${missing.join(", ")}. ` +
              `Use writeFiles NOW (or multiple writeFile calls in THIS step) to create each missing component with a named export matching the import. ` +
              `Do not claim the site is ready until every import resolves.`,
          })
          continue
        }
      }
      if (options.saveAssistantText) {
        return persistAssistantText(content?.trim() ?? "")
      }
      return { messageId: null, contents: null }
    }

    options.handlers?.onStatus?.("tools")

    messages.push({
      role: "assistant",
      content,
      tool_calls: toolCalls,
      reasoning_content,
    } as ChatCompletionMessageParam)

    // Run tool calls in this step together when possible to speed multi-file writes
    const callResults = await Promise.all(
      toolCalls.map(async (call) => {
        if (call.type !== "function") {
          return { call, result: "Unsupported tool call" as string }
        }
        const result = await runTool(
          sandbox,
          call.function.name,
          call.function.arguments
        )
        // Record writes after the tool runs so readiness stays accurate
        if (!result.startsWith("Error:")) {
          recordWriteStats(
            writes,
            writeContents,
            knownPaths,
            call.function.name,
            call.function.arguments
          )
        }
        return { call, result }
      })
    )

    const historyRows: Array<{
      projectId: string
      type: "TOOL_CALL"
      from: "ASSISTANT"
      hidden: true
      toolCall: (typeof KIND)[string]
      contents: string
    }> = []
    for (const { call, result } of callResults) {
      if (call.type !== "function") continue
      historyRows.push({
        projectId,
        type: "TOOL_CALL",
        from: "ASSISTANT",
        hidden: true,
        toolCall: KIND[call.function.name],
        contents: JSON.stringify({
          name: call.function.name,
          arguments: call.function.arguments,
          result,
        }),
      })
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      })
    }
    if (historyRows.length === 1) {
      await prisma.conversationHistory.create({ data: historyRows[0]! })
    } else if (historyRows.length > 1) {
      await prisma.conversationHistory.createMany({ data: historyRows })
    }

    // Stop early once the site looks solid. Never stop early with missing @/ imports.
    if (options.earlyComplete && step >= EARLY_COMPLETE_MIN_STEP) {
      if (!siteLooksSubstantial(writes)) {
        console.log(
          `[generate] ${projectId} step ${step} not substantial yet (writes=${writes.size})`
        )
        if (step < 3) {
          messages.push({
            role: "system",
            content:
              "First paint incomplete. In this SAME tool round, write the entry page AND every section component " +
              "(nav, hero, multiple rich sections, CTA, footer). Prefer several writeFile calls in THIS step " +
              "(one file each) if writeFiles JSON truncates. Never import @/components/X without writing that file. " +
              "Keep full design quality - do not omit sections.",
          })
        }
      } else {
        const missing = await unresolvedImports()
        if (missing.length === 0) {
          const port = framework === "nextjs" ? 3000 : 5173
          const smoke = await smokeLocalPreview(sandbox, port)
          if (!smoke.ok) {
            console.log(
              `[generate] ${projectId} preview smoke failed; continuing: ${smoke.detail.slice(0, 240)}`
            )
            messages.push({
              role: "system",
              content:
                "Preview is crashing. Fix it NOW before finishing. Error output:\n" +
                smoke.detail.slice(0, 1200) +
                "\nCommon causes: undefined helper components (define them in the same file), " +
                "invalid lucide-react icon names, or importing a name that the file does not export. " +
                "Use writeFile/editFile to fix, then stop when the page loads.",
            })
            continue
          }
          return await finishEarlyWithDoneReply()
        }
        // Never stop early or give up while @/ imports are unresolved
        importRepairNudge += 1
        extendForImportRepair(missing)
        console.log(
          `[generate] ${projectId} early-complete blocked; missing: ${missing.join(", ")}`
        )
        messages.push({
          role: "system",
          content:
            `CRITICAL: Generation is incomplete. Unresolved @/ imports: ${missing.join(", ")}. ` +
            `writeFiles those components immediately (named exports, file names matching imports). ` +
            `Do not stop until they exist.`,
        })
      }
    }
  }

  // Do not finish first build with broken @/ imports
  if (options.earlyComplete) {
    const missing = await unresolvedImports()
    if (missing.length > 0) {
      console.error(
        `[generate] ${projectId} REFUSING done; unresolved after repair budget: ${missing.join(", ")}`
      )
      throw new Error(
        `First paint incomplete: unresolved @/ imports: ${missing.join(", ")}`
      )
    }
    const port = framework === "nextjs" ? 3000 : 5173
    const smoke = await smokeLocalPreview(sandbox, port)
    if (!smoke.ok) {
      console.error(
        `[generate] ${projectId} REFUSING done; preview smoke failed: ${smoke.detail.slice(0, 240)}`
      )
      throw new Error(
        `First paint incomplete: preview is crashing. ${smoke.detail.slice(0, 400)}`
      )
    }
  }

  if (options.saveAssistantText) {
    return persistAssistantText(fallback)
  }
  return { messageId: null, contents: null }
}

// Run one file tool in the sandbox and return a string for the model
async function runTool(sandbox: Sandbox, name: string, rawArgs: string) {
  try {
    // writeFiles JSON is often truncated; recover complete files when possible
    if (name === "writeFiles") {
      const files = parseWriteFilesPayload(rawArgs)
      if (!files || files.length === 0) {
        return (
          "Error: writeFiles JSON was invalid/truncated and no complete files could be recovered. " +
          "Retry with several writeFile calls in THIS SAME step (one per file), or a smaller writeFiles batch."
        )
      }
      await writeProjectFiles(sandbox, files)
      const paths = files.map((f) => f.path)
      return `Wrote ${paths.length} files: ${paths.join(", ")}`
    }

    const args = JSON.parse(rawArgs) as unknown
    if (name === "readFile") {
      const { path } = pathSchema.parse(args)
      return await readSandboxFile(sandbox, path)
    }
    if (name === "writeFile") {
      const { path, contents } = writeSchema.parse(args)
      await writeProjectFile(sandbox, path, contents)
      return `Wrote ${path}`
    }
    if (name === "updateFile") {
      const { path, contents } = writeSchema.parse(args)
      await updateProjectFile(sandbox, path, contents)
      return `Updated ${path}`
    }
    if (name === "editFile") {
      const { path, find, replace, replaceAll } = editSchema.parse(args)
      const count = await editProjectFile(
        sandbox,
        path,
        find,
        replace,
        replaceAll ?? false
      )
      return `Edited ${path} (${count} ${count === 1 ? "place" : "places"})`
    }
    if (name === "deleteFile") {
      const { path } = pathSchema.parse(args)
      await deleteProjectFile(sandbox, path)
      return `Deleted ${path}`
    }
    return `Unknown tool: ${name}`
  } catch (error) {
    return error instanceof Error ? error.message : "Tool failed"
  }
}
