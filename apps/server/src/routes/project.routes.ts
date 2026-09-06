import { Router } from "express"
import {
  conversation,
  create,
  downloadProject,
  getById,
  heartbeat,
  list,
  publish,
  restore,
  setStack,
} from "../controllers/project.controllers"
import { pushProjectToGithub } from "../controllers/github.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
projectRouter.get("/", authMiddleware, list)
projectRouter.post("/:id/conversation", authMiddleware, conversation)
projectRouter.post("/:id/stack", authMiddleware, setStack)
projectRouter.post("/:id/heartbeat", authMiddleware, heartbeat)
projectRouter.post("/:id/publish", authMiddleware, publish)
projectRouter.post("/:id/github/push", authMiddleware, pushProjectToGithub)
projectRouter.post("/:id/restore", authMiddleware, restore)
projectRouter.get("/:id/download", authMiddleware, downloadProject)
projectRouter.get("/:id", authMiddleware, getById)
