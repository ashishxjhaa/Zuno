import { Router } from "express"
import { randomIdea } from "../controllers/idea.controllers"

export const ideaRouter = Router()

ideaRouter.post("/random", randomIdea)
