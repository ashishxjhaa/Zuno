import { Router } from "express"
import { create, getById } from "../controllers/project.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
projectRouter.get("/:id", authMiddleware, getById)
