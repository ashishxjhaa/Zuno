"use client"

import { useEffect } from "react"
import { useAppContext } from "@/app/providers"
import Image from "next/image"
import PromptInput from "@/components/prompt-input"
import { homeTags } from "@/lib/homeTag"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, ClockIcon, Trash2Icon } from "lucide-react"
import moment from "moment"

const HomePage = () => {
  const router = useRouter()

  const {
    user,
    projects,
    loadingProjects,
    generatingProject,
    loadProjects,
    handleGenerate,
    handleDelete,
    logout,
  } = useAppContext()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <div className="h-screen overflow-y-scroll font-sans text-white">
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Image src="/" alt="logo" width={24} height={24} />
          <span className="text-xl font-semibold tracking-tight">Zuno</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
          <span>{user?.name}</span>
          <button
            onClick={logout}
            className="cursor-pointer rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center px-6 pb-20 xl:mt-28">
        <div className="flex w-full max-w-2xl flex-col items-center">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 pr-3 text-[13px] text-white/90 backdrop-blur-md">
            <span className="rounded-full bg-red-700 px-3 py-1 text-[11px] font-medium tracking-wider">
              PROMO
            </span>
            <span>Create your first project for free.</span>
          </div>

          <h1 className="mt-4 max-w-2xl text-center text-4xl font-medium text-white md:text-6xl">
            Let's build your app together
          </h1>
          <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-white/65 md:text-base">
            Describe your idea and watch AI design, structure and launch your
            website instantly. No coding required.
          </p>

          <div className="mt-6 w-full">
            <PromptInput
              onSubmit={handleGenerate}
              loading={generatingProject}
              placeholder="Create a portfolio website..."
              variant="glass"
              autoFocus
            />
          </div>

          <div className="masked-marguee mt-4 w-full max-w-2xl overflow-hidden py-1">
            <div className="animate-marquee gap-3">
              {homeTags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => handleGenerate(tag)}
                  disabled={generatingProject}
                  className="shrink-0 cursor-pointer rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {!loadingProjects && projects.length > 0 && (
            <div className="mt-12 w-full">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-xs font-medium tracking-widest text-zinc-100 uppercase">
                  All Projects
                </p>
                <span className="text-xs font-normal text-zinc-100">
                  {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </span>
              </div>

              <div className="max-h-[80vh] space-y-2 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <div
                    key={p._id}
                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
                    onClick={() => router.push(`/builder/${p._id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {p.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-zinc-300">
                          <ClockIcon size={10} />
                          {moment(p.updatedAt || p.createdAt).fromNow()}
                        </span>
                        <span className="text-xs font-medium text-white/60">
                          v{p.version}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(p._id)
                        }}
                        className="rounded-md p-1.5 text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-red-400"
                      >
                        <Trash2Icon size={14} />
                      </button>
                      <ArrowRightIcon
                        size={14}
                        className="text-zinc-200 group-hover:text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage
