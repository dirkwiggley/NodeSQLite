import DBUtils from "./DBUtils.js";
import Express from "express";

import { createError } from "../utils/error.js";
import { UserInterface } from "./types.js";

class DBUsers {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  getUsers = (res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();

      let outArray = [];
      const select = db.prepare("SELECT * FROM users");
      const data: Array<UserInterface> = select.all() as Array<UserInterface>;

      if (data.length == 0) {
        return next(createError(500, "No data in users table"));
      }

      res.send(data);
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  updateUserAPI = (userInfo: UserInterface, res: Express.Response, next: any) => {
    try {
      // New user has no id
      if (userInfo.id === null) {
        let db = this.dbUtils.getDb();
        delete userInfo.id;
        const insert = db.prepare(
          "INSERT INTO users VALUES (@id, @login, @nickname)"
        );

        insert.run({
          id: null,
          login: userInfo.login,
          nickname: userInfo.nickname,
        });
      } else {
        this.updateUser(userInfo);
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.status(204).send();
  };

  updateUser = (userInfo: UserInterface) => {
    let db = this.dbUtils.getDb();

    if (userInfo.id === null) {
      throw new Error("Invalid user");
    } else {
      try {
        const updateStmt = db.prepare(`UPDATE users SET login = ?, nickname = ? WHERE id = ?`);
        updateStmt.run(
          userInfo.login,
          userInfo.nickname,
          userInfo.id,
        );
      } catch(err) {
        console.error(err);
        throw err;
      }
    }
  };

  deleteUser = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const deleteStatement = db.prepare(`DELETE FROM users WHERE id = ${id}`);
      deleteStatement.run();
      res.send("Success");
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  getUserById = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const select = db.prepare("SELECT * FROM users WHERE id = ?");
      const data: UserInterface = select.get(id) as UserInterface;
      if (!data || !data.login || !data.nickname) {
        return next(createError(500, "Invalid user"));
      }
      if (data) {
        res.send(data);
      } else {
        return next(createError(401, "Unauthorized"));
      }
    } catch (err) {
      return next(err);
    }
  };

  init = (res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      try {
        const drop = db.prepare("DROP TABLE IF EXISTS users");
        const changes = drop.run();
        console.log(changes);
      } catch (err) {
        console.error(err);
      }

      const create = db.prepare(
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT, nickname TEXT)"
      );
      create.run();

      const users = [
        {
          login: "admin",
          nickname: "Admin"
        },
        {
          login: "user",
          nickname: "User",
        },
      ];
      const insert = db.prepare(
        "INSERT INTO users (login, nickname) VALUES (?, ?)"
      );
      users.forEach((user) => {
        insert.run(
          user.login,
          user.nickname,
        );
      });

      res.send("Initialized user table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBUsers;
