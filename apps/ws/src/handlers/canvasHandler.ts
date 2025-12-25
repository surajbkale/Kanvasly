import client from "@repo/db/client";
import { WebSocketMessage, WsDataType } from "@repo/common/types";
import { connectionManager } from "../managers/ConnectionManager";
import { Connection } from "../types";

export function handleCursorMove(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  if (
    parsedData.roomId &&
    parsedData.userId &&
    parsedData.connectionId &&
    parsedData.message
  ) {
    connectionManager.broadcastToRoom(
      parsedData.roomId,
      {
        type: parsedData.type,
        roomId: parsedData.roomId,
        userId: connection.userId,
        userName: connection.userName,
        connectionId: connection.connectionId,
        message: parsedData.message,
        timestamp: new Date().toISOString(),
        id: null,
        participants: null,
      },
      [connection.connectionId],
      false
    );
  }
}

export function handleStream(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  connectionManager.broadcastToRoom(
    parsedData.roomId!,
    {
      type: parsedData.type,
      id: parsedData.id,
      message: parsedData.message,
      roomId: parsedData.roomId,
      userId: connection.userId,
      userName: connection.userName,
      connectionId: connection.connectionId,
      timestamp: new Date().toISOString(),
      participants: null,
    },
    [connection.connectionId],
    false
  );
}

export function handleDraw(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  if (!parsedData.message || !parsedData.id || !parsedData.roomId) {
    console.error(
      `Missing shape Id or shape message data for ${parsedData.type}`
    );
    return;
  }

  connectionManager.addOrUpdateShape(parsedData.roomId, parsedData);

  connectionManager.broadcastToRoom(
    parsedData.roomId,
    {
      type: parsedData.type,
      message: parsedData.message,
      roomId: parsedData.roomId,
      userId: connection.userId,
      userName: connection.userName,
      connectionId: connection.connectionId,
      timestamp: new Date().toISOString(),
      id: parsedData.id,
      participants: null,
    },
    [],
    false
  );
}

export function handleUpdate(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  if (!parsedData.message || !parsedData.id || !parsedData.roomId) {
    console.error(
      `Missing shape Id or shape message data for ${parsedData.type}`
    );
    return;
  }

  connectionManager.addOrUpdateShape(parsedData.roomId, parsedData);

  connectionManager.broadcastToRoom(
    parsedData.roomId,
    {
      type: parsedData.type,
      id: parsedData.id,
      message: parsedData.message,
      roomId: connection.userId,
      userId: connection.userId,
      userName: connection.userName,
      connectionId: connection.connectionId,
      participants: null,
      timestamp: new Date().toISOString(),
    },
    [],
    false
  );
}

export function handleEraser(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  if (!parsedData.id) {
    console.error(`Missing shape Id for ${parsedData.type}`);
    return;
  }

  connectionManager.removeShape(parsedData.roomId!, parsedData.id);

  connectionManager.broadcastToRoom(
    parsedData.roomId!,
    {
      id: parsedData.id,
      type: parsedData.type,
      roomId: parsedData.roomId,
      userId: connection.userId,
      userName: connection.userName,
      connectionId: connection.connectionId,
      timestamp: new Date().toISOString(),
      message: null,
      participants: null,
    },
    [],
    false
  );
}
