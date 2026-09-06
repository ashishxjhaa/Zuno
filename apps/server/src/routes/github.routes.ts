import { Router } from "express"
import {
  githubDisconnect,
  githubStatus,
  oauthCallback,
  oauthStart,
} from "../controllers/github.controllers"
import { authMiddleware } from "../middleware/auth.middleware"

export const githubRouter = Router()

githubRouter.get("/oauth/start", authMiddleware, oauthStart)
// Callback: state JWT identifies the user; cookie may be absent on some browsers.
githubRouter.get("/oauth/callback", oauthCallback)
githubRouter.get("/status", authMiddleware, githubStatus)
githubRouter.post("/disconnect", authMiddleware, githubDisconnect)
