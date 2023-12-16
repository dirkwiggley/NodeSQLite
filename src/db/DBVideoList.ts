import DBUtils from "./DBUtils.js";
import Express from "express";

import { createError } from "../utils/error.js";
import { VideoListInterface } from "./types.js";

class DBVideoList {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  getVideoLists = (res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();

      let outArray = [];
      const select = db.prepare("SELECT * FROM video_list");
      const data = select.all() as Array<VideoListInterface>;

      if (data.length == 0) {
        return next(createError(500, "No data in video_list table"));
      }

      res.send(data);
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  updateVideoListAPI = (videoListInfo: VideoListInterface, res: Express.Response, next: any) => {
    try {
      // New user has no id
      if (videoListInfo.id === null) {
        let db = this.dbUtils.getDb();
        delete videoListInfo.id;
        const insert = db.prepare(
          "INSERT INTO video_list VALUES (@id, @name, @user_id)"
        );

        insert.run({
          id: null,
          name: videoListInfo.name,
          desc: videoListInfo.user_id,
        });
      } else {
        this.updateVideoList(videoListInfo);
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.status(204).send();
  };

  updateVideoList = (videoListInfo: VideoListInterface) => {
    let db = this.dbUtils.getDb();

    if (videoListInfo.id === null) {
      throw new Error("Invalid video list");
    } else {
      try {
        const updateStmt = db.prepare(`UPDATE videos SET name = ?, user_id = ? WHERE id = ?`);
        updateStmt.run(
          videoListInfo.name,
          videoListInfo.user_id,
          videoListInfo.id
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
      const deleteStatement = db.prepare(`DELETE FROM video_list WHERE id = ${id}`);
      deleteStatement.run();
      res.send("Success");
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  getVideoListById = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const select = db.prepare("SELECT * FROM video_list WHERE id = ?");
      const data: VideoListInterface = select.get(id) as VideoListInterface;
      if (!data || !data.name || !data.user_id) {
        return next(createError(500, "Invalid video list"));
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
        const drop = db.prepare("DROP TABLE IF EXISTS video_list");
        const changes = drop.run();
        console.log(changes);
      } catch (err) {
        console.error(err);
      }

      const create = db.prepare(
        "CREATE TABLE IF NOT EXISTS video_list (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, user_id INTEGER)"
      );
      create.run();

      const videoLists = [
        {
          name: "Admin's action videos",
          user_id: 1
        },
      ];
      const insert = db.prepare(
        "INSERT INTO video_list (name, user_id) VALUES (?, ?)"
      );
      videoLists.forEach((videoList) => {
        insert.run(
          videoList.name,
          videoList.user_id
        );
      });

      res.send("Initialized video table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBVideoList;
