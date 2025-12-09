import client from "@repo/db/client";
import { WebSocketMessage, WsDataType } from "@repo/common/types";
import { WebSocket } from "ws";
import { userManager } from "../managers/UserManager.js";
import { User } from "../types.js";

export async function handleJoin(
  user: User,
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

  user.rooms.push(parsedData.roomId!);

  const uniqueParticipantsMap = new Map();
  userManager.getUsersInRoom(parsedData.roomId!).forEach((u) =>
    uniqueParticipantsMap.set(u.userId, {
      userId: u.userId,
      userName: u.userName,
    })
  );

  const currentParticipants = Array.from(uniqueParticipantsMap.values());

  ws.send(
    JSON.stringify({
      type: WsDataType.USER_JOINED,
      roomId: parsedData.roomId,
      roomName: parsedData.roomName,
      userId: user.userId,
      userName: parsedData.userName,
      participants: currentParticipants,
      timestamp: new Date().toISOString(),
    })
  );

  userManager.broadcastToRoom(
    parsedData.roomId!,
    {
      type: WsDataType.USER_JOINED,
      roomId: parsedData.roomId,
      roomName: parsedData.roomName,
      userId: user.userId,
      userName: parsedData.userName,
      participants: currentParticipants,
      timestamp: new Date().toISOString(),
    },
    [user.userId],
    true
  );
}

export function handleLeave(user: User, parsedData: WebSocketMessage) {
  user.rooms = user.rooms.filter((r) => r !== parsedData.roomId);
  userManager.broadcastToRoom(
    parsedData.roomId!,
    {
      type: WsDataType.USER_LEFT,
      userId: user.userId,
      userName: user.userName,
      roomId: parsedData.roomId,
    },
    [user.userId],
    true
  );
}

export async function handleCloseRoom(
  user: User,
  parsedData: WebSocketMessage,
  ws: WebSocket
) {
  const usersInRoom = userManager.getUsersInRoom(parsedData.roomId);

  if (
    usersInRoom.length === 1 &&
    usersInRoom[0] &&
    usersInRoom[0].userId === user.userId
  ) {
    try {
      await client.shape.deleteMany({
        where: { roomId: parsedData.roomId },
      });
      await client.room.delete({
        where: { id: parsedData.roomId },
      });

      ws.send(
        JSON.stringify({
          type: "ROOM_CLOSED",
          roomId: parsedData.roomId,
          timestamp: new Date().toISOString(),
        })
      );

      ws.close(1000, "Room deleted");
    } catch (error) {
      console.error("Error deleting room and shapes: ", error);
    }
  }
}
