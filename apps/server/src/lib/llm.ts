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
/** Ceiling for first build; early-complete usually exits sooner when the site is solid. */
const FIRST_BUILD_STEPS = 22
/** Do not early-complete before this many tool rounds (0-indexed step). */
const EARLY_COMPLETE_MIN_STEP = 1

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


/** Emit text in small chunks so the client can animate a live bubble. */
async function emitTextChunks(
  text: string,
  onToken?: (token: string) => void
) {
  if (!onToken || !text) return
  const size = 10
  for (let i = 0; i < text.length; i += size) {
    onToken(text.slice(i, i + size))
    // Yield so SSE frames flush progressively.
    await new Promise((r) => setTimeout(r, 8))
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
    // Never let a hung API call pin a build forever.
    timeout: 120_000,
    maxRetries: 1,
  })
}

// Fast path: prebaked sandbox -> Vite healthy -> preview URL -> LLM edits via HMR.
export async function startProjectBuild(projectId: string) {
  let sandbox: Sandbox | null = null
  const t0 = Date.now()
  try {
    // Phase A: create sandbox + ensureDevServer + set previewUrl/READY.
    // Failures here are real sandbox errors.
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

    // Persist sandbox id only. Do not expose previewUrl until the port is open.
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

    // Bring Vite/Next up before LLM file churn so the first paint is reliable.
    await ensureDevServer(sandbox, template.port, template.kind)
    const previewUrl = getPreviewUrl(sandbox, template.port)
    console.log(
      `[bootstrap] ${projectId} preview up in ${Date.now() - t0}ms (prebaked=${prebaked})`
    )
    await prisma.project.update({
      where: { id: projectId },
      data: { previewUrl, phase: "READY" },
    })

    // Phase B: generation. On LLM failure keep sandbox + previewUrl alive.
    try {
      await runGeneration(projectId, {
        maxSteps: FIRST_BUILD_STEPS,
        firstPaint: true,
      })

      // LLM may rewrite package.json / vite.config; make sure the listener survived.
      try {
        const live = await connectSandbox(sandboxId)
        await ensureDevServer(live, template.port, template.kind)
      } catch (error) {
        console.error(`[bootstrap] ${projectId} post-gen ensureDevServer`, error)
      }

      queueSaveProjectSnapshot(projectId)
    } catch (genError) {
      console.error(`[bootstrap] ${projectId} generation`, genError)
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
        // project may already be gone
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { isGenerating: false },
    })
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
      // project may already be gone
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

// Chat updates: write files then ensure the HMR server is up.
// Optional handlers stream the final assistant text (tool rounds stay non-stream).
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
    // Do not kill sandbox / clear previewUrl on LLM errors after preview is up.
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

// Connect to the sandbox and loop until DeepSeek replies without tools.
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
  // Paths only: avoid reading every file body before the first LLM turn.
  const filePaths = await listProjectPaths(project.sandboxId)
  const history = await prisma.conversationHistory.findMany({
    where: { projectId, type: "TEXT_MESSAGE", hidden: false },
    orderBy: { createdAt: "asc" },
  })

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

/**
 * The final reply is shown verbatim in chat. Self-review and rule-talk
 * (file names, dash/typography lectures, "X is intact") must never reach
 * the user - fall back to a plain completion message instead.
 */
const META_REPLY_HARD_RE =
  /\b[\w.-]+\.(tsx|jsx|ts|js|css|json|html|md)\b|\b(em|en)[\s‐-―-]?dash|\btypograph|\bintact\b|\bthe ban\b|\b(className|classname|shadcn|tailwind|variant|props?|export(?:s|ed)?|import(?:s|ed)?|component(?:s)?)\b|\bfiles? are in place\b|\boverrid(?:e|ing)\b|\bcursor-pointer\b/i
const META_REPLY_SOFT_RE =
  /\b(I|I'|me|my|we|no)\b[^.!?]{0,80}\b(rules?|guidelines?|instructions?|bans?|banned|violat\w*|allow(?:ed|able)?|acceptable|permitted)\b/i
// Model self-talk ("Now let me verify...", "I'll check...") is never a user reply.
const META_REPLY_SELF_TALK_RE =
  /\b(let me|i'?ll|i need to|now i'?ll?|i will)\b[^.!?]{0,60}\b(verify|double[\s-]?check|check|review|inspect|confirm|make sure|ensure|fix)\b|\b(no harm|already wrote|was identical|same as before)\b/i
// Never surface internal step-budget / process wording.
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

/** Specifiers like "@/components/Nav" from import/export/dynamic-import lines. */
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

/**
 * Map an @/ import to possible on-disk paths.
 * Vite templates alias @ → src/; Next templates alias @/* → ./*
 */
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

/**
 * Returns unresolved @/ imports from the entry (and recently written section files).
 * Blocks "site ready" when App imports Nav but Nav.tsx was never written.
 */
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
    // Always read from sandbox so editFile patches are not missed.
    let source: string
    try {
      source = await readSandboxFile(sandbox, path)
      writeContents.set(path, source)
    } catch {
      source = writeContents.get(path) ?? ""
      if (!source) continue
    }
    for (const spec of extractAtImports(source)) {
      if (seenSpec.has(spec)) continue
      seenSpec.add(spec)
      // Skip css / asset side-effect imports that aren't components
      if (/\.(css|scss|sass|less|svg|png|jpe?g|webp|gif)$/i.test(spec)) continue
      const candidates = atImportCandidates(spec, framework)
      if (candidates.length === 0) continue
      if (!pathSetHas(known, candidates)) {
        missing.push(spec)
      }
    }
  }
  return missing
}

