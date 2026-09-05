import { Router } from "express"
import {
  conversation,
  create,
  getById,
  heartbeat,
  publish,
  setStack,
} from "../controllers/project.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
projectRouter.post("/:id/conversation", authMiddleware, conversation)
projectRouter.post("/:id/stack", authMiddleware, setStack)
projectRouter.post("/:id/heartbeat", authMiddleware, heartbeat)
projectRouter.post("/:id/publish", authMiddleware, publish)
projectRouter.get("/:id", authMiddleware, getById)
