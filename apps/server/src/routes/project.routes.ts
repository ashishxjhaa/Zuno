import { Router } from "express"
import { create } from "../controllers/project.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const projectRouter = Router()

projectRouter.post("/", authMiddleware, create)
