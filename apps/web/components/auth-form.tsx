"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { signinSchema, signupSchema } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AuthError } from "@/lib/auth"
import { clearPendingPrompt, readPendingPrompt } from "@/lib/pending-prompt"
import { createProject } from "@/lib/projects"
import { useSession } from "@/lib/session"

type AuthMode = "signin" | "signup"
type AuthField = "name" | "email" | "password"

const SIGNIN_FIELDS = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    autoComplete: "current-password",
  },
] as const

const SIGNUP_FIELDS = [
  {
    name: "name",
    label: "Full name",
    type: "text",
    placeholder: "Ashish Jha",
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "••••••••",
    autoComplete: "new-password",
  },
] as const

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }

  return value
}

function isAuthField(value: unknown): value is AuthField {
  return value === "name" || value === "email" || value === "password"
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading, signin, signup } = useSession()
  const [values, setValues] = useState({ name: "", email: "", password: "" })
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignin = mode === "signin"
  const fields = isSignin ? SIGNIN_FIELDS : SIGNUP_FIELDS

  useEffect(() => {
    if (isLoading || !user) {
      return
    }

    const pending = readPendingPrompt()
    if (pending) {
      const project = createProject(pending)
      clearPendingPrompt()
      router.replace(`/builder/${project.id}`)
      return
    }

    router.replace(safeNextPath(searchParams.get("next")))
  }, [isLoading, user, router, searchParams])

  if (!isLoading && user) {
    return null
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = isSignin
      ? signinSchema.safeParse(values)
      : signupSchema.safeParse(values)

    if (!parsed.success) {
      const fieldErrors: Partial<Record<AuthField, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (isAuthField(key)) {
          fieldErrors[key] ??= issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      if (isSignin) {
        await signin(parsed.data)
      } else {
        await signup(parsed.data)
      }

      toast.success(isSignin ? "Welcome back." : "Account created.")
    } catch (error) {
      toast.error(
        error instanceof AuthError ? error.message : "Something went wrong"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm border-border bg-card/80 backdrop-blur-md">
      <CardHeader>
        <CardTitle>{isSignin ? "Sign in" : "Create an account"}</CardTitle>
        <CardDescription>
          {isSignin
            ? "Use your email to continue building."
            : "We’ll use your name in the navbar after you sign in."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                value={values[field.name]}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: event.target.value,
                  }))
                }
                disabled={isSubmitting}
              />
              {errors[field.name] ? (
                <p className="text-xs text-destructive">{errors[field.name]}</p>
              ) : null}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSignin ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignin ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/signin" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  )
}
