/**
 * Live smoke: build one Vite+TS and one Next+TS project, then verify
 * every @/ import in entry + section files resolves on disk.
 */
import { prisma } from "../src/lib/prisma"
import { confirmStackAndBuild } from "../src/lib/intake"
import { listProjectPaths, readProjectFile } from "../src/lib/e2b"

type Framework = "react" | "nextjs"

function normalizeProjectPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "")
}

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

function atImportCandidates(spec: string, framework: Framework): string[] {
  const rest = spec.replace(/^@\//, "").replace(/\\/g, "/")
  if (!rest || rest.includes("..")) return []
  const root =
    framework === "nextjs"
      ? rest
      : rest.startsWith("src/")
        ? rest
        : `src/${rest}`
  const normalized = normalizeProjectPath(root)
  if (/\.(tsx|ts|jsx|js|css|json)$/.test(normalized)) return [normalized]
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

async function findMissing(
  sandboxId: string,
  framework: Framework,
  paths: string[]
) {
  const known = new Set(paths.map(normalizeProjectPath))
  const scan = paths.filter(
    (p) => isEntryPagePath(p) || isSectionComponentPath(p)
  )
  const missing: string[] = []
  const seen = new Set<string>()
  for (const path of scan) {
    let source = ""
    try {
      source = await readProjectFile(sandboxId, path)
    } catch {
      continue
    }
    for (const spec of extractAtImports(source)) {
      if (seen.has(spec)) continue
      seen.add(spec)
      if (/\.(css|scss|sass|less|svg|png|jpe?g|webp|gif)$/i.test(spec)) continue
      const candidates = atImportCandidates(spec, framework)
      if (!candidates.some((c) => known.has(c))) missing.push(spec)
    }
  }
  return missing
}

async function createSmokeProject(userId: string, label: string) {
  const brief = `SMOKE TEST ${label}: Build a tiny polished one-page marketing site for "Lumen Desk" — a calm focus timer. Include nav, hero, one features section, CTA, footer. Keep it small but complete. Prefer rounded-sm. No purple SaaS clichés.`
  const project = await prisma.project.create({
    data: {
      title: `SMOKE ${label}`,
      initialPrompt: brief,
      brief,
      userId,
      phase: "PLANNING",
      isGenerating: false,
    },
  })
  await prisma.conversationHistory.create({
    data: {
      projectId: project.id,
      type: "TEXT_MESSAGE",
      from: "USER",
      contents: brief,
    },
  })
  return project.id
}

async function waitDone(projectId: string, timeoutMs: number) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const p = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        isGenerating: true,
        phase: true,
        previewUrl: true,
        sandboxId: true,
        framework: true,
        language: true,
      },
    })
    if (!p) throw new Error(`project ${projectId} vanished`)
    if (!p.isGenerating && (p.phase === "READY" || p.sandboxId)) {
      // allow brief settle after isGenerating flips
      await Bun.sleep(1500)
      const again = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          isGenerating: true,
          phase: true,
          previewUrl: true,
          sandboxId: true,
          framework: true,
          language: true,
        },
      })
      if (again && !again.isGenerating) return again
    }
    await Bun.sleep(4000)
  }
  throw new Error(`timeout waiting for ${projectId}`)
}

async function runOne(userId: string, framework: Framework, language: "typescript") {
  const label = `${framework}/${language}`
  console.log(`[smoke] creating ${label}`)
  const id = await createSmokeProject(userId, label)
  const started = await confirmStackAndBuild(id, framework, language)
  if (!started.ok) throw new Error(`${label} confirm failed: ${started.error}`)
  console.log(`[smoke] building ${label} project=${id}`)
  const done = await waitDone(id, 12 * 60 * 1000)
  if (!done.sandboxId) {
    return {
      label,
      id,
      ok: false,
      reason: "no sandboxId after build",
      previewUrl: done.previewUrl,
      missing: [] as string[],
    }
  }
  const paths = await listProjectPaths(done.sandboxId)
  const missing = await findMissing(done.sandboxId, framework, paths)
  const entry =
    paths.find((p) => isEntryPagePath(p)) ??
    (framework === "nextjs" ? "app/page.tsx" : "src/App.tsx")
  let entrySnippet = ""
  try {
    entrySnippet = (await readProjectFile(done.sandboxId, entry)).slice(0, 400)
  } catch {
    entrySnippet = "(could not read entry)"
  }
  return {
    label,
    id,
    ok: missing.length === 0,
    reason: missing.length ? `missing imports: ${missing.join(", ")}` : "all @/ imports resolve",
    previewUrl: done.previewUrl,
    missing,
    entry,
    entrySnippet,
    fileCount: paths.length,
  }
}

async function main() {
  const user = await prisma.user.findFirst()
  if (!user) throw new Error("no user in db")

  // Also verify the broken-fixture detector (no LLM).
  {
    const fakePaths = [
      "src/App.tsx",
      "src/components/Hero.tsx",
      "src/components/ui/button.tsx",
      "src/main.tsx",
    ]
    const fakeEntry = `import { Nav } from "@/components/Nav"\nimport { Hero } from "@/components/Hero"\nexport default function App(){return null}`
    const known = new Set(fakePaths)
    const missing = extractAtImports(fakeEntry).filter(
      (spec) =>
        !atImportCandidates(spec, "react").some((c) => known.has(c))
    )
    if (!(missing.length === 1 && missing[0] === "@/components/Nav")) {
      throw new Error(`fixture detector failed: ${JSON.stringify(missing)}`)
    }
    console.log("[smoke] fixture detector OK (Vite missing Nav)")
    const nextKnown = new Set([
      "app/page.tsx",
      "components/Hero.tsx",
      "components/ui/button.tsx",
    ])
    const nextEntry = `import { Nav } from "@/components/Nav"\nimport { Hero } from "@/components/Hero"`
    const nextMissing = extractAtImports(nextEntry).filter(
      (spec) =>
        !atImportCandidates(spec, "nextjs").some((c) => nextKnown.has(c))
    )
    if (!(nextMissing.length === 1 && nextMissing[0] === "@/components/Nav")) {
      throw new Error(`next fixture detector failed: ${JSON.stringify(nextMissing)}`)
    }
    console.log("[smoke] fixture detector OK (Next missing Nav)")
  }

  const results = await Promise.all([
    runOne(user.id, "react", "typescript"),
    runOne(user.id, "nextjs", "typescript"),
  ])

  console.log("\n===== SMOKE RESULTS =====")
  for (const r of results) {
    console.log(JSON.stringify(r, null, 2))
  }
  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error(`[smoke] FAILED ${failed.map((f) => f.label).join(", ")}`)
    process.exitCode = 1
  } else {
    console.log("[smoke] BOTH STACKS OK")
  }
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
