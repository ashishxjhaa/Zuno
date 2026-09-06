-- AlterTable
ALTER TABLE "User" ADD COLUMN "githubUsername" TEXT,
ADD COLUMN "githubAccessToken" TEXT,
ADD COLUMN "githubConnectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "githubRepoUrl" TEXT,
ADD COLUMN "githubRepoName" TEXT,
ADD COLUMN "githubRepoFullName" TEXT;
