import axios from "axios"

function apiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? ""
  return raw
    .trim()
    .replace(/\/$/, "")
    // People often paste ".../api/v1" — paths already include /api/v1.
    .replace(/\/api\/v1$/i, "")
}

export const frontend = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})
