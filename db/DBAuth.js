import DBUtils from "./DBUtils.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

import { createError } from "../utils/error.js"

class DBAuth {
  constructor() {
    this.dbUtils = new DBUtils()

    this.hash = (value) => {
      var salt = bcrypt.genSaltSync(10)
      return bcrypt.hashSync(value, salt)
    }

    this.compareHash = (value, hash) => {
      return bcrypt.compareSync(value, hash)
    }

    this.login = (res, login, password, next) => {
      try {
        if (!login || login === "" || !password || password === "") {
          res.send()
          return
        }
        let db = this.dbUtils.getDb()

        const select = db.prepare("SELECT * FROM users WHERE login = ?");
        const user = select.get(login);
        if (!user || !user.password || !user.roles) {
          return next(createError(400, "No user found"))
        }
        const result = this.compareHash(password, user.password)
        console.log(result);
        if (result) {
          delete user.password;

          // Create token
          const isAdmin = user.roles.includes("ADMIN")
          const token = jwt.sign(
            { user_id: user.id, login: user.login, isAdmin: isAdmin },
            process.env.TOKEN_KEY,
            { expiresIn: "2h", }
          );

          res.cookie("access_token", token, { httpOnly: true, })
            .status(200)
            .json({...user});
        } else {
          return next(createError(400, "Unauthorized"))
        }
      } catch (err) {
        console.error(err);
        return next(err)
      }
    }

    this.resetPwd = (id, pwd, res, next) => {
      try {
        let db = this.dbUtils.getDb()
        const getStmt = db.prepare("SELECT * FROM users WHERE id = ?")
        let userInfo = getStmt.get(id)

        const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?')
        deleteStmt.run(userInfo.id)

        const hashPwd = this.hash(pwd)
        const update = db.prepare(`INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @token, @active, @resetpwd)`);
        update.run({
          id: userInfo.id,
          login: userInfo.login,
          password: hashPwd,
          nickname: userInfo.nickname,
          email: userInfo.email,
          roles: userInfo.roles,
          token: userInfo.token,
          active: userInfo.active,
          resetpwd: 0
        })
      } catch (err) {
        console.error(err)
        return next(err)
      }
      res.send()
    }
  }
}

export default DBAuth