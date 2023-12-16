import express from "express"
import DBUtils from "../db/DBUtils.js"

const router = express.Router()
const dbUtils = new DBUtils()

/* GET methods listing. */
router.get('/', function(req, res, next) {
  const availableMethods = { "availableMethods": ["tables"] }
  res.send(availableMethods)
});

router.get('/tables', function(req, res, next) {
  dbUtils.getTables(res);
});


export default router;
