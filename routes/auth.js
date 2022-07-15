import express from "express"

import DBAuth from "../db/DBAuth.js"
import { verifyUser, verifyToken } from "../middleware/auth.js"

const router = express.Router()
const auth = new DBAuth()

router.put("/", function(req, res, next) {
  auth.login(res, req.body.login, req.body.password, next)
})

router.post("/refresh", (req, res) => {
  // take the refresh token from the user
  const refreshToken = req.body.token

  // if everything is ok, create a new access token, refresh token and send to user
  auth.refresh(refreshToken, res)
})

router.post("/resetpassword", verifyUser, function(req, res, next) {
  auth.resetPwd(req.body.id, req.body.password, res, next)
})

router.post("/logout", verifyToken, (req, res) => {
  const refreshToken = req.body.token
  auth.logout(refreshToken, req, res)
})

router.post("/initrefreshtokens", (req, res) => {
  auth.initRefreshTokens(req, res)
})

export default router;
