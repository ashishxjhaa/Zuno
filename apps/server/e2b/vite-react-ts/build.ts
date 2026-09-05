import { config } from "dotenv"
import { resolve } from "node:path"
import { Template, defaultBuildLogger } from "e2b"
import { template } from "./template"

config({ path: resolve(import.meta.dirname, "../../.env") })

const alias = process.env.E2B_TEMPLATE_VITE_REACT_TS || "zuno-vite-react-ts"

async function main() {
  console.log(`Building E2B template alias=${alias}`)
  await Template.build(template, {
    alias,
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  })
  console.log(`Done. Set E2B_TEMPLATE_VITE_REACT_TS=${alias} in apps/server/.env`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
