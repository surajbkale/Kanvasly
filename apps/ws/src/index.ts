import { WebSocketServer } from "ws";
import { WsDataType, WebSocketMessage } from "@repo/common/types";
import { PORT } from "./config.js";
import { authUser } from "./services/auth.js";
import { userManager } from "./managers/UserManager.js";
import { User } from "./types.js";
import {
  handleJoin,
  handleLeave,
  handleCloseRoom,
} from "./handlers/roomHandler.js";
import {
  handleDraw,
  handleUpdate,
  handleEraser,
} from "./handlers/canvasHandler.js";

declare module "http" {
  interface IncomingMessage {
    user: {
      id: string;
      email: string;
    };
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", function connection(ws, req) {
  const url = req.url;
  if (!url) {
    console.error("No valid URL found in request");
    return;
  }
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token");
  if (!token || token === null) {
    console.error("No valid token found in query params");
    ws.close(1008, "User not authenticated");
    return;
  }

  const userId = authUser(token);
  if (!userId) {
    console.error("Connection rejected: invalid user");
    ws.close(1008, "User not authenticated");
    return;
  }

  const newUser: User = {
    userId,
    userName: userId,
    ws,
    rooms: [],
  };
  userManager.addUser(newUser);

  ws.on("error", (err) => {
    console.error(`WebSocket error for user ${userId}: ${err}`);
  });

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: WsDataType.CONNECTION_READY }));
  });

  ws.on("message", async function message(data) {
    try {
      const parsedData: WebSocketMessage = JSON.parse(data.toString());
      if (!parsedData) {
        console.error("Error in parsing ws data");
        return;
      }

      const user = userManager.getUser(parsedData.userId);
      if (!user) {
        console.error("No user found");
        ws.close();
        return;
      }

      if (!parsedData.roomId || !parsedData.userId) {
        console.error("No userId or roomId provided for WS message");
        return;
      }

      if (parsedData.userName && user.userName === userId) {
        user.userName = parsedData.userName;
      }

      switch (parsedData.type) {
        case WsDataType.JOIN:
          await handleJoin(user, parsedData, ws);
          break;

        case WsDataType.LEAVE:
          handleLeave(user, parsedData);
          break;

        case WsDataType.CLOSE_ROOM:
          await handleCloseRoom(user, parsedData, ws);
          break;

        case WsDataType.DRAW:
          await handleDraw(user, parsedData);
          break;

        case WsDataType.UPDATE:
          await handleUpdate(user, parsedData);
          break;

        case WsDataType.ERASER:
          await handleEraser(user, parsedData);
          break;

        default:
          console.warn(`Unknown message type: ${parsedData.type}`);
      }
    } catch (error) {
      console.error("Error processing message: ", error);
    }
  });

  ws.on("close", (code, reason) => {
    const user = userManager.getUser(userId);
    if (user) {
      user.rooms.forEach((roomId) => {
        userManager.broadcastToRoom(
          roomId,
          {
            type: WsDataType.USER_LEFT,
            userId: user.userId,
            userName: user.userName,
            roomId,
          },
          [user.userId]
        );
      });
    }

    userManager.removeUser(userId);
  });
});

wss.on("listening", () => {
  console.log(`Websocket server started on port ${PORT}`);
});
