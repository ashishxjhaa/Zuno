import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function connectionString() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  // Neon requires TLS. Don't override if the URL already sets sslmode.
  if (url.includes("sslmode=")) {
    return url
  }
  const join = url.includes("?") ? "&" : "?"
  return `${url}${join}sslmode=require&uselibpqcompat=true`
}

const adapter = new PrismaPg({
  connectionString: connectionString(),
})

export const prisma = new PrismaClient({
  adapter,
})
