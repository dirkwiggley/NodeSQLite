import express from "express"
import DBVideoInList from "../db/DBVideoInList.js"

const router = express.Router()

router.get('/', function (req, res, next) {
  const dbVideoInList = new DBVideoInList();
  dbVideoInList.getVideosInList(res, next);
})

router.get('/id/:id', function(req, res, next) {
  const dbVideoInList = new DBVideoInList();
  dbVideoInList.getVideoInListById(Number(req.params.id), res, next);
});
  
router.get('/init', function (req, res, next) {
  const dbVideoInList = new DBVideoInList();
  dbVideoInList.init(res, next);
})

export default router
