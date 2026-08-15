"use client"

import { useAppContext } from "@/app/providers"
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

const AuthPage = ({ mode }) => {
  const { login, register } = useAppContext()
  const router = useRouter()

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const isLogin = mode === "login"

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      router.push("/")
    } catch (err) {
      setError(
        err.message ||
          (mode === "login"
            ? "Invalid email or password"
            : "Registration failed")
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-zinc-900">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h1 className="mb-1.5 font-sans text-3xl font-medium tracking-tight text-zinc-900">
              {isLogin ? "Sign in" : "Create an account"}
            </h1>
            <p className="text-sm text-zinc-400">
              {isLogin
                ? "Enter your credentials to access your website builder."
                : "Get started by entering your registration details."}
            </p>
          </div>
          {error && (
            <div className="mb-6 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="mb-2 block text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border-b border-zinc-200 bg-transparent py-2 pl-2 text-sm text-zinc-900 placeholder-zinc-300 transition-colors focus:border-zinc-950 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-b border-zinc-200 bg-transparent py-2 pl-2 text-sm text-zinc-900 placeholder-zinc-300 transition-colors focus:border-zinc-950 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-b border-zinc-200 bg-transparent py-2 pl-2 text-sm text-zinc-900 placeholder-zinc-300 transition-colors focus:border-zinc-950 focus:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center justify-center text-zinc-300 transition-colors hover:text-zinc-600"
                >
                  {showPassword ? (
                    <EyeOffIcon size={14} />
                  ) : (
                    <EyeIcon size={14} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-lg bg-linear-to-br from-red-600 to-amber-600 py-2.5 font-semibold text-white transition-all hover:scale-102 disabled:opacity-40"
            >
              {loading && (
                <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              {isLogin ? "Sign in" : "Sign up"}
            </button>
          </form>

          <p className="mt-8 border-t border-zinc-100 pt-6 font-sans text-sm text-zinc-400">
            {isLogin ? (
              <>
                New to Zuno?{" "}
                <Link
                  href="/register"
                  className="font-medium text-zinc-900 hover:underline"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-zinc-900 hover:underline"
                >
                  Sign in here
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
