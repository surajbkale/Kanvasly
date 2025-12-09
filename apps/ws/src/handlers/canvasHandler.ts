import client from "@repo/db/client";
import { WebSocketMessage } from "@repo/common/types";
import { userManager } from "../managers/UserManager.js";
import { User } from "../types.js";

export async function handleDraw(user: User, parsedData: WebSocketMessage) {
  if (!parsedData.message || !parsedData.id) {
    console.error(
      `Missing shape Id or shape message data for ${parsedData.type}`
    );
    return;
  }

  try {
    await client.shape.create({
      data: {
        id: parsedData.id,
        message: parsedData.message,
        roomId: parsedData.roomId!,
        userId: user.userId,
      },
    });
  } catch (error) {
    console.error(`Error saving ${parsedData.type} data to database: ${error}`);
  }

  userManager.broadcastToRoom(
    parsedData.roomId!,
    {
      type: parsedData.type,
      message: parsedData.message,
      roomId: parsedData.roomId,
      userId: user.userId,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    },
    [user.userId],
    false
  );
}

export async function handleUpdate(user: User, parsedData: WebSocketMessage) {
  if (!parsedData.message || !parsedData.id) {
    console.error(
      `Missing shape Id or shape message data for ${parsedData.type}`
    );
    return;
  }

  try {
    await client.shape.update({
      where: {
        id: parsedData.id,
        roomId: parsedData.roomId,
      },
      data: {
        message: parsedData.message,
      },
    });
  } catch (error) {
    console.error(`Error saving ${parsedData.type} data to database: ${error}`);
  }

  userManager.broadcastToRoom(
    parsedData.roomId!,
    {
      type: parsedData.type,
      id: parsedData.id,
      message: parsedData.message,
      roomId: parsedData.roomId,
      userId: user.userId,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    },
    [],
    false
  );
}

export async function handleEraser(user: User, parsedData: WebSocketMessage) {
  if (!parsedData.id) {
    console.error(`Missing shape Id for ${parsedData.type}`);
    return;
  }

  try {
    const shapeExists = await client.shape.findUnique({
      where: {
        id: parsedData.id,
        roomId: parsedData.roomId,
      },
    });

    if (!shapeExists) {
      userManager.broadcastToRoom(
        parsedData.roomId!,
        {
          id: parsedData.id,
          type: parsedData.type,
          roomId: parsedData.roomId,
          userId: user.userId,
          userName: user.userName,
          timestamp: new Date().toISOString(),
        },
        [user.userId],
        false
      );
      return;
    }

    await client.shape.delete({
      where: {
        id: parsedData.id,
        roomId: parsedData.roomId,
      },
    });

    userManager.broadcastToRoom(
      parsedData.roomId!,
      {
        id: parsedData.id,
        type: parsedData.type,
        roomId: parsedData.roomId,
        userId: user.userId,
        userName: user.userName,
        timestamp: new Date().toISOString(),
      },
      [user.userId],
      false
    );
  } catch (error) {
    console.error(
      `Error erasing ${parsedData.type} data to database: ${error}`
    );
  }
}
