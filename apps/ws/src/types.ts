import { WebSocket } from "ws";

export type Connection = {
  connectionId: string;
  userId: string;
  userName: string;
  ws: WebSocket;
  rooms: string[];
};
