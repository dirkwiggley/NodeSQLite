import DBUtils from "./DBUtils.js"
import bcrypt from "bcryptjs"
import jwt, { DecodeOptions, JwtPayload, Secret } from "jsonwebtoken"
import Express from "express"

import { createError } from "../utils/error.js"

// id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT, password TEXT, nickname TEXT, email TEXT, roles TEXT, active INTEGER, resetpwd INTEGER
interface UserInterface {
  id: number,
  login: string,
  password: string,
  nickname: string,
  email: string,
  roles: string,
  active: number,
  resetpwd: number
}

interface RefreshTokenInterface { 
  exp: number, 
  iat: number, 
  isAdmin: number,
  login: string,
  timestamp: number,
  user_id: number
}

interface DecodeReturnType extends JwtPayload {
  data: string | JwtPayload;
}

class DBAuth {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils()
  }

    hash = (value: string) => {
      var salt = bcrypt.genSaltSync(10)
      return bcrypt.hashSync(value, salt)
    }

    compareHash = (value:string, hash: string) => {
      return bcrypt.compareSync(value, hash)
    }

    // TODO: this
    objectIsDecodedToken = (obj: unknown) : obj is RefreshTokenInterface => {
      const test : any = obj;
      return ((test.timestamp !== null) && (test.timestamp !== undefined))
    }

    generateAccessToken = (user: UserInterface) => {
      const isAdmin = user.roles.includes("ADMIN")
      const timestamp = Date.now()
      const tokenKey: string | undefined = process.env.TOKEN_KEY
      if (!tokenKey) { 
        console.error("Could not locate TOKEN_KEY")
        return
      }

      return jwt.sign(
        { user_id: user.id, login: user.login, isAdmin: isAdmin, timestamp: timestamp },
        tokenKey,
        { expiresIn: "2h", }
      )
    }

    generateRefreshToken = (user: UserInterface) => {
      const isAdmin = user.roles.includes("ADMIN")
      const timestamp = Date.now()
      const refreshKey: string | undefined = process.env.REFRESH_KEY
      if (!refreshKey) {
        console.error("Could not locate REFRESH_KEY")
        return
      }
      return jwt.sign(
        { user_id: user.id, login: user.login, isAdmin: isAdmin, timestamp: timestamp },
        refreshKey
      )
    }

    login = (res: Express.Response, login: string, password: string, next: any) => {
      try {
        if (!login || login === "" || !password || password === "") {
          res.send()
          return next(new Error("Illegal login params"))
        }
        let db = this.dbUtils?.getDb()
        if (!db) {
          console.error("Could not get db")
          return next(new Error("Could not get db"))
        }

        const select = db.prepare("SELECT * FROM users WHERE login = ?");
        const user = select.get(login);
        if (!user || !user.password || !user.roles) {
          return next(createError(400, "No user found"))
        }
        const result = this.compareHash(password, user.password)
        
        if (result) {
          delete user.password

          const create = db.prepare("CREATE TABLE IF NOT EXISTS refreshtokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT, timestamp INTEGER)");
          create.run();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
          // Create token
          const accessToken = this.generateAccessToken(user)
          const refreshToken = this.generateRefreshToken(user)
          if (!refreshToken) {
            console.error("Could not get refresh token")
            return next(new Error("Could not get refresh token"))
          }
          const refreshKey: string | unknown = process.env.REFRESH_KEY
          if (!refreshKey) {
            console.error("Could not get REFRESH_KEY")
            return next(new Error("Could not get REFRESH_KEY"))
          }
          const decodedToken: any = jwt.decode(refreshToken, refreshKey)
          const insertRefresh = db.prepare("INSERT INTO refreshtokens (token, timestamp) VALUES (?, ?)")
          if (decodedToken) {
            insertRefresh.run(refreshToken, decodedToken.timestamp)
          } else {
            console.error("Could not decode token")
            return next(createError(500, "Could not decode token"))
          }

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

    refresh = (refreshToken: any, res: Express.Response, next: any) => {
      try {
        // send error if there is no token or it's invalid
        if (!refreshToken) return res.status(401).json("You are not authenticated")

        let db = this.dbUtils?.getDb()
        if (!db) {
          console.log("Could not get db")
          return
        }
        const getStmt: any = db.prepare("SELECT * FROM refreshtokens WHERE refreshtoken = ?")
        const token = getStmt.getOne(refreshToken)

        const refreshKey: string | undefined = process.env.REFRESH_KEY
        if (!refreshKey) {
          console.log("Could not get REFRESH_KEY")
          throw new Error("Could not get REFRESH_KEY")
        }

        const algos = [(err: any, user: UserInterface) => {
          err && console.error(err)
          if (!db) {
            console.error("Invalid db")
            return
          }
          const delStmt = db.prepare("DELETE FROM refreshTokens WHERE id === ?")
          delStmt.run(token.id)

          const newAccessToken = this.generateAccessToken(user)
          const newRefeshToken = this.generateRefreshToken(user)
          const decodedToken = jwt.verify(refreshToken, refreshKey)
          const insertRefresh = db.prepare("INSERT INTO refreshtokens (token, timestamp) VALUES (?, ?)")
          if (!decodedToken) {
            console.error("decodedToken is invalid")
            return
          }
          if (this.objectIsDecodedToken(decodedToken)) {
            insertRefresh.run(newRefeshToken, decodedToken.timestamp)
          }
          res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefeshToken
          })
        }]

        if (token) {
          const decodedToken = jwt.verify(refreshToken, refreshKey);
          console.log(decodedToken);

          // jwt.verify(refreshToken, refreshKey, (err: Error, user: UserInterface) => {
          //   err && console.error(err)
          //   if (!db) {
          //     console.error("Invalid db")
          //     return
          //   }
          //   const delStmt = db.prepare("DELETE FROM refreshTokens WHERE id === ?")
          //   delStmt.run(token.id)

          //   const newAccessToken = this.generateAccessToken(user)
          //   const newRefeshToken = this.generateRefreshToken(user)
          //   const decodedToken = jwt.decode(refreshToken, refreshKey as DecodeOptions) as unknown
          //   const insertRefresh = db.prepare("INSERT INTO refreshtokens (token, timestamp) VALUES (?, ?)")
          //   if (!decodedToken) {
          //     console.error("decodedToken is invalid")
          //     return
          //   }

          //   if (this.objectIsDecodedToken(decodedToken)) {
          //     insertRefresh.run(newRefeshToken, decodedToken.timestamp)
          //   }

          //   res.status(200).json({
          //     accessToken: newAccessToken,
          //     refreshToken: newRefeshToken
          //   })
          // })
        }

      } catch (err) {
        console.error(err)
        return next(err)
      }
    }

    resetPwd = (id:number, pwd: string, res: Express.Response, next: any) => {
      try {
        let db = this.dbUtils?.getDb()
        if (!db) {
          console.error("db is invalid")
          return next(createError(500, "db is invalid"))
        }
        const getStmt = db.prepare("SELECT * FROM users WHERE id = ?")
        let userInfo = getStmt.get(id)

        const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?')
        deleteStmt.run(userInfo.id)

        const hashPwd = this.hash(pwd)
        const update = db.prepare(`INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @active, @resetpwd)`);
        update.run({
          id: userInfo.id,
          login: userInfo.login,
          password: hashPwd,
          nickname: userInfo.nickname,
          email: userInfo.email,
          roles: userInfo.roles,
          active: userInfo.active,
          resetpwd: 0
        })
      } catch (err) {
        console.error(err)
        return next(err)
      }
      res.send()
    }

    logout = (refreshToken:any , req: Express.Request, res: Express.Response, next: any) => {
      try {
        let db = this.dbUtils?.getDb()
        if (!db) {
          console.error("db is invalid")
          return next(createError(500, "db is invalid"))
        }
        const refreshKey: string | unknown = process.env.REFRESH_KEY
        if (!refreshKey) {
          console.log("Could not get REFRESH_KEY")
          return next(createError(500, "Could not get REFRESH_KEY"))
        }
        const decodedToken = jwt.decode(refreshToken, refreshKey) as RefreshTokenInterface
        const deleteStmt = db.prepare('DELETE FROM refreshTokens WHERE id = ?');
        if (decodedToken) {
          deleteStmt.run(decodedToken.user_id)
        }
        return res.send("You have logged out successfully")
      } catch (err) {
        console.error(err)
        return next(createError(500, "Invalid token"))
      }
    }

    initRefreshTokens = (req: Express.Request, res: Express.Response, next: any) => {
      try {
        let db = this.dbUtils?.getDb()
        if (!db) {
          console.error("db is invalid")
          return next(createError(500, "db is invalid"))
        }
        const dropStmt = db.prepare('DROP TABLE refreshtokens');
        dropStmt.run()

        const create = db.prepare("CREATE TABLE IF NOT EXISTS refreshtokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT, timestamp INTEGER)")
        create.run()

        return res.send("refreshTokens table successfully initialized")
      } catch (err) {
        console.error(err)
        return next(createError(500, "Invalid token"))
      }
    }

    cleanupRefreshTokens = (req: Express.Request, res: Express.Response, next: any) => {
      try {
        let db = this.dbUtils?.getDb()
        if (!db) {
          console.error("db is invalid")
          return next(createError(500, "db is invalid"))
        }
        const cutoffDays = 2
        const secondsInADay = 86400000
        let cutoffDate = Date.now() - (cutoffDays * secondsInADay)
        
        const select = db.prepare('SELECT id FROM refreshtokens WHERE timestamp < ?')
        const tokens = select.all(cutoffDate)

        tokens?.forEach(token => {
          console.log(`DELETE FROM refreshtokens WHERE id = ${token.id}`)
          db?.exec(`DELETE FROM refreshtokens WHERE id = ${token.id}`)
        })
       
      } catch (err) {
        console.error(err)
        return next(createError(500, "Refresh Token Cleanup Error"))
      }
    }
  
}

export default DBAuth