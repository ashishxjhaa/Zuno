import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

function databaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  // Strip sslmode from the URL so pg does not emit the deprecation warning.
  // TLS is configured explicitly below (required for Neon).
  const parsed = new URL(url)
  parsed.searchParams.delete("sslmode")
  parsed.searchParams.delete("uselibpqcompat")
  parsed.searchParams.delete("ssl")
  return parsed.toString()
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  ssl: { rejectUnauthorized: false },
})

export const prisma = new PrismaClient({ adapter })
