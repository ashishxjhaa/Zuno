import type { Response } from "express"

export function initSse(res: Response) {
  res.status(200)
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  const flushable = res as Response & { flushHeaders?: () => void }
  flushable.flushHeaders?.()
}

export function sendSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export function keepAliveSse(res: Response, ms = 15_000) {
  return setInterval(() => {
    try {
      res.write(":ka\n\n")
    } catch {
      // connection closed
    }
  }, ms)
}
