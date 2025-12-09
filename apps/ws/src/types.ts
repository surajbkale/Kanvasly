import { WebSocket } from "ws";

export type User = {
  userId: string;
  userName: string;
  ws: WebSocket;
  rooms: string[];
};


