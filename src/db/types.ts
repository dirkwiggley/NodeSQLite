export interface UserInterface {
  id: number;
  login: string;
  nickname: string;
}

export interface VideoInterface {
  id: number;
  name: string;
  desc: string;
  url: string;
}

export interface VideoListInterface {
  id: number;
  name: string;
  user_id: number;
}

export interface VideoInListInterface {
  id: number;
  list_id: number;
  video_id: number;
}