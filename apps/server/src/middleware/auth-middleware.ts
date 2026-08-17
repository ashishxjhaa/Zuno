import jwt from "jsonwebtoken"

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({
      error: "Access denied. No session token provided.",
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({
      error: "Session expired or invalid. Please sign in again.",
    })
  }
}

export default authMiddleware
