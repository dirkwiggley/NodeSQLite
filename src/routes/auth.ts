import express from "express"

import DBAuth from "../db/DBAuth.js"
import { verifyAdmin, verifyToken } from "../middleware/auth.js"

const router = express.Router()
const auth = new DBAuth()

router.put("/", function(req, res, next) {
  auth.login(res, req.body.login, req.body.password, next)
})

router.post("/refresh", (req, res, next) => {
  // take the refresh token from the user
  const refreshToken = req.body.token

  // if everything is ok, create a new access token, refresh token and send to user
  auth.refresh(refreshToken, res, next)
})

router.post("/resetpassword", function(req, res, next) {
  auth.resetPwd(req.body.id, req.body.password, res, next)
})

router.delete("/logout", (req, res, next) => {
  const bearer = req.header("authorization")
  const refreshToken = bearer?.split(" ")[1]

  if (refreshToken) {
    auth.logout(refreshToken, req, res, next)
  }
})

router.post("/initrefreshtokens", verifyAdmin, (req, res, next) => {
  auth.initRefreshTokens(req, res, next)
})

router.get("/emergency/:auth", function(req, res, next) {
  if (req.params.auth === process.env.EMERGENCY_INIT) {
    auth.initRefreshTokens(req, res, next)
  }
})

router.get("/cleanup", function(req, res, next) {
  auth.cleanupRefreshTokens(req, res, next)
})

export default router;
