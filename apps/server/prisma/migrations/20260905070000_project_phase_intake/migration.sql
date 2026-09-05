-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('PLANNING', 'BUILDING', 'READY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "phase" "ProjectPhase" NOT NULL DEFAULT 'PLANNING',
ADD COLUMN     "framework" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "brief" TEXT;
