import type { Request, Response } from "express"
import { generateRandomIdea } from "../lib/idea"

export async function randomIdea(_req: Request, res: Response) {
  const idea = await generateRandomIdea()
  res.json({ idea })
}
