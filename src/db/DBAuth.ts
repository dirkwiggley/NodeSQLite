import DBUtils from "./DBUtils.js";
import bcrypt from "bcryptjs";
import jwt, { DecodeOptions, JwtPayload, Secret } from "jsonwebtoken";
import Express from "express";

import { createError } from "../utils/error.js";
import DBUsers from "./DBUsers.js";
import { UserInterface, objectIsDecodedToken } from "./types.js";

interface DecodeReturnType extends JwtPayload {
  data: string | JwtPayload;
}

class DBAuth {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  hash = (value: string) => {
    var salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(value, salt);
  };

  compareHash = (value: string, hash: string) => {
    return bcrypt.compareSync(value, hash);
  };

  createUserObjForTokens(userId: number, login: string, isAdmin: boolean, timestamp: number) {
    return {
      user_id: userId,
      login: login,
      isAdmin: isAdmin,
      timestamp: timestamp,
    }
  }

  generateAccessToken = (user: UserInterface) => {
    const isAdmin = user.roles.includes("ADMIN");
    const timestamp = Date.now();
    const tokenKey: string | undefined = process.env.ACCESS_KEY;
    if (!tokenKey) {
      console.error("Could not locate ACCESS_KEY");
      return;
    }

    return jwt.sign(
      this.createUserObjForTokens(user.id, user.login, isAdmin, timestamp),
      tokenKey,
      { expiresIn: '2h' }
    );
  };

  generateRefreshToken = (user: UserInterface) => {
    const isAdmin = user.roles.includes("ADMIN");
    const timestamp = Date.now();
    const refreshKey: string | undefined = process.env.REFRESH_KEY;
    if (!refreshKey) {
      console.error("Could not locate REFRESH_KEY");
      return;
    }
    return jwt.sign(
      this.createUserObjForTokens(user.id, user.login, isAdmin, timestamp),
      refreshKey,
      { expiresIn: '1h' }
    );
  };

  login = (
    res: Express.Response,
    login: string,
    password: string,
    next: any
  ) => {
    try {
      if (!login || login === "" || !password || password === "") {
        console.error("Illegal login params");
        return next(createError(500, "Illegal login params"));
      }
      let db = this.dbUtils?.getDb();
      if (!db) {
        console.error("Could not get db");
        return next(createError(500, "Could not get db"));
      }

      const select = db.prepare("SELECT * FROM users WHERE login = ?");
      const user = select.get(login);
      if (!user || !user.password || !user.roles) {
        console.error("No user found");
        return next(createError(400, "No user found"));
      }
      const result = this.compareHash(password, user.password);

      if (result) {
        // Do not send the password back with the user!
        delete user.password;

        // Create tokens
        // This token lives on the user object
        const refreshToken = this.generateRefreshToken(user);
        if (!refreshToken) {
          console.error("Could not get refresh token");
          return next(createError(500, "Could not get refresh token"));
        } else {
          // Add the access token to the user object
          user.refreshtoken = refreshToken;
          const dbUsers = new DBUsers();
          dbUsers.updateUser(user);

        }
        const accessToken = this.generateAccessToken(user);
        // This token lives in a cookie
        if (!accessToken) {
          next(createError(500, "Could not generate access token"));
        }

        // Store the refresh token on the client side as a cookie marked HTTPOnly
        // the access token is returned as data and should only be stored
        // on the client side in memory
        res
          .cookie("access_token", accessToken, {
            expires: new Date(new Date().getTime() + (1000 * 60 * 15)),
            httpOnly: true, 
            // sameSite: "none", 
            // secure: true 
          })
          .status(200)
          .json({
            ...user
          });
      } else {
        return next(createError(400, "Unauthorized"));
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  // When the refresh token has expired, use the access token to create a
  // new one
  refresh = (accessToken: string, res: Express.Response, next: any) => {
    try {
      // send error if there is no token or it's invalid
      if (!accessToken)
        return res.status(401).json("You are not authenticated");

      let db = this.dbUtils?.getDb();
      if (!db) {
        console.log("Could not get db");
        return;
      }

      // verify the access token
      const config = process.env;
      const decodedToken = jwt.verify(accessToken, config.ACCESS_KEY);
      // get the user
      const getStmt: any = db.prepare("SELECT * FROM users WHERE id = ?");
      let user: UserInterface = null;
      if (objectIsDecodedToken(decodedToken)) {
        user = getStmt.get(decodedToken.user_id);
        if (!user.active || !user.active) {
          next(createError(410, "User has been disabled"));
        }
      }
      if (!user) {
        next(createError(500, "Could not find user"));
      }

      // generate a new refresh token
      const refreshKey: string | undefined = process.env.REFRESH_KEY;
      if (!refreshKey) {
        console.log("Could not get REFRESH_KEY");
        next(createError(400, "Could not get REFRESH_KEY"));
      }

      const newRefreshToken = this.generateRefreshToken(user);
      // Store the refresh token on the client side as a cookie marked HttpOnly
      // the access token is returned as data and should only be stored
      // on the client side in memory
      if (!newRefreshToken) {
        console.log("Could not create refresh token");
        next(createError(400, "Could not create refresh token"));
      }
      res
        .cookie("refresh_token", newRefreshToken, { expires: new Date(new Date().getTime() + (1000 * 60 * 15)), httpOnly: true })
        .status(200)
        .json({
          ...user
        });
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  resetPwd = (id: number, pwd: string, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils?.getDb();
      if (!db) {
        console.error("db is invalid");
        return next(createError(500, "db is invalid"));
      }
      const getStmt = db.prepare("SELECT * FROM users WHERE id = ?");
      let userInfo = getStmt.get(id);

      const deleteStmt = db.prepare("DELETE FROM users WHERE id = ?");
      deleteStmt.run(userInfo.id);

      const hashPwd = this.hash(pwd);
      const update = db.prepare(
        `INSERT INTO users VALUES (@id, @login, @password, @nickname, @email, @roles, @active, @resetpwd)`
      );
      update.run({
        id: userInfo.id,
        login: userInfo.login,
        password: hashPwd,
        nickname: userInfo.nickname,
        email: userInfo.email,
        roles: userInfo.roles,
        active: userInfo.active,
        resetpwd: 0,
      });
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.send();
  };

  logout = (
    userId: number,
    req: Express.Request,
    res: Express.Response,
    next: any
  ) => {
    const dbUsers = new DBUsers
    dbUsers.logoutUser(userId, res, next);
  };
}

export default DBAuth;
