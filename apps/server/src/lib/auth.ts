import type { Response } from "express"
import jwt from "jsonwebtoken"

export const COOKIE_NAME = "token"

export function createToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" })
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" })
}
