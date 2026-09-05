"use client"

import type { ReactNode } from "react"

function renderInline(text: string, keyOffset: number): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = keyOffset

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index))
    }
    const token = match[0]
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded-sm bg-zinc-200/80 px-1 py-0.5 font-mono text-[12px]"
        >
          {token.slice(1, -1)}
        </code>
      )
    } else {
      nodes.push(token)
    }
    last = match.index + token.length
  }

  if (last < text.length) {
    nodes.push(text.slice(last))
  }

  return nodes
}

/** Lightweight markdown: **bold**, *italic*, `code`, and newlines. No HTML. */
export function ChatMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  const nodes: ReactNode[] = []
  let key = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ""
    nodes.push(...renderInline(line, key))
    key += line.length + 8
    if (i < lines.length - 1) {
      nodes.push(<br key={`br-${i}`} />)
    }
  }
  return <>{nodes}</>
}
