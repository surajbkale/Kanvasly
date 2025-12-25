import client from "@repo/db/client";
import { WebSocketMessage, WsDataType } from "@repo/common/types";
import { WebSocket } from "ws";
import { connectionManager } from "../managers/ConnectionManager";
import { Connection } from "../types";

export async function handleJoin(
  connection: Connection,
  parsedData: WebSocketMessage,
  ws: WebSocket
) {
  const roomCheckResponse = await client.room.findUnique({
    where: { id: parsedData.roomId },
  });

  if (!roomCheckResponse) {
    ws.close();
    return;
  }

  if (!connection.rooms.includes(parsedData.roomId)) {
    connection.rooms.push(parsedData.roomId!);
  }

  const participants = connectionManager.getCurrentParticipants(
    parsedData.roomId
  );

  connectionManager.initRoomShapes(parsedData.roomId!);

  ws.send(
    JSON.stringify({
      type: WsDataType.USER_JOINED,
      roomId: parsedData.roomId,
      userId: connection.userId,
      userName: connection.userName,
      connectionId: connection.connectionId,
      participants,
      timestamp: new Date().toISOString(),
    })
  );

  const shapes = connectionManager.getRoomShapes(parsedData.roomId);

  if (shapes && shapes.length > 0) {
    ws.send(
      JSON.stringify({
        type: WsDataType.EXISTING_SHAPES,
        roomId: parsedData.roomId,
        message: shapes,
        timestamp: new Date().toISOString(),
      })
    );
  }

  const isFirstTabInRoom = connectionManager.isFirstTabInRoom(
    connection.userId,
    connection.connectionId,
    parsedData.roomId!
  );

  if (isFirstTabInRoom) {
    connectionManager.broadcastToRoom(
      parsedData.roomId!,
      {
        type: WsDataType.USER_JOINED,
        roomId: parsedData.roomId,
        userId: connection.userId,
        userName: connection.userName,
        connectionId: connection.connectionId,
        participants,
        timestamp: new Date().toISOString(),
        id: null,
        message: null,
      },
      [connection.connectionId],
      true
    );
  }
}

export async function handleLeave(connection: Connection, roomId: string) {
  connection.rooms = connection.rooms.filter((r) => r !== roomId);

  const userHasOtherTabsInRoom = connectionManager.hasOtherTabsInRoom(
    connection.userId,
    connection.connectionId,
    roomId
  );

  if (!userHasOtherTabsInRoom) {
    connectionManager.broadcastToRoom(
      roomId,
      {
        type: WsDataType.USER_LEFT,
        userId: connection.userId,
        userName: connection.userName,
        connectionId: connection.connectionId,
        roomId: roomId,
        id: null,
        message: null,
        participants: null,
        timestamp: new Date().toISOString(),
      },
      [connection.connectionId],
      true
    );
  }

  const anyConnectionsInRoom = !connectionManager.isRoomEmpty(
    roomId,
    connection.connectionId
  );

  if (!anyConnectionsInRoom) {
    try {
      await client.room.delete({
        where: { id: roomId },
      });

      connectionManager.deleteRoomShapes(roomId);
      console.log(`Deleted empty room ${roomId}`);
    } catch (error) {
      console.error(`Failed to delete room ${roomId}: ${error}`);
    }
  }
}

export async function handleCloseRoom(
  connection: Connection,
  parsedData: WebSocketMessage
) {
  const connectionsInRoom = connectionManager.getConnectionsInRoom(
    parsedData.roomId
  );

  if (
    connectionsInRoom.length === 1 &&
    connectionsInRoom[0] &&
    connectionsInRoom[0].connectionId === connection.connectionId
  ) {
    try {
      await client.room.delete({
        where: { id: parsedData.roomId },
      });

      connectionManager.deleteRoomShapes(parsedData.roomId!);

      connectionsInRoom.forEach((conn) => {
        if (conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.send(
            JSON.stringify({
              type: "ROOM_CLOSED",
              roomId: parsedData.roomId,
              timestamp: new Date().toISOString(),
            })
          );
        }

        conn.rooms = conn.rooms.filter((r) => r !== parsedData.roomId);
      });

      console.log(
        `Room ${parsedData.roomId} closed by connection ${connection.connectionId}`
      );
    } catch (error) {
      console.error("Error deleting room: ", error);
    }
  }
}

export function handleDisconnect(connectionId: string) {
  const connection = connectionManager.getConnection(connectionId);
  if (connection) {
    connection.rooms.forEach((roomId) => {
      const userHasOtherConnectionInRoom = connectionManager.hasOtherTabsInRoom(
        connection.userId,
        connectionId,
        roomId
      );

      if (!userHasOtherConnectionInRoom) {
        connectionManager.broadcastToRoom(
          roomId,
          {
            type: WsDataType.USER_LEFT,
            userId: connection.userId,
            userName: connection.userName,
            connectionId: connection.connectionId,
            roomId,
            id: null,
            message: null,
            participants: null,
            timestamp: new Date().toISOString(),
          },
          [connectionId],
          true
        );
      }

      const roomIsEmpty = connectionManager.isRoomEmpty(roomId, connectionId);

      if (roomIsEmpty) {
        client.room
          .delete({
            where: { id: roomId },
          })
          .then(() => {
            connectionManager.deleteRoomShapes(roomId);
            console.log(
              `Deleted empty room ${roomId} after last connection left`
            );
          })
          .catch((err) => {
            console.error(`Failed to delete empty room ${roomId}: ${err}`);
          });
      }
    });
  }

  connectionManager.removeConnection(connectionId);
}
