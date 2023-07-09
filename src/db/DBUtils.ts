import DatabaseConstructor, { Database } from "better-sqlite3";
import Express from "express";

class DBUtils {
  private static _instance: DBUtils;
  public db: Database | null = null;

  constructor() {
    if (DBUtils._instance) {
      return DBUtils._instance;
    }
  }

  getDb = () => {
    if (!this.db) {
      this.db = new DatabaseConstructor("./database.db", {
        verbose: console.log,
      });
      console.log("database initialized");
    }
    if (this.db === null) {
      throw new Error("Could not open database");
    }
    return this.db;
  };

  getTablesReusable = () => {
    var result: string[] = [];
    try {
      let db = this.getDb();
      const select = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const data = select.all();
      data.forEach((element) => {
        if (element.name !== "sqlite_sequence") {
          result.push(element.name);
        }
      });
    } catch (err) {
      result = []; // Don't blow up, just log
      console.error(err);
    }
    return result;
  }

  getTables = (res: Express.Response) => {
    var result = this.getTablesReusable();
    res.send(result);
  };

  getCols = (table_name: string): string[] | Error => {
    let result: string[] = [];
    try {
      let db = this.getDb();
      const tableName = table_name.toLowerCase();
      const select = db.prepare(
        "SELECT sql from sqlite_schema WHERE tbl_name = '" + tableName + "'"
      );
      const data = select.all();
      if (data) {
        let a = data[0].sql;
        let b = a.substring(a.indexOf("(") + 1, a.length - 1);
        let c = b.split(",");
        let d: string[] = [];
        c.forEach(function (item: string) {
          let val = (item = item.replace(/^\s+/g, ""));
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
      result = []; // Don't blow up, just log
    }

    return result;
  };

  getColumns = (res: Express.Response, table_name: string) => {
    const columns = this.getCols(table_name);
    res.send(columns);
  };

  // Reusable method
  getTableData = (table_name: string) => {
    let result = null;
    try {
      let db = this.getDb();
      const tableName = (table_name + "").toLowerCase();
      // Let's prevent SQL injection
      const tables = this.getTablesReusable();
      if (!tables.includes(tableName)) {
        throw new Error("Table does not exist");
      }
      const dataString = "SELECT * FROM " + tableName;
      const colNames = this.getCols(tableName);
      const dataQuery = db.prepare(dataString);
      const dataResult = dataQuery.all();
      const schema = db.pragma(`table_info = ${table_name}`);
      result = {
        table: table_name,
        columnNames: colNames,
        data: dataResult,
        schema: schema,
      };
    } catch (err) {
      console.error(err);
      result = err;
    }
    return result;
  };

  getTable = (res: Express.Response, table_name: string) => {
    const result = this.getTableData(table_name);

    res.send(result);
  };

  getTableRows = (res: Express.Response, table_name: string) => {
    let result = null;
    try {
      let db = this.getDb();
      const tableName = (table_name + "").toLowerCase();
      // Let's prevent SQL injection
      const tables = this.getTablesReusable();
      if (!tables.includes(tableName)) {
        throw new Error("Table does not exist");
      }
      
      const dataString = "SELECT * FROM " + tableName;
      const dataQuery = db.prepare(dataString);
      result = dataQuery.all();
    } catch (err) {
      console.error(err);
      result = err;
    }
    res.send(result);
  };

  // Reusable method
  insRow = (table_name: string, colData: any) => {
    let result = null;
    try {
      const tableName = table_name.toLowerCase();
      const colArray: string[] | Error = this.getCols(tableName);
      if (colArray instanceof Error) {
        return;
      } // Don't blow up. Error was logged above
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
  };

  insertRow = (res: Express.Response, table_name: string) => {
    let result = null;
    const rowArray = [];
    try {
      const columns: string[] | Error = this.getCols(table_name);
      if (columns instanceof Error) {
        return;
      } // Don't blow up, error was logged above
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
  };

  deleteRow = (res: Express.Response, table_name: string, id: number) => {
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
      console.log(err);
      throw err;
    }
    res.send(result);
  };

  updateElement = (
    res: Express.Response,
    table_name: string,
    idVal: string,
    column_name: string,
    data: any
  ) => {
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
      const updateString =
        "UPDATE " + tableName + " SET " + columnName + "=? WHERE id=?";
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
  };

  createTable = (
    res: Express.Response,
    table_name: string,
    column_name: string
  ) => {
    let result = null;

    try {
      let db = this.getDb();
      const tableName = table_name.toLowerCase();
      const columnName = column_name.toLowerCase();
      const data = [tableName];
      const columnString =
        "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name = ?";
      const columnQuery = db.prepare(columnString);
      const count = columnQuery.get(data).total;

      // Create a table with just one column
      if (count === 0) {
        const createString =
          "CREATE TABLE " +
          tableName +
          ` (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columnName} text)`;
        const createQuery = db.prepare(createString);
        createQuery.run();
      }

      // Get the list of all table names
      const selectQuery = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      result = selectQuery.all();
    } catch (err) {
      console.error(err);
      result = err;
    }

    res.send(result);
  };

  dropTable = (
    res: Express.Response,
    table_name: string,
  ) => {
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
  };

  createColumn = (
    res: Express.Response,
    table_name: string,
    colName: string,
    colDataType: string
  ) => {
    let result = null;

    try {
      let db = this.getDb();
      const tableName = table_name.toLowerCase();
      const columnName = colName.toLowerCase();
      const dataType = colDataType.toUpperCase();
      const dataTypes = ["TEXT", "INTEGER", "REAL", "NUMERIC", "BLOB"];
      if (!dataTypes.includes(dataType)) {
        throw new Error("Bad data type selected");
      }
      const columnString =
        "ALTER TABLE " +
        tableName +
        " ADD COLUMN " +
        columnName +
        ` ${dataType}`;
      const columnQuery = db.prepare(columnString);
      columnQuery.run();

      // Return the table data
      result = this.getTableData(tableName);
    } catch (err) {
      console.error(err);
      result = err;
    }

    res.send(result);
  };

  dropColumn = (
    res: Express.Response,
    table_name: string,
    column_name: string
  ) => {
    let result = null;
    try {
      const tableName = table_name.toLowerCase();
      const columnName = column_name.toLowerCase();
      let db = this.getDb();
      const dropString =
        "ALTER TABLE " + table_name + " DROP COLUMN " + columnName;
      const dropQuery = db.prepare(dropString);
      dropQuery.run();

      // Return the table data
      result = this.getTableData(tableName);
    } catch (err) {
      console.error(err);
      result = err;
    }
    res.send(result);
  };

  // Reusable method
  renTable = (old_table_name: string, new_table_name: string) => {
    let result = null;
    try {
      const oldTableName = old_table_name.toLowerCase();
      const newTableName = new_table_name.toLowerCase();
      let db = this.getDb();
      const renameString =
        "ALTER TABLE " + oldTableName + " RENAME TO " + newTableName;
      const renameQuery = db.prepare(renameString);
      renameQuery.run();

      // Return the table data
      result = this.getTableData(newTableName);
    } catch (err) {
      console.error(err);
      result = err;
    }
    return result;
  };

  renameTable = (
    res: Express.Response,
    old_table_name: string,
    new_table_name: string
  ) => {
    const result = this.renTable(old_table_name, new_table_name);
    res.send(result);
  };

  /**
   * The version of SQLite3 I'm using doesn't do rename column
   * so we have to do it this way
   * @param {*} res
   * @param {*} table_name
   * @param {*} old_column_name
   * @param {*} new_column_name
   */
  renameColumn = (
    res: Express.Response,
    table_name: string,
    old_column_name: string,
    new_column_name: string
  ) => {
    let result = null;
    try {
      const tableName = table_name.toLowerCase();
      const tempTableName = "tmp_" + tableName;
      const oldColumnName = old_column_name.toLowerCase();
      const newColumnName = new_column_name.toLowerCase();
      let db = this.getDb();

      // Let's prevent SQL injection
      const tables = this.getTablesReusable();
      if (!tables.includes(tableName)) {
        throw new Error("Table does not exist");
      }

      // Can't change id
      if (oldColumnName === "id") {
        throw new Error("Can't rename id column");
      }

      // Rename the original table to tmp+<orignal table name>
      const renameString =
        "ALTER TABLE " + tableName + " RENAME TO " + tempTableName;
      const renameQuery = db.prepare(renameString);
      renameQuery.run();

      // Create a new table with correctly named columns
      const columnArray = this.getCols(tempTableName);
      if (columnArray instanceof Error) {
        return;
      } // Don't blow up, error is logged above
      let tableString =
        "CREATE TABLE " + tableName + " (id INTEGER PRIMARY KEY AUTOINCREMENT";
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
  };

  getBy = (
    res: Express.Response,
    table_name: string,
    column_name: string,
    val: string
  ) => {
    let result = null
    try {
      const db = this.getDb()
      const tableName = table_name.toLowerCase()
      const columnName = column_name.toLowerCase()
      const value = val.toLowerCase()
      // Let's prevent SQL injection
      const tables = this.getTablesReusable()
      if (!tables.includes(tableName)) {
        throw new Error("Table does not exist")
      }
      const columns = this.getCols(tableName)
      if (columns instanceof Error || !columns.includes(columnName)) {
        throw new Error("Column does not exist")
      }
      const select =
        "SELECT * FROM " + tableName + " WHERE " + columnName + " = ?";
      const selectQuery = db.prepare(select);
      result = selectQuery.get(value);
    } catch (err) {
      console.error(err);
      result = err;
    }
    res.send(result);
  };

  backupDB = (res: Express.Response) => {
    let db = this.getDb();

    db.backup(`backup-${Date.now()}.db`)
      .then(() => {
        console.log("backup complete!");
      })
      .catch((err) => {
        console.log("backup failed:", err);
      });
  };

  exportDB = (res: Express.Response) => {
    this.backupDB(res);

    res.send("Success");
  };
}

export default DBUtils;
