import { WebSocket } from "ws";
import { WebSocketMessage, WsDataType } from "@repo/common/types";
import { Connection } from "../types";

class ConnectionManager {
  private static instance: ConnectionManager;

  public connections: Connection[] = [];
  public roomShapes: Record<string, WebSocketMessage[]> = {};

  private constructor() {}

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  addConnection(conn: Connection) {
    this.connections.push(conn);
  }

  removeConnection(connectionId: string) {
    const index = this.connections.findIndex(
      (conn) => conn.connectionId === connectionId
    );
    if (index !== -1) {
      this.connections.splice(index, 1);
      console.log(`Connection ${connectionId} closed and removed`);
    }
  }

  getConnection(connectionId: string) {
    return this.connections.find((x) => x.connectionId === connectionId);
  }

  updateAllUsernamesForUser(userId: string, newName: string) {
    this.connections
      .filter((conn) => conn.userId === userId)
      .forEach((conn) => {
        conn.userName = newName;
      });
  }

  getRoomShapes(roomId: string): WebSocketMessage[] {
    return this.roomShapes[roomId] || [];
  }

  initRoomShapes(roomId: string) {
    if (!this.roomShapes[roomId]) {
      this.roomShapes[roomId] = [];
    }
  }

  deleteRoomShapes(roomId: string) {
    delete this.roomShapes[roomId];
  }

  addOrUpdateShape(roomId: string, shapeData: WebSocketMessage) {
    if (!this.roomShapes[roomId]) {
      this.roomShapes[roomId] = [];
    }

    const shapes = this.roomShapes[roomId];
    const shapeIndex = shapes.findIndex((s) => s.id === shapeData.id);

    if (shapeIndex !== -1) {
      shapes[shapeIndex] = shapeData;
    } else {
      shapes.push(shapeData);
    }
  }

  removeShape(roomId: string, shapeId: string) {
    if (this.roomShapes[roomId]) {
      this.roomShapes[roomId] = this.roomShapes[roomId]!.filter(
        (s) => s.id !== shapeId
      );
    }
  }

  isFirstTabInRoom(
    userId: string,
    currentConnId: string,
    roomId: string
  ): boolean {
    return this.connections
      .filter(
        (conn) => conn.userId === userId && conn.connectionId !== currentConnId
      )
      .every((conn) => !conn.rooms.includes(roomId));
  }

  hasOtherTabsInRoom(
    userId: string,
    currentConnId: string,
    roomId: string
  ): boolean {
    return this.connections.some(
      (conn) =>
        conn.userId === userId &&
        conn.connectionId !== currentConnId &&
        conn.rooms.includes(roomId)
    );
  }

  isRoomEmpty(roomId: string, currentConnId: string): boolean {
    return !this.connections.some(
      (conn) =>
        conn.connectionId !== currentConnId && conn.rooms.includes(roomId)
    );
  }

  getConnectionsInRoom(roomId: string) {
    return this.connections.filter((conn) => conn.rooms.includes(roomId));
  }

  getCurrentParticipants(roomId: string) {
    const map = new Map();
    this.connections
      .filter((conn) => conn.rooms.includes(roomId))
      .forEach((conn) =>
        map.set(conn.userId, { userId: conn.userId, userName: conn.userName })
      );
    return Array.from(map.values());
  }

  broadcastToRoom(
    roomId: string,
    message: WebSocketMessage,
    excludeConnectionIds: string[] = [],
    includeParticipants: boolean = false
  ) {
    if (
      (includeParticipants && !message.participants) ||
      message.type === WsDataType.USER_JOINED
    ) {
      message.participants = this.getCurrentParticipants(roomId);
    }

    this.connections.forEach((conn) => {
      if (
        conn.rooms.includes(roomId) &&
        !excludeConnectionIds.includes(conn.connectionId)
      ) {
        try {
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error(
            `Error sending message to connection ${conn.connectionId}: ${error}`
          );
        }
      }
    });
  }
}

export const connectionManager = ConnectionManager.getInstance();
