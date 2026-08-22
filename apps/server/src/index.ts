import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"
import { authRouter } from "./routes/auth.routes"
import { projectRouter } from "./routes/project.routes"
import { startIdleReaper } from "./lib/idle"

const app = express()
const port = Number(process.env.PORT) || 4000

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "zuno-server" })
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/project", projectRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${err.message}`)
  res.status(500).json({ error: err.message })
})

app.listen(port, () => {
  startIdleReaper()
  console.log(`Server is running at http://localhost:${port}`)
})
