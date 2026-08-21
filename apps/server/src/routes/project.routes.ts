import { Router } from "express"
import {
  conversation,
  create,
  getById,
} from "../controllers/project.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
projectRouter.post("/:id/conversation", authMiddleware, conversation)
projectRouter.get("/:id", authMiddleware, getById)
