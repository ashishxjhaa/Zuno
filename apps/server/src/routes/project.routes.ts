import { Router } from "express"
import {
  conversation,
  create,
  getById,
  heartbeat,
  list,
  publish,
  restore,
  setStack,
} from "../controllers/project.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
projectRouter.get("/", authMiddleware, list)
projectRouter.post("/:id/conversation", authMiddleware, conversation)
projectRouter.post("/:id/stack", authMiddleware, setStack)
projectRouter.post("/:id/heartbeat", authMiddleware, heartbeat)
projectRouter.post("/:id/publish", authMiddleware, publish)
projectRouter.post("/:id/restore", authMiddleware, restore)
projectRouter.get("/:id", authMiddleware, getById)
