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

    this.generateAccessToken = (user) => {
      const isAdmin = user.roles.includes("ADMIN")
      return jwt.sign(
        { user_id: user.id, login: user.login, isAdmin: isAdmin },
        process.env.TOKEN_KEY,
        { expiresIn: "2h", }
      )
    }

    this.generateRefreshToken = (user) => {
      const isAdmin = user.roles.includes("ADMIN")
      return jwt.sign(
        { user_id: user.id, login: user.login, isAdmin: isAdmin },
        process.env.REFRESH_KEY
      )
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
        console.log(result)
        if (result) {
          delete user.password

          // Create token
          const accessToken = this.generateAccessToken(user)
          const refreshToken = this.generateRefreshToken(user)
          const insertRefresh = db.prepare("INSERT INTO refreshtokens (token) VALUES (?)")
          insertRefresh.run(refreshToken)

          // res.cookie("access_token", accessToken, { httpOnly: true, })
          res.cookie("access_token", accessToken)
            .status(200)
            .json({
              ...user,
              accessToken: accessToken,
              refreshToken: refreshToken
            })
        } else {
          return next(createError(400, "Unauthorized"))
        }
      } catch (err) {
        console.error(err)
        return next(err)
      }
    }

    this.refresh = (refreshToken, res) => {
      try {
        // send error if there is no token or it's invalid
        if (!refreshToken) return res.status(401).json("You are not authenticated")

        let db = this.dbUtils.getDb()
        const getStmt = db.prepare("SELECT * FROM refreshtokens WHERE refreshtoken = ?")
        const token = getStmt.getOne(refreshToken)

        console.log(token)
        if (token) {
          jwt.verify(refreshToken, process.env.REFRESH_KEY, (err, user) => {
            err && console.error(err)
            const delStmt = db.prepare("DELETE FROM refreshTokens WHERE id === ?")
            delStmt.run(token.id)

            const newAccessToken = generateAccessToken(user)
            const newRefeshToken = generateRefreshToken(user)
            const insertRefresh = db.prepare("INSERT INTO refreshtokens (token) VALUES (?)")
            insertRefresh.run(newRefeshToken)

            res.status(200).json({
              accessToken: newAccessToken,
              refreshToken: newRefeshToken
            })
          })
        }

      } catch (err) {
        console.error(err)
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

    this.logout = (refreshToken, req, res) => {
      try {
        let db = this.dbUtils.getDb()
        const deleteStmt = db.prepare('DELETE FROM refreshTokens WHERE refreshToken = ?');
        deleteStmt.run(refreshToken)
        return res.send("You have logged out successfully")
      } catch (err) {
        console.error(err)
        return next(createError(500, "Invalid token"))
      }
    }

    this.initRefreshTokens = (req, res) => {
      try {
        let db = this.dbUtils.getDb()
        const dropStmt = db.prepare('DROP TABLE refreshtokens');
        dropStmt.run()

        const create = db.prepare("CREATE TABLE IF NOT EXISTS refreshtokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT)")
        create.run()

        return res.send("refreshTokens table successfully initialized")
      } catch (err) {
        console.error(err)
        return next(createError(500, "Invalid token"))
      }
    }
  }
}

export default DBAuth