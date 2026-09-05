"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { EyeIcon, EyeOffIcon, LoaderIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import { useSession } from "@/lib/session"
import { SITE_NAME } from "@/lib/site"

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
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignin = mode === "signin"
  const fields = isSignin ? SIGNIN_FIELDS : SIGNUP_FIELDS

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    setPending(true)
    try {
      if (isSignin) {
        await signin(values.email, values.password)
        router.push("/")
      } else {
        await signup(values.name, values.email, values.password)
        router.push("/signin")
      }
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: unknown } } })
        ?.response?.data
      const err = data?.error

      if (typeof err === "string") {
        toast.error(err)
        return
      }

      if (err && typeof err === "object" && "fieldErrors" in err) {
        const fieldErrors = (
          err as { fieldErrors?: Record<string, string[] | undefined> }
        ).fieldErrors
        for (const messages of Object.values(fieldErrors ?? {})) {
          if (Array.isArray(messages) && typeof messages[0] === "string") {
            toast.error(messages[0])
            return
          }
        }
      }

      toast.error("Something went wrong. Check your connection and try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative w-full max-w-[400px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-sm opacity-90 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, rgba(255,88,0,0.14) 0%, transparent 70%), radial-gradient(50% 50% at 80% 80%, rgba(124,92,252,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="rounded-sm border border-black/[0.04] bg-[#EDE4FF] p-2.5 sm:p-3">
        <div className="rounded-sm border border-black/[0.04] bg-white p-5 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/zuno.svg" alt="" width={32} height={32} priority />
              <span className="text-[18px] font-semibold tracking-tight text-zinc-950">
                {SITE_NAME}
              </span>
            </Link>
            <h1
              className="mt-5 text-[26px] leading-[1.15] tracking-[-0.03em] text-[#1f1f1f] sm:text-[30px]"
              style={{
                fontFamily: 'Georgia, "Times New Roman", Times, serif',
              }}
            >
              {isSignin ? "Sign in" : "Sign up"}
            </h1>
          </div>

          <form
            className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5"
            onSubmit={(event) => void onSubmit(event)}
          >
            {fields.map((field) => {
              const isPassword = field.name === "password"
              return (
                <div key={field.name} className="space-y-2">
                  <label
                    htmlFor={field.name}
                    className="block text-[13px] font-medium text-zinc-700"
                  >
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      id={field.name}
                      name={field.name}
                      type={
                        isPassword
                          ? showPassword
                            ? "text"
                            : "password"
                          : field.type
                      }
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      disabled={pending}
                      value={values[field.name]}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.name]: event.target.value,
                        }))
                      }
                      className={cn(
                        "h-10 w-full rounded-sm border border-zinc-200 bg-[#FAFAFA] px-3.5 text-[14.5px] text-zinc-950 outline-none transition-[border-color,box-shadow,background-color]",
                        isPassword ? "pr-11" : "",
                        "placeholder:text-zinc-400",
                        "hover:border-zinc-300",
                        "focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-900/5",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    />
                    {isPassword ? (
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={pending}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="cursor-pointer absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-zinc-400 transition-colors hover:text-zinc-700 disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}

            <button
              type="submit"
              disabled={pending}
              className={cn(
                "mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[#ff5800] px-4 text-[14.5px] font-semibold text-white transition-colors",
                "hover:bg-[#e04e00]",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {pending ? (
                <>
                  <LoaderIcon className="size-4 animate-spin" />
                  {isSignin ? "Signing in..." : "Creating account..."}
                </>
              ) : isSignin ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[13.5px] text-zinc-500">
            {isSignin ? (
              <>
                No account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#ff5800] transition-colors hover:text-[#e04e00]"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-[#ff5800] transition-colors hover:text-[#e04e00]"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>

          <p className="mt-3 text-center text-[12.5px] text-zinc-400">
            <Link href="/" className="transition-colors hover:text-zinc-600">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
