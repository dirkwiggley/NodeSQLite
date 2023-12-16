import express from "express"
import DBVideoList from "../db/DBVideoList.js"

const router = express.Router()

router.get('/', function (req, res, next) {
  const dbVideoList = new DBVideoList();
  dbVideoList.getVideoLists(res, next)
})

router.get('/id/:id', function(req, res, next) {
  const dbVideoList = new DBVideoList();
  dbVideoList.getVideoListById(Number(req.params.id), res, next);
});
  
router.get('/init', function (req, res, next) {
  const dbVideoList = new DBVideoList();
  dbVideoList.init(res, next)
})

export default router
