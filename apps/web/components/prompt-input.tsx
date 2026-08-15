"use client"

import {
  ArrowRightIcon,
  CloudUploadIcon,
  Loader2Icon,
  MicIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

const PromptInput = ({
  onSubmit,
  loading = false,
  placeholder = "Describe the website you want to build...",
  large = false,
  autoFocus = false,
  variant = "default",
}) => {
  const [value, setValue] = useState("")
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || loading) return
    onSubmit(trimmed)
    setValue("")
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (variant === "glass") {
    return (
      <form
        onSubmit={handleSubmit}
        className="mt-6 w-full max-w-2xl overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur-xl transition focus-within:ring-2 focus-within:ring-white/30"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          rows={3}
          className="w-full resize-none bg-transparent p-4 pb-2 text-base text-white outline-none placeholder:text-white/60"
        />

        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          <label
            htmlFor="file"
            className="flex cursor-pointer items-center justify-center rounded-md border border-white/20 p-1.5 text-white/80 hover:border-white/30 hover:text-white"
          >
            <input type="file" id="file" hidden />
            <CloudUploadIcon size={18} />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="flex cursor-pointer items-center justify-center p-1 text-white/70 hover:text-white"
            >
              <MicIcon size={18} />
            </button>

            <button
              type="submit"
              disabled={!value.trim() || loading}
              className="flex cursor-pointer items-center justify-center rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 disabled:opacity-40"
            >
              {loading ? (
                <Loader2Icon size={18} className="animate-spin" />
              ) : (
                <ArrowRightIcon size={18} />
              )}
            </button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <div
      className={`flex items-end gap-2 rounded-xl border border-zinc-200 bg-white transition focus-within:ring-1 focus-within:ring-zinc-300 ${large ? "p-4" : "p-3"}`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={loading}
        rows={large ? 5 : 1}
        className={`flex-1 resize-none border-none bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 ${large ? "text-base" : "text-sm"}`}
      />
      <button
        onClick={() => handleSubmit()}
        disabled={!value.trim() || loading}
        className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40"
        style={{ width: large ? 36 : 24, height: large ? 36 : 24 }}
      >
        {loading ? (
          <Loader2Icon size={large ? 20 : 15} className="animate-spin" />
        ) : (
          <ArrowRightIcon size={large ? 20 : 15} />
        )}
      </button>
    </div>
  )
}

export default PromptInput
