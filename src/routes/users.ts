import express from "express";

import DBUsers from "../db/DBUsers.js";
import { verifyAdmin, verifyUser } from "../middleware/auth.js";

const router = express.Router()
const users = new DBUsers()

// router.get('/', verifyUser, function(req, res, next) {
router.get('/', function(req, res, next) {  
  console.log(req.headers)
  users.getUsers(res, next)
});

/* Update/Insert a user */
router.post('/update', verifyAdmin, function(req, res, next) {
  const userInfo = req.body
  users.updateUsers(userInfo, res, next)
});

router.get('/delete/:id', verifyAdmin, function(req, res, next) {
  users.deleteUser(req.params.id, res, next)
});

router.get('/id/:id', verifyUser, function(req, res, next) {
  users.getUserById(req.params.id, res, next)
});

// router.get('/init', function(req, res, next) {  
router.get('/init', verifyAdmin, function(req, res, next) {
  users.init(res, next)
});

router.get("/emergency/:auth", function(req, res) {
  if (req.params.auth === process.env.EMERGENCY_INIT) {
    users.init(req, res)
  }
})

export default router;
