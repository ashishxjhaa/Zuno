"use client"

import { useEffect, useId, useMemo, useRef } from "react"
import { defaultCycle, type Block } from "@/lib/bloub/cycles"
import { NOTIF_BLUE, type ArcRender, type DotRender } from "@/lib/bloub/decor"
import { BotEngine, type BotFrame } from "@/lib/bloub/engine"
import { DEMI_VIEWBOX, RAYON } from "@/lib/bloub/repere"
import { mixHex } from "@/lib/bloub/skins"

const VB = DEMI_VIEWBOX
const R = RAYON
const SVG_NS = "http://www.w3.org/2000/svg"

/** Solid brand for dots / particle mixHex */
const ZUNO_INK = "#f12711"

function dotFill(dot: DotRender, ink: string, paper: string): string {
  if (dot.color) return dot.color
  if (dot.depth === undefined) return ink
  return mixHex(paper, ink, dot.depth)
}

function ensureChild(
  parent: Element,
  tag: string,
  index: number
): SVGElement {
  const kids = parent.children
  let el = kids[index] as SVGElement | undefined
  if (el && el.tagName.toLowerCase() === tag.toLowerCase()) return el
  while (parent.children.length > index) {
    parent.removeChild(parent.lastChild!)
  }
  el = document.createElementNS(SVG_NS, tag) as SVGElement
  parent.appendChild(el)
  return el
}

function trimChildren(parent: Element, keep: number) {
  while (parent.children.length > keep) {
    parent.removeChild(parent.lastChild!)
  }
}

function setAttr(el: Element, name: string, value: string | number) {
  const s = String(value)
  if (el.getAttribute(name) !== s) el.setAttribute(name, s)
}

function paintDot(
  parent: Element,
  index: number,
  dot: DotRender,
  ink: string,
  paper: string
) {
  const fill = dotFill(dot, ink, paper)
  if (dot.d) {
    const path = ensureChild(parent, "path", index)
    setAttr(path, "d", dot.d)
    setAttr(path, "fill", fill)
    setAttr(path, "opacity", dot.opacity)
    setAttr(
      path,
      "transform",
      `translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`
    )
    path.removeAttribute("cx")
    path.removeAttribute("cy")
    path.removeAttribute("r")
  } else {
    const circle = ensureChild(parent, "circle", index)
    setAttr(circle, "cx", dot.x)
    setAttr(circle, "cy", dot.y)
    setAttr(circle, "r", dot.r)
    setAttr(circle, "fill", fill)
    setAttr(circle, "opacity", dot.opacity)
    circle.removeAttribute("d")
    circle.removeAttribute("transform")
  }
}

function syncStops(grad: SVGLinearGradientElement, stops: string[]) {
  const n = stops.length
  for (let i = 0; i < n; i++) {
    const stop = ensureChild(grad, "stop", i) as SVGStopElement
    const offset = n <= 1 ? 0 : i / (n - 1)
    setAttr(stop, "offset", offset)
    setAttr(stop, "stop-color", stops[i]!)
  }
  trimChildren(grad, n)
}

function syncArcGrad(
  host: Element,
  uid: string,
  arc: ArcRender,
  slot: number
) {
  // Only mutate dedicated arc-grad host - never touch mask / brand fills in defs
  let grad = host.children[slot] as SVGLinearGradientElement | undefined
  if (!grad || grad.tagName.toLowerCase() !== "lineargradient") {
    while (host.children.length > slot) {
      host.removeChild(host.lastChild!)
    }
    grad = document.createElementNS(
      SVG_NS,
      "linearGradient"
    ) as SVGLinearGradientElement
    host.appendChild(grad)
  }
  setAttr(grad, "id", `${uid}-${arc.id}`)
  setAttr(grad, "gradientUnits", "userSpaceOnUse")
  setAttr(grad, "x1", arc.grad.x1)
  setAttr(grad, "y1", arc.grad.y1)
  setAttr(grad, "x2", arc.grad.x2)
  setAttr(grad, "y2", arc.grad.y2)
  syncStops(grad, arc.grad.stops)
}

function paintArcPath(
  parent: Element,
  index: number,
  d: string,
  strokeUrl: string,
  width: number,
  opacity: number
) {
  const path = ensureChild(parent, "path", index)
  setAttr(path, "d", d)
  setAttr(path, "stroke", strokeUrl)
  setAttr(path, "stroke-width", width)
  setAttr(path, "opacity", opacity)
  setAttr(path, "fill", "none")
}

type SceneRefs = {
  svg: SVGSVGElement
  maskBody: SVGPathElement
  maskEyes: SVGGElement
  maskNotch: SVGCircleElement
  defs: SVGDefsElement
  arcGrads: SVGGElement
  arcsBack: SVGGElement
  dotsBehind: SVGGElement
  bodyGroup: SVGGElement
  bodyFill: SVGPathElement
  inkRect: SVGRectElement
  dotsFront: SVGGElement
  notif: SVGCircleElement
  arcsFront: SVGGElement
  ink: string
  paper: string
  uid: string
  maskId: string
}