/** True when this generation already wrote a finished-looking marketing shell. */
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
  if (entryBytes < 1200) return false
  const solidSections = sectionBytes.filter((n) => n >= 500)
  if (solidSections.length < 3) return false
  const sectionTotal = sectionBytes.reduce((a, b) => a + b, 0)
  const total = entryBytes + sectionTotal
  // Prefer 4+ section files, but allow 3 very rich ones.
  if (solidSections.length >= 4 && total >= 7000) return true
  if (solidSections.length >= 3 && total >= 11000) return true
  return false
}

function recordWriteStats(
  writes: Map<string, number>,
  writeContents: Map<string, string>,
  knownPaths: Set<string>,
  name: string,
  rawArgs: string
) {
  try {
    const args = JSON.parse(rawArgs) as unknown
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
    if (name === "writeFiles") {
      const parsed = writeFilesSchema.safeParse(args)
      if (parsed.success) {
        for (const file of parsed.data.files) {
          const path = normalizeProjectPath(file.path)
          writes.set(path, file.contents.length)
          writeContents.set(path, file.contents)
          knownPaths.add(path)
        }
      }
    }
  } catch {
    // Ignore malformed tool args; readiness check simply stays conservative.
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

  async function persistAssistantText(raw: string): Promise<GenerateStreamResult> {
    // First paint: never trust model process-talk. Always the friendly done line.
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
    // Prefer the known-good fallback (saves a whole LLM round). Optionally ask
    // the model for a one-liner when we have no fallback - still no tools.
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

  for (let step = 0; step < maxSteps; step++) {
    // DeepSeek Node SDK: pass thinking as a top-level body field (Python uses extra_body).
    // Disable for codegen tool loops (speed/reliability). Still pass reasoning_content when present.
    // When streaming handlers exist, stream the model turn; tool rounds suppress content tokens.
    const wantStream = Boolean(options.handlers?.onToken)

    let content: string | null = null
    let reasoning_content: string | null | undefined
    let toolCalls: NonNullable<
      OpenAI.Chat.ChatCompletionMessage["tool_calls"]
    > = []

    if (wantStream) {
      const stream = await getDeepseek().chat.completions.create({
        model: "deepseek-v4-flash",
        messages,
        tools,
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
          // Buffer only. Emit after we know this turn is a final user-facing reply
          // (no tools), and only the shortened text.
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
        tools,
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
      if (options.earlyComplete && importRepairNudge < 2) {
        const missing = await findMissingAtImports({
          sandbox,
          writes,
          writeContents,
          knownPaths,
          framework,
        })
        if (missing.length > 0) {
          importRepairNudge += 1
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
              `Use writeFiles NOW to create each missing component with a named export matching the import. ` +
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

    // Run every tool call in this step (parallel when possible) so multi-file
    // first paint does not serialize writeFile round trips.
    const callResults = await Promise.all(
      toolCalls.map(async (call) => {
        if (call.type !== "function") {
          return { call, result: "Unsupported tool call" as string }
        }
        recordWriteStats(
          writes,
          writeContents,
          knownPaths,
          call.function.name,
          call.function.arguments
        )
        const result = await runTool(
          sandbox,
          call.function.name,
          call.function.arguments
        )
        return { call, result }
      })
    )

    for (const { call, result } of callResults) {
      if (call.type !== "function") continue
      await prisma.conversationHistory.create({
        data: {
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
        },
      })
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      })
    }

    // Speed win: once entry + several solid sections exist, stop burning steps.
    // Never early-complete while entry/section files still import missing @/ modules.
    if (
      options.earlyComplete &&
      step >= EARLY_COMPLETE_MIN_STEP &&
      siteLooksSubstantial(writes)
    ) {
      const missing = await findMissingAtImports({
        sandbox,
        writes,
        writeContents,
        knownPaths,
        framework,
      })
      if (missing.length === 0) {
        return await finishEarlyWithDoneReply()
      }
      if (importRepairNudge < 3) {
        importRepairNudge += 1
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

  if (options.saveAssistantText) {
    return persistAssistantText(fallback)
  }
  return { messageId: null, contents: null }
}

// Run one file tool on the sandbox. Returns a string for the model.
async function runTool(sandbox: Sandbox, name: string, rawArgs: string) {
  try {
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
    if (name === "writeFiles") {
      const { files } = writeFilesSchema.parse(args)
      await writeProjectFiles(sandbox, files)
      const paths = files.map((f) => f.path)
      return `Wrote ${paths.length} files: ${paths.join(", ")}`
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
