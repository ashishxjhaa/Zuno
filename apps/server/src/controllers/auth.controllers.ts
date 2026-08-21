import type { Request, Response } from "express"
import bcrypt from "bcrypt"
import { signinSchema, signupSchema } from "../lib/schema"
import { prisma } from "../lib/prisma"
import { clearAuthCookie, createToken, setAuthCookie } from "../lib/auth"

export async function signup(req: Request, res: Response) {
  try {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "All fields required",
      })
    }

    const { name, email, password } = parsed.data

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
      })
    }

    const hashPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: { name, email, password: hashPassword },
    })

    return res.status(201).json({
      message: "Signup successful",
    })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function signin(req: Request, res: Response) {
  try {
    const parsed = signinSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "All fields required",
      })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      })
    }

    const token = createToken(user.id)
    setAuthCookie(res, token)

    return res.status(200).json({
      message: "Signin successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export function signout(_req: Request, res: Response) {
  clearAuthCookie(res)
  return res.status(204).end()
}

export async function me(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: "Unauthorized",
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true },
    })

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      })
    }

    return res.status(200).json({ user })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}
