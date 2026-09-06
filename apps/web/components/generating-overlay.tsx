"use client"

import { GrokBotMorph } from "./grok-bot-morph"

export function GeneratingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
      <GrokBotMorph size={480} paper="#ffffff" />
    </div>
  )
}