function applyFrame(scene: SceneRefs, frame: BotFrame) {
  const { uid, ink, paper } = scene

  setAttr(scene.maskBody, "d", frame.bodyPath)
  setAttr(scene.bodyFill, "d", frame.bodyPath)
  setAttr(scene.bodyGroup, "opacity", frame.bodyAlpha)

  const eyes = frame.eyes
  for (let i = 0; i < eyes.length; i++) {
    const eye = eyes[i]!
    const path = ensureChild(scene.maskEyes, "path", i)
    setAttr(path, "d", eye.d)
    setAttr(path, "transform", eye.matrix)
    setAttr(path, "opacity", eye.alpha)
    setAttr(path, "fill", "#000")
  }
  trimChildren(scene.maskEyes, eyes.length)

  if (frame.notch) {
    setAttr(scene.maskNotch, "cx", frame.notch.x)
    setAttr(scene.maskNotch, "cy", frame.notch.y)
    setAttr(scene.maskNotch, "r", frame.notch.r)
    setAttr(scene.maskNotch, "fill", "#000")
    scene.maskNotch.style.display = ""
  } else {
    scene.maskNotch.style.display = "none"
  }

  const arcs = frame.arcs
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i]!
    syncArcGrad(scene.arcGrads, uid, arc, i)
    const stroke = `url(#${uid}-${arc.id})`
    paintArcPath(scene.arcsBack, i, arc.back, stroke, arc.width, arc.opacity)
    paintArcPath(scene.arcsFront, i, arc.front, stroke, arc.width, arc.opacity)
  }
  trimChildren(scene.arcsBack, arcs.length)
  trimChildren(scene.arcsFront, arcs.length)
  trimChildren(scene.arcGrads, arcs.length)

  if (frame.dotsBehind) {
    for (let i = 0; i < frame.dots.length; i++) {
      paintDot(scene.dotsBehind, i, frame.dots[i]!, ink, paper)
    }
    trimChildren(scene.dotsBehind, frame.dots.length)
    trimChildren(scene.dotsFront, 0)
  } else {
    for (let i = 0; i < frame.dots.length; i++) {
      paintDot(scene.dotsFront, i, frame.dots[i]!, ink, paper)
    }
    trimChildren(scene.dotsFront, frame.dots.length)
    trimChildren(scene.dotsBehind, 0)
  }

  if (frame.notif) {
    setAttr(scene.notif, "cx", frame.notif.x)
    setAttr(scene.notif, "cy", frame.notif.y)
    setAttr(scene.notif, "r", frame.notif.r)
    setAttr(scene.notif, "fill", NOTIF_BLUE)
    scene.notif.style.display = ""
  } else {
    scene.notif.style.display = "none"
  }
}

