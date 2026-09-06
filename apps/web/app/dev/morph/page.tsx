"use client"

import { GrokBotMorph } from "@/components/grok-bot-morph"

export default function MorphPreviewPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <GrokBotMorph size={480} paper="#ffffff" />
    </main>
  )
}
