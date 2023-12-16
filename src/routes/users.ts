import express from "express";

import DBUsers from "../db/DBUsers.js";

const router = express.Router();
const users = new DBUsers();

router.get('/', function(req, res, next) {  
// router.get('/', verifyUser, function(req, res, next) {
  console.log(req.headers);
  users.getUsers(res, next);
});

/* Update/Insert a user */
router.post('/update', function(req, res, next) {
// router.post('/update', verifyAdmin, function(req, res, next) {
  const userInfo = req.body.userInfo;
  users.updateUserAPI(userInfo, res, next);
});

router.get('/delete/:id', function(req, res, next) {
// router.get('/delete/:id', verifyAdmin, function(req, res, next) {
  users.deleteUser(Number(req.params.id), res, next);
});

router.get('/id/:id', function(req, res, next) {
// router.get('/id/:id', verifyUser, function(req, res, next) {
  users.getUserById(Number(req.params.id), res, next);
});

router.get('/init', function(req, res, next) {  
// router.get('/init', verifyAdmin, function(req, res, next) {
  users.init(res, next);
});

export default router;
