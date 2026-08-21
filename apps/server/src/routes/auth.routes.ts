import { Router } from "express"
import { me, signin, signout, signup } from "../controllers/auth.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const authRouter = Router()

authRouter.post("/signup", signup)
authRouter.post("/signin", signin)
authRouter.post("/signout", signout)
authRouter.get("/me", authMiddleware, me)
