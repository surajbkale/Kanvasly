import { WebSocket } from "ws";
import {
  WebSocketChatMessage,
  WebSocketMessage,
  WsDataType,
} from "@repo/common/types";
import { User } from "../types.js";

class UserManager {
  private static instance: UserManager;
  private users: User[] = [];

  private constructor() {}

  public static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  addUser(user: User) {
    const existingIndex = this.users.findIndex((u) => u.userId === user.userId);
    if (existingIndex !== -1) {
      this.users.splice(existingIndex, 1);
    }
    this.users.push(user);
  }

  removeUser(userId: string) {
    const index = this.users.findIndex((u) => u.userId === userId);
    if (index !== -1) {
      this.users.splice(index, 1);
    }
  }

  getUser(userId: string) {
    return this.users.find((x) => x.userId === userId);
  }

  getUsersInRoom(roomId: string) {
    return this.users.filter((u) => u.rooms.includes(roomId));
  }

  broadcastToRoom(
    roomId: string,
    message: WebSocketMessage,
    excludeUsers: string[] = [],
    includedParticipants: boolean = false
  ) {
    if (
      (includedParticipants && !message.participants) ||
      message.type === WsDataType.USER_JOINED
    ) {
      const uniqueParticipantsMap = new Map();
      this.users
        .filter((u) => u.rooms.includes(roomId))
        .forEach((u) =>
          uniqueParticipantsMap.set(u.userId, {
            userId: u.userId,
            userName: u.userName,
          })
        );

      const currentParticipants = Array.from(uniqueParticipantsMap.values());
      message.participants = currentParticipants;
    }
    this.users.forEach((u) => {
      if (u.rooms.includes(roomId) && !excludeUsers.includes(u.userId)) {
        try {
          if (u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error(`Error sending message to user ${u.userId}: ${error}`);
        }
      }
    });
  }
}

export const userManager = UserManager.getInstance();