export function GrokBotMorph({
  size = 420,
  paper = "#ffffff",
  className,
}: {
  size?: number
  paper?: string
  className?: string
}) {
  const reactId = useId()
  const uid = useMemo(
    () => reactId.replace(/:/g, "") || "bot",
    [reactId]
  )
  const maskId = `bot-mask-${uid}`
  // Body uses Zuno radial gradient; dots/particles use solid brand red
  const ink = ZUNO_INK

  // Outer host owned by React; entire SVG tree is imperative so parent
  // re-renders never wipe rAF-managed nodes.
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SceneRefs | null>(null)

  const engineRef = useRef<BotEngine | null>(null)
  const cycleRef = useRef<Block[]>([])
  const blockRef = useRef(0)
  const clockRef = useRef(0)
  const lastRef = useRef(0)
  const blockStartRef = useRef(0)
  const nextAtRef = useRef(Infinity)
  const rafRef = useRef(0)

  const inkRef = useRef(ink)
  const paperRef = useRef(paper)
  const sizeRef = useRef(size)
  const classNameRef = useRef(className)
  inkRef.current = ink
  paperRef.current = paper
  sizeRef.current = size
  classNameRef.current = className

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    host.replaceChildren()

    const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement
    setAttr(svg, "width", sizeRef.current)
    setAttr(svg, "height", sizeRef.current)
    setAttr(svg, "viewBox", `${-VB} ${-VB} ${VB * 2} ${VB * 2}`)
    setAttr(svg, "role", "img")
    setAttr(svg, "aria-label", "Generating")
    setAttr(svg, "shape-rendering", "geometricPrecision")
    svg.style.display = "block"
    if (classNameRef.current) svg.setAttribute("class", classNameRef.current)

    const defs = document.createElementNS(SVG_NS, "defs") as SVGDefsElement
    const mask = document.createElementNS(SVG_NS, "mask")
    setAttr(mask, "id", maskId)
    setAttr(mask, "maskUnits", "userSpaceOnUse")
    setAttr(mask, "x", -VB)
    setAttr(mask, "y", -VB)
    setAttr(mask, "width", VB * 2)
    setAttr(mask, "height", VB * 2)

    const maskBody = document.createElementNS(SVG_NS, "path") as SVGPathElement
    setAttr(maskBody, "fill", "#fff")
    const maskEyes = document.createElementNS(SVG_NS, "g") as SVGGElement
    const maskNotch = document.createElementNS(
      SVG_NS,
      "circle"
    ) as SVGCircleElement
    maskNotch.style.display = "none"
    mask.append(maskBody, maskEyes, maskNotch)
    defs.appendChild(mask)

    // Arc gradients live in their own host so sync never deletes mask/brand nodes
    const arcGrads = document.createElementNS(SVG_NS, "g") as SVGGElement
    setAttr(arcGrads, "id", `${uid}-arc-grads`)
    defs.appendChild(arcGrads)

    const arcsBack = document.createElementNS(SVG_NS, "g") as SVGGElement
    setAttr(arcsBack, "fill", "none")
    setAttr(arcsBack, "stroke-linecap", "round")

    const dotsBehind = document.createElementNS(SVG_NS, "g") as SVGGElement

    const bodyGroup = document.createElementNS(SVG_NS, "g") as SVGGElement
    const bodyFill = document.createElementNS(SVG_NS, "path") as SVGPathElement
    setAttr(bodyFill, "fill", paperRef.current)
    const masked = document.createElementNS(SVG_NS, "g")
    setAttr(masked, "mask", `url(#${maskId})`)
    const inkRect = document.createElementNS(SVG_NS, "rect") as SVGRectElement
    setAttr(inkRect, "x", -VB)
    setAttr(inkRect, "y", -VB)
    setAttr(inkRect, "width", VB * 2)
    setAttr(inkRect, "height", VB * 2)
    setAttr(inkRect, "fill", ZUNO_INK)
    masked.appendChild(inkRect)
    bodyGroup.append(bodyFill, masked)

    const dotsFront = document.createElementNS(SVG_NS, "g") as SVGGElement

    const notif = document.createElementNS(SVG_NS, "circle") as SVGCircleElement
    notif.style.display = "none"

    const arcsFront = document.createElementNS(SVG_NS, "g") as SVGGElement
    setAttr(arcsFront, "fill", "none")
    setAttr(arcsFront, "stroke-linecap", "round")

    svg.append(
      defs,
      arcsBack,
      dotsBehind,
      bodyGroup,
      dotsFront,
      notif,
      arcsFront
    )
    host.appendChild(svg)

    const scene: SceneRefs = {
      svg,
      maskBody,
      maskEyes,
      maskNotch,
      defs,
      arcGrads,
      arcsBack,
      dotsBehind,
      bodyGroup,
      bodyFill,
      inkRect,
      dotsFront,
      notif,
      arcsFront,
      ink: inkRef.current,
      paper: paperRef.current,
      uid,
      maskId,
    }
    sceneRef.current = scene

    const cycle = defaultCycle().blocks
    cycleRef.current = cycle
    const engine = new BotEngine(R, cycle[0]?.state ?? "idle")
    engineRef.current = engine
    clockRef.current = 0
    lastRef.current = 0
    blockRef.current = 0
    blockStartRef.current = 0

    const apply = (i: number, from = 0) => {
      const b = cycleRef.current[i]
      if (!b || !engineRef.current) {
        nextAtRef.current = Infinity
        return
      }
      blockStartRef.current = clockRef.current - from
      engineRef.current.setState(b.state, clockRef.current)
      nextAtRef.current = blockStartRef.current + b.duration
    }

    const goToBlock = (i: number) => {
      blockRef.current = i
      apply(i)
    }

    apply(0)
    applyFrame(scene, engine.sample(0))

    const tick = (ms: number) => {
      rafRef.current = requestAnimationFrame(tick)
      const eng = engineRef.current
      const sc = sceneRef.current
      if (!eng || !sc) return

      const dt = lastRef.current
        ? Math.min((ms - lastRef.current) / 1000, 0.064)
        : 0
      lastRef.current = ms
      clockRef.current += dt

      const blocks = cycleRef.current
      if (clockRef.current >= nextAtRef.current && blocks.length) {
        goToBlock((blockRef.current + 1) % blocks.length)
      }

      if (sc.ink !== inkRef.current || sc.paper !== paperRef.current) {
        sc.ink = inkRef.current
        sc.paper = paperRef.current
        setAttr(sc.bodyFill, "fill", sc.paper)
        setAttr(sc.inkRect, "fill", ZUNO_INK)
      }

      const sz = sizeRef.current
      if (sc.svg.getAttribute("width") !== String(sz)) {
        setAttr(sc.svg, "width", sz)
        setAttr(sc.svg, "height", sz)
      }
      const cls = classNameRef.current ?? ""
      if ((sc.svg.getAttribute("class") ?? "") !== cls) {
        if (cls) sc.svg.setAttribute("class", cls)
        else sc.svg.removeAttribute("class")
      }

      applyFrame(sc, eng.sample(clockRef.current))
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      engineRef.current = null
      sceneRef.current = null
      host.replaceChildren()
    }
  }, [uid, maskId])

  return (
    <div
      ref={hostRef}
      style={{
        width: size,
        height: size,
        display: "block",
        lineHeight: 0,
        // No CSS filters - keep vector edges razor-sharp
        filter: "none",
      }}
      aria-hidden={false}
    />
  )
}
