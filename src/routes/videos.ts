import express from "express"
import DBVideos from "../db/DBVideos.js"

const router = express.Router()

router.get('/', function (req, res, next) {
  const dbVideos = new DBVideos()
  dbVideos.getVideos(res, next)
})

router.get('/id/:id', function(req, res, next) {
  const dbVideos = new DBVideos()
  dbVideos.getVideoById(Number(req.params.id), res, next);
});
  
router.get('/init', function (req, res, next) {
  const dbVideos = new DBVideos()
  dbVideos.init(res, next)
})

export default router
