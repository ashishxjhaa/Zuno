import { z } from "zod"

const nameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .max(80, "Full name must be at most 80 characters")

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email")
  .max(254, "Email is too long")

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const signinSchema = z.object({
  email: emailSchema,
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
