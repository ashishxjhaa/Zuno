export type ConversationType = "TOOL_CALL" | "TEXT_MESSAGE"
export type MessageFrom = "USER" | "ASSISTANT"
export type ToolCallKind = "READ_FILE" | "WRITE_FILE" | "DELETE_FILE" | "UPDATE_FILE"

export type PublicUser = {
  id: string
  name: string
  email: string
}

export type ConversationItem = {
  id: string
  type: ConversationType
  from: MessageFrom
  contents: string
  hidden: boolean
  toolCall: ToolCallKind | null
  createdAt: string
}

export type ProjectSummary = {
  id: string
  title: string
  initialPrompt: string
  createdAt: string
  updatedAt: string
}

export type ProjectDetail = ProjectSummary & {
  conversationHistory: ConversationItem[]
  previewUrl: string | null
  isGenerating: boolean
  files: Record<string, string>
}

export type AuthResponse = {
  user: PublicUser
}

export type MeResponse = {
  user: PublicUser | null
}
