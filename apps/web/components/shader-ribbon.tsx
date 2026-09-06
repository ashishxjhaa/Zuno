"use client"

import { useEffect, useRef } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function ShaderRibbon({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    let raf = 0
    let running = true
    let t = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    const draw = () => {
      if (!running) return
      resize()
      const w = canvas.width
      const h = canvas.height
      // Slow drift — keep gentle, never the old hover speed
      const speed = reduceMotion ? 0 : 0.008
      t += speed

      const base = ctx.createLinearGradient(0, 0, w, 0)
      base.addColorStop(0, "#3b1d8f")
      base.addColorStop(0.45, "#5b2fd6")
      base.addColorStop(1, "#2f6de0")
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)

      const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h)
      bottom.addColorStop(0, "rgba(42, 21, 104, 0)")
      bottom.addColorStop(1, "rgba(36, 18, 90, 0.95)")
      ctx.fillStyle = bottom
      ctx.fillRect(0, 0, w, h)

      const cols = Math.max(48, Math.floor(w / 10))
      const amp = h * 0.22

      for (let i = 0; i < cols; i++) {
        const x = ((i + 0.5) / cols) * w
        const phase = t * 1.2 + i * 0.28
        const localAmp = amp * (0.65 + 0.35 * Math.sin(i * 0.17 + t))
        const bright = 180 + (i % 7) * 8

        ctx.beginPath()
        ctx.strokeStyle = `rgba(${bright}, ${bright + 20}, 255, 0.55)`
        ctx.lineWidth = Math.max(1, w / cols / 2.4)

        const steps = 28
        for (let s = 0; s <= steps; s++) {
          const y = (s / steps) * h
          const wave =
            Math.sin(y * 0.035 + phase) * localAmp * 0.35 +
            Math.sin(y * 0.09 + phase * 1.4) * localAmp * 0.2
          const px = x + wave
          if (s === 0) ctx.moveTo(px, y)
          else ctx.lineTo(px, y)
        }
        ctx.stroke()

        ctx.fillStyle = "rgba(255, 255, 255, 0.22)"
        for (let s = 2; s < steps; s += 3) {
          const y = (s / steps) * h
          if (y > h * 0.72) continue
          const wave =
            Math.sin(y * 0.035 + phase) * localAmp * 0.35 +
            Math.sin(y * 0.09 + phase * 1.4) * localAmp * 0.2
          const px = x + wave
          const tick = 2 + (Math.sin(phase + s) + 1) * 1.5
          ctx.fillRect(px - 0.5, y - tick / 2, 1.2, tick)
        }
      }

      const glow = ctx.createRadialGradient(
        w * 0.55,
        h * 0.35,
        0,
        w * 0.55,
        h * 0.35,
        w * 0.45
      )
      glow.addColorStop(0, "rgba(140, 120, 255, 0.22)")
      glow.addColorStop(1, "rgba(140, 120, 255, 0)")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    const onResize = () => resize()
    window.addEventListener("resize", onResize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "shadow-[0_18px_56px_rgba(74,36,181,0.4)]",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="block h-[72px] w-full sm:h-[96px]"
        aria-hidden
      />
      <span className="sr-only">Animated shader ribbon</span>
    </div>
  )
}
