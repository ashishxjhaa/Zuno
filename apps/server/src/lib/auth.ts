import type { Response } from "express"
import jwt from "jsonwebtoken"

export const COOKIE_NAME = "token"

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production"
  return {
    httpOnly: true,
    // Cross-site (Vercel web → Railway API) needs None + Secure in production.
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

export function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" })
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions())
}
