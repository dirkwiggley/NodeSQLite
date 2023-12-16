import DBUtils from "./DBUtils.js";
import Express from "express";

import { createError } from "../utils/error.js";
import { VideoInterface } from "./types.js";

class DBUsers {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  getVideos = (res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();

      let outArray = [];
      const select = db.prepare("SELECT * FROM videos");
      const data: Array<VideoInterface> = select.all() as Array<VideoInterface>;

      if (data.length == 0) {
        return next(createError(500, "No data in videos table"));
      }

      res.send(data);
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  updateVideoAPI = (videoInfo: VideoInterface, res: Express.Response, next: any) => {
    try {
      // New user has no id
      if (videoInfo.id === null) {
        let db = this.dbUtils.getDb();
        delete videoInfo.id;
        const insert = db.prepare(
          "INSERT INTO users VALUES (@id, @name, @desc, @url)"
        );

        insert.run({
          id: null,
          name: videoInfo.name,
          desc: videoInfo.desc,
          url: videoInfo.url
        });
      } else {
        this.updateVideo(videoInfo);
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.status(204).send();
  };

  updateVideo = (videoInfo: VideoInterface) => {
    let db = this.dbUtils.getDb();

    if (videoInfo.id === null) {
      throw new Error("Invalid video");
    } else {
      try {
        const updateStmt = db.prepare(`UPDATE videos SET name = ?, desc = ?, url = ? WHERE id = ?`);
        updateStmt.run(
          videoInfo.name,
          videoInfo.desc,
          videoInfo.url,
          videoInfo.id
        );
      } catch(err) {
        console.error(err);
        throw err;
      }
    }
  };

  deleteVideo = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const deleteStatement = db.prepare(`DELETE FROM videos WHERE id = ${id}`);
      deleteStatement.run();
      res.send("Success");
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  getVideoById = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const select = db.prepare("SELECT * FROM videos WHERE id = ?");
      const data: VideoInterface = select.get(id) as VideoInterface;
      if (!data || !data.name || !data.desc || !data.url) {
        return next(createError(500, "Invalid video"));
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
        const drop = db.prepare("DROP TABLE IF EXISTS videos");
        const changes = drop.run();
        console.log(changes);
      } catch (err) {
        console.error(err);
      }

      const create = db.prepare(
        "CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, desc TEXT, url TEXT)"
      );
      create.run();

      const videos = [
        {
          name: "Defense vs Balanced",
          desc: "A stick figure martial arts discussion",
          url: "https://youtu.be/5raTknIdxyU?si=nWJzJu7ll5BwCjGK"
        },
        {
          name: "Strength vs Speed",
          desc: "A stick figure combat comparison",
          url: "https://youtu.be/cDoo53YgQhY?si=Y1IhHWGcuNP9xp_N"
        },
      ];
      const insert = db.prepare(
        "INSERT INTO videos (name, desc, url) VALUES (?, ?, ?)"
      );
      videos.forEach((video) => {
        insert.run(
          video.name,
          video.desc,
          video.url
        );
      });

      res.send("Initialized video table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBUsers;
