import { Router } from "express"
import { login, logout, me, register } from "../controllers/auth.controllers"
import authMiddleware from "../middleware/auth-middleware"

const authRouter = Router()

authRouter.post("/register", register)
authRouter.post("/login", login)
authRouter.post("/logout", logout)
authRouter.get("/me", authMiddleware, me)

export default authRouter
