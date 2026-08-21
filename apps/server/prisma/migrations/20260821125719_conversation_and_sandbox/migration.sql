-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('TOOL_CALL', 'TEXT_MESSAGE');

-- CreateEnum
CREATE TYPE "MessageFrom" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ToolCallKind" AS ENUM ('READ_FILE', 'WRITE_FILE', 'DELETE_FILE', 'UPDATE_FILE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isGenerating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "previewUrl" TEXT,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sandboxId" TEXT;

-- CreateTable
CREATE TABLE "ConversationHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL,
    "from" "MessageFrom" NOT NULL,
    "contents" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "toolCall" "ToolCallKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConversationHistory" ADD CONSTRAINT "ConversationHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
