import { z } from "zod"

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export const signinSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
})

export const createProjectSchema = z.object({
  initialPrompt: z
    .string()
    .trim()
    .min(3, "Describe what you want to build")
    .max(8000, "Prompt is too long"),
})

export const conversationSchema = z.object({
  contents: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(8000, "Message is too long"),
})

export type SignupInput = z.infer<typeof signupSchema>
export type SigninInput = z.infer<typeof signinSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type ConversationInput = z.infer<typeof conversationSchema>
