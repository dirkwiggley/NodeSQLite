import Database from "better-sqlite3";

class DBUtils {
  constructor() {
    if (DBUtils._instance) {
      return DBUtils._instance;
    }
    DBUtils._instance = this;
    
    this.db = null;

    this.getDb = () => {
      if (!this.db) {
        this.db = new Database('./database.db', { verbose: console.log });
        console.log("database initialized");
      }
      if (this.db === null) {
        throw new Error("Could not open database");
      }
      return this.db;
    }
    
    this.getTables = (res) => {
      const result = [];
      try {
        let db = this.getDb();
        const select = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
        const data = select.all();
        data.forEach(element => {
          if (element.name !== "sqlite_sequence") {
            result.push(element.name);
          }
        });
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result);
    }

    this.getCols = (table_name) => {
      let result = null;
      try {
        let db = this.getDb();
        const tableName = table_name.toLowerCase();
        const select = db.prepare("SELECT sql from sqlite_schema WHERE tbl_name = '" + tableName + "'");
        const data = select.all();
        if (data) {
          let a = data[0].sql;
          let b = a.substring(a.indexOf('(') + 1, a.length - 1);
          let c = b.split(",");
          let d = [];
          c.forEach(item => {
            let val = item = item.replace(/^\s+/g, '');
            let newVal = "";
            if (!val.includes("UNIQUE")) {
              let x = val.indexOf(" ");
              if (x > 0) {
                newVal = val.substring(0, x);
                d.push(newVal);
              }
            }
          });
          result = d;
        }
      } catch (err) {
        console.error(err);
        result = err;
      }

      return result;
    }

    this.getColumns = (res, table_name) => {
      const columns = this.getCols(table_name);
      res.send(columns);
    }

    // Reusable method
    this.getTableData = (table_name) => {
      let result = null;
      try {
        let db = this.getDb();
        const tableName = (table_name + "").toLowerCase();
        const dataString = "SELECT * FROM " + tableName;
        const colNames = this.getCols(tableName);
        const dataQuery = db.prepare(dataString);
        const dataResult = dataQuery.all();
        result = { table: table_name, columnNames: colNames, data: dataResult };
      } catch (err) {
        console.error(err);
        result = err;
      }
      return result;
    }

    this.getTable = (res, table_name) => {
      const result = this.getTableData(table_name);

      res.send(result);
    }

    this.getTableRows = (res, table_name) => {
      let result = null;
      try {
        let db = this.getDb();
        const tableName = (table_name + "").toLowerCase();
        const dataString = "SELECT * FROM " + tableName;
        const dataQuery = db.prepare(dataString);
        result = dataQuery.all();
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result );
    }

    // Reusable method
    this.insRow = (table_name, colData) => {
      let result = null;
      try {
        const tableName = table_name.toLowerCase();
        const colArray = this.getCols(tableName);
        let insertString = "INSERT INTO " + tableName + " (";
        for (let i = 1; i < colArray.length; i++) {
          if (i > 1) {
            insertString += ", ";
          }
          if (colArray[i]) {
            insertString += colArray[i];
          }
        }
        insertString += ") VALUES (";
        for (let i = 0; i < colData.length; i++) {
          if (i > 0) {
            insertString += ", ";
          }
          insertString += "?";
        }
        insertString += ")";

        let db = this.getDb();
        const insertQuery = db.prepare(insertString);
        insertQuery.run(colData);

        // Return the table data
        result = this.getTableData(tableName);
      } catch (err) {
        result = err;
        console.log(err);
      }

      return result;
    }

    this.insertRow = (res, table_name) => { 
      let result = null;
      const rowArray = [];
      try {
        const columns = this.getCols(table_name);
        const columnCount = columns.length;
        // Remove id since it's autoincrement
        for (let x = 0; x < columnCount - 1; x++) {
          rowArray.push("");
        }
        result = this.insRow(table_name, rowArray);
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result);
    }

    this.deleteRow = (res, table_name, id) => {
      let result = null;
      try {
        const tableName = table_name.toLowerCase();
        const deleteString = "DELETE FROM " + tableName + " WHERE id = ?";
        let db = this.getDb();
        const deleteQuery = db.prepare(deleteString);
        deleteQuery.run(id);

        // Return the table data
        result = this.getTableData(tableName);
      } catch (err) {
        result = err;
        console.log(err);
      }
      res.send(result);
    }

    this.updateElement = (res, table_name, idVal, column_name, data) => {
      let result = null;
      const columnName = column_name.toLowerCase();
      if (columnName === "id") {
        const errMsg = "Error: can not update id";
        console.error(errMsg);
        res.send(errMsg);
        return;
      }
      try {
        const tableName = table_name.toLowerCase();
        let id = null;
        // In case it isn't a string
        try {
          id = parseInt(idVal);
        } catch (parseErr) {
          id = idVal;
        }
        const updateString = "UPDATE " + tableName + " SET " + columnName + "=? WHERE id=?";
        let db = this.getDb();
        const updateQuery = db.prepare(updateString);
        updateQuery.run([data, id]);

        // Return the table data
        result = this.getTableData(tableName);
      } catch (err) {
        console.log(err);
        result = err;
      }
      res.send(result);
    }

    this.createTable = (res, tablename, columnname) => {
      let result = null;

      try {
        let db = this.getDb();
        const tableName = tablename.toLowerCase();
        const columnName = columnname.toLowerCase();
        const data = [tableName];
        const columnString = "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name = ?";
        const columnQuery = db.prepare(columnString);
        const count = columnQuery.get(data).total;

        // Create a table with just one column
        if (count === 0) {
          const createString = "CREATE TABLE " + tableName + ` (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnName} text)`;
          const createQuery = db.prepare(createString);
          createQuery.run();
        }

        // Get the list of all table names
        const selectQuery = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
        result = selectQuery.all();
      } catch (err) {
        console.error(err);
        result = err;
      }

      res.send(result);
    }

    this.dropTable = (res, table_name) => {
      let result = null;

      try {
        let db = this.getDb();
        const tableName = table_name.toLowerCase();
        const dropString = "DROP TABLE " + tableName;
        const dropQuery = db.prepare(dropString);
        dropQuery.run();

        result = "Table successfully dropped";
      } catch (err) {
        console.error(err);
        result = err;
      }

      res.send(result);
    }

    this.createColumn = (res, table_name, colName) => {
      let result = null;

      try {
        let db = this.getDb();
        const tableName = (table_name + "").toLowerCase();
        const columnName = (colName + "").toLowerCase();
        const columnString = "ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " TEXT";
        const columnQuery = db.prepare(columnString);
        columnQuery.run();

        // Return the table data
        result = this.getTableData(tableName);
      } catch (err) {
        console.error(err);
        result = err;
      }

      res.send(result);
    }

    this.dropColumn = (res, table_name, column_name) => {
      let result = null;
      try {
        const tableName = table_name.toLowerCase();
        const columnName = column_name.toLowerCase();
        let db = this.getDb();
        const dropString = "ALTER TABLE " + table_name + " DROP COLUMN " + columnName;
        const dropQuery = db.prepare(dropString);
        dropQuery.run();

        // Return the table data
        result = this.getTableData(tableName);
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result);
    }

    // Reusable method
    this.renTable = (old_table_name, new_table_name) => {
      let result = null;
      try {
        const oldTableName = old_table_name.toLowerCase();
        const newTableName = new_table_name.toLowerCase();
        let db = this.getDb();
        const renameString = "ALTER TABLE " + oldTableName + " RENAME TO " + newTableName;
        const renameQuery = db.prepare(renameString);
        renameQuery.run();

        // Return the table data
        result = this.getTableData(newTableName);
      } catch (err) {
        console.error(err);
        result = err;
      }
      return result;
    }

    this.renameTable = (res, old_table_name, new_table_name) => {
      const result = this.renTable(old_table_name, new_table_name);
      res.send(result);
    }

    /**
     * The version of SQLite3 I'm using doesn't do rename column
     * so we have to do it this way
     * @param {*} res 
     * @param {*} table_name 
     * @param {*} old_column_name 
     * @param {*} new_column_name 
     */
    this.renameColumn = (res, table_name, old_column_name, new_column_name) => {
      let result = null;
      try {
        const tableName = table_name.toLowerCase();
        const tempTableName = "tmp_"+tableName;
        const oldColumnName = old_column_name.toLowerCase();
        const newColumnName = new_column_name.toLowerCase();
        let db = this.getDb();

        // Can't change id
        if (oldColumnName === "id") {
          throw new Error("Can't rename id column");
        }

        // Rename the original table to tmp+<orignal table name>
        const renameString = "ALTER TABLE " + tableName + " RENAME TO " + tempTableName;
        const renameQuery = db.prepare(renameString);
        renameQuery.run();

        // Create a new table with correctly named columns
        const columnArray = this.getCols(tempTableName);
        let tableString =  "CREATE TABLE " + tableName + " (id INTEGER PRIMARY KEY AUTOINCREMENT";
        for (let i = 0; i < columnArray.length; i++) {
          let colName = columnArray[i];
          if (colName === oldColumnName) {
            // Go here to change the column name
            tableString += ", " + newColumnName + " TEXT";
          } else if (colName !== "id") {
            // Go here for all other columns except changed or id (id done above)
            tableString += ", " + colName + " TEXT";
          }
        }
        tableString += ")";
        const tableQuery = db.prepare(tableString);
        tableQuery.run();

        // Copy the data from the tmp table into the new table
        const tmpString = "SELECT * FROM " + tempTableName;
        const tmpQuery = db.prepare(tmpString);
        const tmpResult = tmpQuery.all();
        tmpResult.forEach((result) => {
          const values = Object.values(result);
          values.shift();
          this.insRow(tableName, values);
        });

        // Drop the old table
        const dropString = "DROP TABLE " + tempTableName;
        const dropQuery = db.prepare(dropString);
        dropQuery.run();

        // Return data for the new table
        result = this.getTableData(tableName);
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result);
    }

    this.getBy = (res, table_name, column_name, val) => {
      let result = null;
      try {
        const db = this.getDb();
        const tableName = table_name.toLowerCase();
        const columnName = column_name.toLowerCase();
        const value = val.toLowerCase();
        const select = "SELECT * FROM " + tableName + " WHERE " + columnName + " =?";
        const selectQuery = db.prepare(select);
        result = selectQuery.get(value);
      } catch (err) {
        console.error(err);
        result = err;
      }
      res.send(result);
    }

  }
}

export default DBUtils;
