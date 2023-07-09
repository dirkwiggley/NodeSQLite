import DBUtils from "./DBUtils.js";
import bcrypt from "bcryptjs";
import Express from "express";

import { createError } from "../utils/error.js";
import DBAuth from "./DBAuth.js";
import { UserInterface } from "./types.js";

class DBUsers {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  hash = (value: string) => {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(value, salt);
  };

  compareHash = (value: string, hash: any) => {
    return bcrypt.compareSync(value, hash);
  };

  getUsers = (res: Express.Response, next: any) => {
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

  isActive = (id: number) => {
    try {
      let db = this.dbUtils.getDb();

      const select = db.prepare("SELECT active FROM users WHERE id = ?");
      const active = select.get(id);

      if (active === 1)
        return true;
      else 
        return false;
    } catch (err) {
        // if error, don't crash but don't validate
        console.error(err);
        return false;
    }
  };

  updateUserAPI = (userInfo: UserInterface, res: Express.Response, next: any) => {
    try {
      if (typeof userInfo.roles !== 'string') {
        userInfo.roles = JSON.stringify(userInfo.roles);
      }
      // Convert these true/false values to 1/0
      userInfo.active = userInfo.active ? 1 : 0;
      userInfo.resetpwd = userInfo.resetpwd ? 1 : 0;

      // New user has no id
      if (userInfo.id === null) {
        let db = this.dbUtils.getDb();
        const tempPwd: string = this.hash("password");
        delete userInfo.id;
        const insert = db.prepare(
          "INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @locale, @active, @resetpwd, @refreshtoken)"
        );

        const active = userInfo.active ? 1 : 0;
        insert.run({
          id: null,
          login: userInfo.login,
          password: tempPwd,
          nickname: userInfo.nickname,
          email: userInfo.email,
          roles: userInfo.roles,
          locale: userInfo.locale,
          active: active,
          resetpwd: 1,
          refreshtoken: null,
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

  // Do not update the password here, there should be a separate function for that
  updateUser = (userInfo: UserInterface) => {
    let db = this.dbUtils.getDb();
    if (typeof userInfo.roles !== 'string') {
      userInfo.roles = JSON.stringify(userInfo.roles);
    }

    if (userInfo.id === null) {
      throw new Error("Invalid user");
    } else {
      const refreshToken = userInfo.refreshtoken ? userInfo.refreshtoken : null;
      
      try {
        const updateStmt = db.prepare(`UPDATE users SET login = ?, nickname = ?, email = ?, roles = ?, locale = ?, active = ?, resetpwd = ?, refreshtoken = ? WHERE id = ?`);
        updateStmt.run(
          userInfo.login,
          userInfo.nickname,
          userInfo.email,
          userInfo.roles,
          userInfo.locale,
          userInfo.active,
          userInfo.resetpwd,
          refreshToken,
          userInfo.id,
        );
      } catch(err) {
        console.error(err);
        throw err;
      }
    }
  };

  logoutUser = (userId: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      if (userId === null) {
        next(createError(500, "Invalid user, can not logout"));
      } else {
        const getStmt = db.prepare("SELECT * FROM users WHERE id = ?");
        let user = getStmt.get(userId);
        if (!user) {
          next(createError(500, "Could not find user"));
        }

        try {
          const updateStmt = db.prepare("UPDATE users SET login = ?, nickname = ?, email = ?, roles = ?, locale= ?, active = ?, resetpwd = ?, refreshtoken = ? WHERE id = ?");
          updateStmt.run(
            user.login,
            user.nickname,
            user.email,
            user.roles,
            user.locale,
            user.active,
            user.resetpwd,
            "",
            user.id,
          );
        } catch(err) {
          console.error(err);
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.status(204).send();
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
      const data = select.get(id);
      if (!data || !data.password || !data.roles) {
        return next(createError(500, "Invalid user"));
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
        "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT, password TEXT, nickname TEXT, email TEXT, roles TEXT, locale TEXT ,active INTEGER, resetpwd INTEGER, refreshtoken TEXT)"
      );
      create.run();

      const users = [
        {
          login: "admin",
          password: "admin",
          nickname: "Admin",
          email: "na@donotreply.com",
          roles: ["ADMIN", "USER"],
          locale: "enUS",
          active: 1,
          resetpwd: 0,
        },
        {
          login: "user",
          password: "user",
          nickname: "User",
          email: "na2@donotreply.com",
          roles: ["USER"],
          locale: "enUS",
          active: 1,
          resetpwd: 0,
        },
      ];
      const dbAuth = new DBAuth();

      const insert = db.prepare(
        "INSERT INTO users (login, password, nickname, email, roles, locale, active, resetpwd, refreshtoken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
          user.locale,
          user.active,
          user.resetpwd,
          null
        );
      });

      res.send("Initialized user table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBUsers;
