"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
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
import { useSession } from "@/lib/session"

type AuthMode = "signin" | "signup"

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

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const { signin, signup } = useSession()
  const [values, setValues] = useState({ name: "", email: "", password: "" })

  const isSignin = mode === "signin"
  const fields = isSignin ? SIGNIN_FIELDS : SIGNUP_FIELDS

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      if (isSignin) {
        await signin(values.email, values.password)
        router.push("/")
      } else {
        await signup(values.name, values.email, values.password)
        router.push("/signin")
      }
    } catch (error: any) {
      const err = error.response.data.error
      if (typeof err === "string") {
        toast.error(err)
        return
      }

      for (const messages of Object.values(err.fieldErrors)) {
        if (Array.isArray(messages) && typeof messages[0] === "string") {
          toast.error(messages[0])
          return
        }
      }
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
              />
            </div>
          ))}

          <Button type="submit" className="w-full">
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
