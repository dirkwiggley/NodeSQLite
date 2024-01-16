export interface UserInterface {
  id: number;
  login: string;
  password: string;
  nickname: string;
  email: string;
  roles: string;
  locale: string;
  active: number;
  resetpwd: number;
  refreshtoken: string;
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

export interface TokenInterface {
  exp: number;
  iat: number;
  isAdmin: boolean;
  login: string;
  timestamp: number;
  user_id: number;
}

// TODO: flesh this out
export const objectIsDecodedToken = (obj: unknown): obj is TokenInterface => {
  const test: any = obj;
  return test.timestamp !== null && test.timestamp !== undefined;
};