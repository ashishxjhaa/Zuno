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
const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "")

// Railway / reverse proxies terminate TLS in front of the container.
app.set("trust proxy", 1)

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
)
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

app.listen(port, "0.0.0.0", () => {
  startIdleReaper()
  console.log(`Server is running on port ${port}`)
})
