import { prisma } from "../../db/db"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const setSessionCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "30d" })
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  })
}

export const register = async (req, res) => {
  const { name, email, password } = req.body

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })
  if (existingUser) {
    return res.status(409).json({
      error: "User already exists",
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  })

  setSessionCookie(res, { userId: user.id.toString(), email: user.email })

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({
    where: { email },
  })
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

  setSessionCookie(res, { userId: user.id.toString(), email: user.email })

  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })
}

export const logout = async (_req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
  res.json({ success: true })
}

export const me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Not authenticated",
    })
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.user.userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!user) {
    return res.status(404).json({
      error: "User not found",
    })
  }

  return res.json({
    user,
  })
}
