import express from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRouter from "./src/routes/auth.routes"

const app = express()

app.use(cors({ origin: process.env.ORIGINS?.split(","), credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get("/", (req, res) => res.send("Server is Live!"))
app.use("/api/auth", authRouter)

app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`)
  res.status(500).json({
    error: err.message,
  })
})

const port = process.env.POST || 3000

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
