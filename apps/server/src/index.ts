import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
const port = Number(process.env.PORT) || 4000
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000"

app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[Error] ${err.message}`)
  res.status(500).json({ error: err.message })
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
