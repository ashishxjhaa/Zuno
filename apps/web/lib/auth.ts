import type { PublicUser } from "@workspace/shared"

const SESSION_KEY = "zuno:mock-user"
const USERS_KEY = "zuno:mock-users"

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

function isPublicUser(value: unknown): value is PublicUser {
  if (value === null || typeof value !== "object") {
    return false
  }

  if (!("id" in value) || !("name" in value) || !("email" in value)) {
    return false
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string"
  )
}

function readUsers(): PublicUser[] {
  const raw = localStorage.getItem(USERS_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isPublicUser)
  } catch {
    return []
  }
}

function writeUsers(users: PublicUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function readMockUser(): PublicUser | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    return isPublicUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeMockUser(user: PublicUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function clearMockUser(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function signupMockUser(name: string, email: string): PublicUser {
  const users = readUsers()
  if (users.some((user) => user.email === email)) {
    throw new AuthError("An account with this email already exists")
  }

  const user: PublicUser = {
    id: crypto.randomUUID(),
    name,
    email,
  }

  writeUsers([...users, user])
  writeMockUser(user)
  return user
}

export function signinMockUser(email: string): PublicUser {
  const match = readUsers().find((user) => user.email === email)
  if (!match) {
    throw new AuthError("No account found for this email")
  }

  writeMockUser(match)
  return match
}

export { AuthError }
