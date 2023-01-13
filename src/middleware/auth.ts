import jwt from "jsonwebtoken"
import { createError } from "../utils/error.js"

const config = process.env

export const verifyToken = (req, res, next) => {
  const bearer = req.header("authorization");
  const token = bearer.split(" ")[1];

  if (!token) {
    return next(createError(403, "A token is required for authentication"))
  }
  try {
    const decoded = jwt.verify(token, config.TOKEN_KEY)
    req.user = decoded
  } catch (err) {
    return next(createError(401, "Invalid token"))
  }
  return next()
};

export const verifyUser = (req, res, next) => {
  const bearer = req.header("authorization");
  const token = bearer.split(" ")[1];

  if (!token) {
    return next(createError(403, "A token is required for authentication"))
  }
  try {
    const decoded = jwt.verify(token, config.TOKEN_KEY)
    req.user = decoded

    if (req.user.user_id === req.params.id || req.user.isAdmin) {
      return next()
    } else {
      return next(createError(403, "Unauthenticated"))
    }
  } catch (err) {
    return next(createError(401, "Invalid token"))
  }
}

export const verifyAdmin = (req, res, next) => {
  const bearer = req.header("authorization");
  const token = bearer?.split(" ")[1];

  if (!token) {
    return next(createError(403, "A token is required for authentication"))
  }
  try {
    const decoded = jwt.verify(token, config.TOKEN_KEY)
    req.user = decoded
    if (req.user.isAdmin) {
      return next()
    } else {
      return next(createError(403, "Unauthenticated"))
    }
  } catch (err) {
    return next(createError(401, "Invalid token"))
  }
}