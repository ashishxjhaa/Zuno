"use client"

import type { PublicUser } from "@workspace/shared"

/** Stub until Phase 3 wires mock auth. */
export function useSession(): {
  user: PublicUser | null
  isLoading: boolean
} {
  return { user: null, isLoading: false }
}
