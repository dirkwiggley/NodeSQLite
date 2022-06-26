import express from "express";

import DBAuth from "../db/DBAuth.js";
import { verifyUser } from "../middleware/auth.js";

const router = express.Router();
const auth = new DBAuth();

router.put('/', function(req, res, next) {
  auth.login(res, req.body.login, req.body.password, next)
});

router.post('/resetpassword', verifyUser, function(req, res, next) {
  auth.resetPwd(req.body.id, req.body.password, res, next);
});

export default router;
