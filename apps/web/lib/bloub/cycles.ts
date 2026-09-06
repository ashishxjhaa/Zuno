import { SEQUENCE, STATES, STATE_BY_ID, type StateId } from './states'

// A cycle is an ordered list of timed animation blocks (pure data, no clock)
export interface Block {
  state: StateId
  duration: number
}

export interface Cycle {
  id: string
  name: string
  blocks: Block[]
}

// Shared minimum block length so morphs do not skip
export const MIN_BLOCK = Math.max(...STATES.map((s) => s.morph))

// Editor cap so block timelines stay readable
export const MAX_BLOCK = 10

// Hard caps on blocks and montages to protect storage and UI
export const MAX_BLOCS = 200
export const MAX_CYCLES = 50

// Step size for scroll and resize, in seconds
export const STEP = 0.1

const DEFAULT_CYCLE_ID = 'defaut'

// Minimum block length: engine floor or the state measure
export function minDurationOf(state: StateId): number {
  return Math.max(MIN_BLOCK, STATE_BY_ID.get(state)?.minDuration ?? MIN_BLOCK)
}

// Clamp a duration to bounds and step without float leftovers
export function clampDuration(state: StateId, seconds: number): number {
  const snapped = Math.round(seconds / STEP) * STEP
  const bounded = Math.min(MAX_BLOCK, Math.max(minDurationOf(state), snapped))
  return Math.round(bounded * 100) / 100
}

export function makeBlock(state: StateId): Block {
  // Reference duration is the measured video length for this state
  return { state, duration: clampDuration(state, STATE_BY_ID.get(state)?.duration ?? 2) }
}

// Default montage taken from the reference video
export function defaultCycle(): Cycle {
  return {
    // Empty name means show the localized default label
    name: '',
    id: DEFAULT_CYCLE_ID,
    blocks: SEQUENCE.map(makeBlock)
  }
}

export function totalDuration(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.duration, 0)
}

// Start time of a block in the montage
export function offsetOf(blocks: Block[], index: number): number {
  let acc = 0
  for (let i = 0; i < index && i < blocks.length; i++) acc += blocks[i]!.duration
  return acc
}

// Find the block playing at time t (playback loops)
export function blockAt(blocks: Block[], t: number): { index: number; elapsed: number } {
  const total = totalDuration(blocks)
  if (!blocks.length || total <= 0) return { index: 0, elapsed: 0 }
  // Wrap time only when needed so in-range times keep clean floats
  const wrapped = t >= 0 && t < total ? t : ((t % total) + total) % total
  let acc = 0
  for (let i = 0; i < blocks.length; i++) {
    const end = acc + blocks[i]!.duration
    if (wrapped < end) return { index: i, elapsed: wrapped - acc }
    acc = end
  }
  return { index: blocks.length - 1, elapsed: 0 }
}

// Append an animation block, capped at MAX_BLOCS
export function blocksWith(blocks: Block[], state: StateId): Block[] {
  if (blocks.length >= MAX_BLOCS) return blocks
  return [...blocks, makeBlock(state)]
}

// Move a block and return a new list
export function moveBlock(blocks: Block[], from: number, to: number): Block[] {
  const next = blocks.slice()
  const [moved] = next.splice(from, 1)
  if (!moved) return blocks
  next.splice(Math.min(Math.max(to, 0), next.length), 0, moved)
  return next
}

// Build unique cycle names like My cycle, My cycle 2, ...
export function uniqueName(base: string, cycles: Cycle[]): string {
  const taken = new Set(cycles.map((c) => c.name))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

// Make an id that will not collide, even with hand-edited localStorage
export function nextCycleId(cycles: Cycle[]): string {
  const taken = new Set(cycles.map((c) => c.id))
  let n = 1
  while (taken.has(`c${n}`)) n++
  return `c${n}`
}

// Read cycles from storage

function parseBlock(raw: unknown): Block | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { state, duration } = raw as { state?: unknown; duration?: unknown }
  // Validate against SEQUENCE only (swirl is settings UI, not a catalog animation)
  if (typeof state !== 'string' || !SEQUENCE.includes(state as StateId)) return null
  if (typeof duration !== 'number' || !Number.isFinite(duration)) return null
  return { state: state as StateId, duration: clampDuration(state as StateId, duration) }
}

function parseCycle(raw: unknown, seen: Cycle[]): Cycle | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { id, name, blocks } = raw as { id?: unknown; name?: unknown; blocks?: unknown }
  if (typeof id !== 'string' || !id) return null
  // Empty name means the starter montage; label follows the UI language
  if (typeof name !== 'string') return null
  if (!Array.isArray(blocks)) return null
  // on tronque AVANT de relire : valider 150 000 blocs pour n'en garder que 200 serait
  // faire le travail qu'on cherche justement a eviter
  const kept = blocks
    .slice(0, MAX_BLOCS)
    .map(parseBlock)
    .filter((b): b is Block => b !== null)
  if (!kept.length) return null
  if (seen.some((c) => c.id === id)) return null
  return { id, name, blocks: kept }
}

// Validate localStorage data; drop anything that does not parse
export function parseCycles(raw: string | null): Cycle[] {
  if (!raw) return []
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const out: Cycle[] = []
  for (const item of data.slice(0, MAX_CYCLES)) {
    const cycle = parseCycle(item, out)
    if (cycle) out.push(cycle)
  }
  return out
}
