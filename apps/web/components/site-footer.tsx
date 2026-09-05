import Image from "next/image"
import Link from "next/link"
import { Mail } from "lucide-react"
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  CONTACT_EMAIL,
  GITHUB_ISSUES_URL,
  GITHUB_PROFILE_URL,
  GITHUB_URL,
  SITE_NAME,
  SITE_TAGLINE,
  TWITTER_URL,
} from "@/lib/site"

const PRODUCT_LINKS = [
  { href: "/#modern-sites", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/signin", label: "Sign in" },
  { href: "/signup", label: "Get started" },
] as const

const RESOURCE_LINKS = [
  { href: GITHUB_URL, label: "GitHub repository", external: true },
  { href: GITHUB_ISSUES_URL, label: "Report an issue", external: true },
] as const

const CONNECT_LINKS = [
  { href: GITHUB_PROFILE_URL, label: "GitHub", external: true },
  { href: TWITTER_URL, label: "X (Twitter)", external: true },
  { href: `mailto:${CONTACT_EMAIL}`, label: "Email us", external: true },
] as const

function FooterLink({
  href,
  label,
  external,
}: {
  href: string
  label: string
  external?: boolean
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="text-[14px] text-zinc-500 transition-colors hover:text-[#ff5800]"
    >
      {label}
    </Link>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2C6.477 2 2 6.486 2 12.021c0 4.425 2.865 8.18 6.839 9.504.5.093.682-.217.682-.483 0-.237-.009-.866-.013-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.621.069-.608.069-.608 1.003.071 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.952 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.944.359.31.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.486 17.523 2 12 2z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-sm border border-zinc-200/90 bg-white text-zinc-600 transition-colors hover:border-[#ff5800]/35 hover:bg-[#ff5800]/5 hover:text-[#ff5800]"
    >
      {children}
    </Link>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#FAFAFA]">
      <div className="mx-auto w-full max-w-[80rem] px-5 pt-20 pb-10 sm:px-10 sm:pt-24 sm:pb-12">
        <div className="rounded-sm border border-black/[0.04] bg-white p-8 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.45fr_1fr_1fr_1fr] lg:gap-10">
            <div className="max-w-md">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <Image src="/zuno.svg" alt="" width={28} height={28} />
                <span className="text-lg font-semibold tracking-tight text-zinc-950">
                  {SITE_NAME}
                </span>
              </Link>
              <p className="mt-2 text-[13px] font-medium tracking-wide text-[#ff5800] uppercase">
                {SITE_TAGLINE}
              </p>
              <p className="mt-4 max-w-[34ch] text-[15px] leading-[1.55] text-zinc-500">
                Clarify in chat, pick React or Next, build a live site, then refine it through chat.
              </p>
              <div className="mt-7 flex items-center gap-2.5">
                <SocialButton href={GITHUB_PROFILE_URL} label="GitHub">
                  <GitHubIcon className="size-4" />
                </SocialButton>
                <SocialButton href={TWITTER_URL} label="X">
                  <XIcon className="size-3.5" />
                </SocialButton>
                <SocialButton href={`mailto:${CONTACT_EMAIL}`} label="Email">
                  <Mail className="size-4" />
                </SocialButton>
              </div>
            </div>

            <div>
              <h3 className="text-[13px] font-semibold tracking-[0.04em] text-zinc-950 uppercase">
                Product
              </h3>
              <ul className="mt-5 space-y-3.5">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-semibold tracking-[0.04em] text-zinc-950 uppercase">
                Resources
              </h3>
              <ul className="mt-5 space-y-3.5">
                {RESOURCE_LINKS.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-semibold tracking-[0.04em] text-zinc-950 uppercase">
                Connect
              </h3>
              <ul className="mt-5 space-y-3.5">
                {CONNECT_LINKS.map((link) => (
                  <li key={link.href}>
                    <FooterLink {...link} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-zinc-100 pt-7 text-[13px] text-zinc-400 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {SITE_NAME}. All rights reserved.
            </p>
            <p>
              Built by{" "}
              <Link
                href={AUTHOR_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-zinc-700 transition-colors hover:text-[#ff5800]"
              >
                {AUTHOR_NAME}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
