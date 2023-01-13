import DBUtils from "./DBUtils.js";
import bcrypt from "bcryptjs";

import { createError } from "../utils/error.js";

class DBUsers {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  hash = (value) => {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(value, salt);
  };

  compareHash = (value, hash) => {
    return bcrypt.compareSync(value, hash);
  };

  getUsers = (res, next) => {
    try {
      let db = this.dbUtils.getDb();

      let outArray = [];
      const select = db.prepare("SELECT * FROM users");
      const data = select.all();
      data.forEach((element) => {
        delete element.password;
        outArray.push(element);
      });

      if (outArray.length == 0) {
        return next(createError(500, "No data in users table"));
      }

      const users = { users: outArray };
      res.send(users);
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  updateUsers = (userInfo, res, next) => {
    try {
      let db = this.dbUtils.getDb();
      if (userInfo.id === null) {
        const tempPwd = this.hash("password");
        delete userInfo.id;
        const update = db.prepare(
          "INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @active, @resetpwd)"
        );
        const roles = JSON.stringify(userInfo.roles);
        update.run({
          id: null,
          login: userInfo.login,
          password: tempPwd,
          nickname: userInfo.nickname,
          email: userInfo.email,
          roles: roles,
          active: userInfo.active.toString(),
          resetpwd: 1,
        });
      } else {
        const getStmt = db.prepare("SELECT * FROM users WHERE id = ?");

        let user = getStmt.get(userInfo.id);

        const deleteStmt = db.prepare("DELETE FROM users WHERE id = ?");
        deleteStmt.run(userInfo.id);

        const update = db.prepare(
          `INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @active, @resetpwd)`
        );
        const roles = JSON.stringify(userInfo.roles);
        update.run({
          id: userInfo.id,
          login: userInfo.login,
          password: user.password,
          nickname: userInfo.nickname,
          email: userInfo.email,
          roles: roles,
          active: userInfo.active,
          resetpwd: userInfo.resetpwd,
        });
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.send();
  };

  deleteUser = (id, res, next) => {
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

  getUserById = (id, res, next) => {
    try {
      let db = this.dbUtils.getDb();
      const select = db.prepare("SELECT * FROM users where id = ?");
      const data = select.get(id);
      if (!data || !data.password || !data.roles) {
        return next(createError(500, "No user found"));
      }
      if (data) {
        delete data.password;
        res.send({ user: data });
      } else {
        return next(createError(401, "Unauthorized"));
      }
    } catch (err) {
      return next(err);
    }
  };

  init = (res, next) => {
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
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT, password TEXT, nickname TEXT, email TEXT, roles TEXT, active INTEGER, resetpwd INTEGER)"
      );
      create.run();

      const users = [
        {
          login: "admin",
          password: "admin",
          nickname: "Admin",
          email: "na@donotreply.com",
          roles: ["ADMIN", "USER"],
          active: 1,
          resetpwd: 0,
        },
        {
          login: "user",
          password: "user",
          nickname: "User",
          email: "na2@donotreply.com",
          roles: ["USER"],
          active: 1,
          resetpwd: 0,
        },
      ];

      const insert = db.prepare(
        "INSERT INTO users (login, password, nickname, email, roles, active, resetpwd) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      users.forEach((user) => {
        const hash = this.hash(user.password);
        const roles = JSON.stringify(user.roles);
        insert.run(
          user.login,
          hash,
          user.nickname,
          user.email,
          roles,
          user.active,
          user.resetpwd
        );
      });

      res.send("Initialized user table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBUsers;
