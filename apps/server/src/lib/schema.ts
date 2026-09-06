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
    .min(1, "Describe what you want to build")
    .max(8000, "Prompt is too long"),
})

export const conversationSchema = z
  .object({
    contents: z
      .string()
      .trim()
      .max(8000, "Message is too long")
      .optional(),
    // Resume a pending intake or generate turn after create
    resume: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const contents = value.contents?.trim() ?? ""
    if (!value.resume && !contents) {
      ctx.addIssue({
        code: "custom",
        message: "Message is required",
        path: ["contents"],
      })
    }
  })

export const stackSchema = z.object({
  framework: z.enum(["react", "nextjs"]),
  language: z.enum(["javascript", "typescript"]),
})
