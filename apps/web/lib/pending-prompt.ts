export const PENDING_PROMPT_KEY = "zuno:pendingPrompt"

export function savePendingPrompt(prompt: string): void {
  sessionStorage.setItem(PENDING_PROMPT_KEY, prompt)
}

export function readPendingPrompt(): string | null {
  return sessionStorage.getItem(PENDING_PROMPT_KEY)
}

export function clearPendingPrompt(): void {
  sessionStorage.removeItem(PENDING_PROMPT_KEY)
}
