import express from "express"
import DBUtils from "../db/DBUtils.js"
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router()
const dbUtils = new DBUtils()

/* GET methods listing. */
router.get('/', verifyAdmin, function(req, res, next) {
  const availableMethods = { "availableMethods": ["tables", "createtable", "droptable", "createcolumn", "dropcolumn", "insertrow", "deleterow", "updateelement"] }
  res.send(availableMethods)
});

router.get('/tables', verifyAdmin, function(req, res, next) {
  dbUtils.getTables(res);
});

router.get('/createtable/:tablename/:columnname', verifyAdmin, function (req, res, next) {
  dbUtils.createTable(res, req.params.tablename, req.params.columnname);
});

router.get('/droptable/:tablename', verifyAdmin, function (req, res, next) {
  dbUtils.dropTable(res, req.params.tablename);
});

router.get('/createcolumn/:tablename/:columnname', verifyAdmin, function(req, res, next) {
  dbUtils.createColumn(res, req.params.tablename, req.params.columnname);
});

router.get('/dropcolumn/:tablename/:columnmane', verifyAdmin, function(req, res, next) {
  dbUtils.dropColumn(res, req.params.tablename, req.params.columnmane);
});

router.get('/insertrow/:table/', verifyAdmin, function(req, res, next) {
  dbUtils.insertRow(res, req.params.table)
});

router.get('/deleterow/:table/:id', verifyAdmin, function(req, res, next) {
  dbUtils.deleteRow(res, req.params.table, req.params.id);
});

router.get('/updateelement/:table/:id/:column/:data', verifyAdmin, function(req, res, next) {
  dbUtils.updateElement(res, req.params.table, req.params.id, req.params.column, req.params.data)
});

router.get('/:table/columns', verifyAdmin, function(req, res, next) {
  dbUtils.getColumns(res, req.params.table);
});

router.get('/tabledata/:table', verifyAdmin, function(req, res, next) {
  dbUtils.getTable(res, req.params.table);
});

router.get('/tablerows/:table', verifyAdmin, function(req, res, next) {
  dbUtils.getTableRows(res, req.params.table);
});

router.get('/rename/table/:old_table/:new_table', verifyAdmin, function(req, res, next) {
  dbUtils.renameTable(res, req.params.old_table, req.params.new_table);
});

router.get('/rename/:table/column/:old_column/:new_column', verifyAdmin, function(req, res, next) {
  dbUtils.renameColumn(res, req.params.table, req.params.old_column, req.params.new_column);
});

router.get('/by/:tablename/:columnname/:value', verifyAdmin, function(req, res, next) {
  dbUtils.getBy(res, req.params.tablename, req.params.columnname, req.params.value);
});

export default router;
