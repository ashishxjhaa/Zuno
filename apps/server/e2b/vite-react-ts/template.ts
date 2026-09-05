import { Template, waitForPort } from "e2b"

// Prebaked Vite + React + TS project with bun deps and a warm dev server.
export const template = Template()
  .fromBunImage("1.3")
  .setEnvs({
    BUN_INSTALL: "/home/user/.bun",
    PATH: "/home/user/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  })
  .makeDir("/home/user/project")
  .copy("project", "/home/user/project")
  .setWorkdir("/home/user/project")
  .bunInstall()
  .setStartCmd(
    // Prefer bun; fall back to node+vite so preview works if bun is missing at runtime.
    "bash -lc 'if command -v bun >/dev/null 2>&1; then exec bun run dev; else exec node ./node_modules/vite/bin/vite.js --host --port 5173; fi'",
    waitForPort(5173)
  )
