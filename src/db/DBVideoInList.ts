import DBUtils from "./DBUtils.js";
import Express from "express";

import { createError } from "../utils/error.js";
import { VideoInListInterface } from "./types.js";

class DBUsers {
  private dbUtils: DBUtils | null = null;

  constructor() {
    this.dbUtils = new DBUtils();
  }

  getVideosInList = (res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();

      const select = db.prepare("SELECT * FROM video_in_list");
      const data = select.all() as Array<VideoInListInterface>;

      if (data.length == 0) {
        return next(createError(500, "No data in video_in_list table"));
      }

      res.send(data);
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  updateVideosInListAPI = (videoInListInfo: VideoInListInterface, res: Express.Response, next: any) => {
    try {
      // New user has no id
      if (videoInListInfo.id === null) {
        let db = this.dbUtils.getDb();
        delete videoInListInfo.id;
        const insert = db.prepare(
          "INSERT INTO video_in_list VALUES (@id, @list_id, @video_id)"
        );

        insert.run({
          id: null,
          name: videoInListInfo.list_id,
          desc: videoInListInfo.video_id
        });
      } else {
        this.updateVideoInList(videoInListInfo);
      }
    } catch (err) {
      console.error(err);
      return next(err);
    }
    res.status(204).send();
  };

  updateVideoInList = (videoInListInfo: VideoInListInterface) => {
    let db = this.dbUtils.getDb();

    if (videoInListInfo.id === null) {
      throw new Error("Invalid video in list");
    } else {
      try {
        const updateStmt = db.prepare(`UPDATE video_in_list SET list_id = ?, video_id = ? WHERE id = ?`);
        updateStmt.run(
          videoInListInfo.list_id,
          videoInListInfo.video_id
        );
      } catch(err) {
        console.error(err);
        throw err;
      }
    }
  };

  deleteVideoInList = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const deleteStatement = db.prepare(`DELETE FROM video_in_list WHERE id = ${id}`);
      deleteStatement.run();
      res.send("Success");
    } catch (err) {
      console.error(err);
      return next(err);
    }
  };

  getVideoInListById = (id: number, res: Express.Response, next: any) => {
    try {
      let db = this.dbUtils.getDb();
      const select = db.prepare("SELECT * FROM video_in_list WHERE id = ?");
      const data = select.get(id) as VideoInListInterface;
      if (!data || !data.list_id || !data.video_id) {
        return next(createError(500, "Invalid video in list"));
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
        const drop = db.prepare("DROP TABLE IF EXISTS video_in_list");
        const changes = drop.run();
        console.log(changes);
      } catch (err) {
        console.error(err);
      }

      const create = db.prepare(
        "CREATE TABLE IF NOT EXISTS video_in_list (id INTEGER PRIMARY KEY AUTOINCREMENT, list_id INTEGER, video_id INTEGER)"
      );
      create.run();

      const videosInList = [
        {
          list_id: 1,
          video_id: 1
        },
        {
          list_id: 1,
          video_id: 2
        },
      ];
      const insert = db.prepare(
        "INSERT INTO video_in_list (list_id, video_id) VALUES (?, ?)"
      );
      videosInList.forEach((videoInList) => {
        insert.run(
          videoInList.list_id,
          videoInList.video_id
        );
      });

      res.send("Initialized video_in_list table");
    } catch (err) {
      return next(err);
    }
  };
}

export default DBUsers;
