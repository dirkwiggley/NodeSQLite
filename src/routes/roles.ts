import express from "express"

import DBAuth from "../db/DBAuth.js"

const router = express.Router()
const auth = new DBAuth()

router.post("/", function(req, res, next) {
  auth.login(res, req.body.login, req.body.password, next)
})

// Use the refresh token to create a new auth token
router.post("/refresh", (req, res, next) => {
  const accessToken = req.body.accessToken

  // if everything is ok, create a new refresh token and make it a cookie
  auth.refresh(accessToken, res, next)
})

router.post("/resetpassword", function(req, res, next) {
  auth.resetPwd(req.body.id, req.body.password, res, next)
})

router.delete("/logout/:userId", (req, res, next) => {
  const userId = req.params.userId;
  auth.logout(Number(userId), req, res, next)
})

export default router;