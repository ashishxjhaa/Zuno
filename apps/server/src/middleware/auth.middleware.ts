import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { COOKIE_NAME } from "../lib/auth"

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies[COOKIE_NAME]
  if (!token || typeof token !== "string") {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!)
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.userId !== "string"
    ) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: "Unauthorized" })
  }
}
