import { WebSocketServer } from "ws";
import { WebSocketMessage, WsDataType } from "@repo/common/types";
import { PORT } from "./config";
import { authUser } from "./services/auth";
import { connectionManager } from "./managers/ConnectionManager";
import { Connection } from "./types";
import {
  handleJoin,
  handleLeave,
  handleCloseRoom,
  handleDisconnect,
} from "./handlers/roomHandler.js";
import {
  handleCursorMove,
  handleStream,
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

  const queryParam = new URLSearchParams(url.split("?")[1]);
  const token = queryParam.get("token");
  if (!token || token === null) {
    console.error("No valid token found in query params");
    return;
  }

  const userId = authUser(token);
  if (!userId) {
    console.error("Connection rejected: invalid user");
    ws.close(1008, "User not authenticated");
    return;
  }

  const connectionId = connectionManager.generateConnectionId();
  const newConnection: Connection = {
    connectionId,
    userId,
    userName: userId,
    ws,
    rooms: [],
  };
  connectionManager.addConnection(newConnection);

  ws.send(
    JSON.stringify({
      type: WsDataType.CONNECTION_READY,
      connectionId,
    })
  );

  console.log(`Sent CONNECTION_READY to: ${connectionId}`);

  ws.on("error", (err) =>
    console.error(`WebSocket error for user ${userId}: ${err}`)
  );

  ws.on("message", async function message(data) {
    try {
      const parsedData: WebSocketMessage = JSON.parse(data.toString());
      if (!parsedData) {
        console.error("Error in parsing ws data");
        return;
      }

      if (!parsedData.roomId || !parsedData.userId) {
        console.error("No userId or roomId provided for WS message");
        return;
      }

      const connection = connectionManager.getConnection(connectionId);
      if (!connection) {
        console.error("No connection found");
        ws.close();
        return;
      }

      if (parsedData.userName && connection.userName === userId) {
        connection.userName = parsedData.userName;
        connectionManager.updateAllUsernamesForUser(
          userId,
          parsedData.userName ?? parsedData.userId
        );
      }

      switch (parsedData.type) {
        case WsDataType.JOIN:
          await handleJoin(connection, parsedData, ws);
          break;

        case WsDataType.LEAVE:
          await handleLeave(connection, parsedData.roomId);
          break;

        case WsDataType.CLOSE_ROOM:
          await handleCloseRoom(connection, parsedData);
          break;

        case WsDataType.CURSOR_MOVE:
          handleCursorMove(connection, parsedData);
          break;

        case WsDataType.STREAM_SHAPE:
        case WsDataType.STREAM_UPDATE:
          handleStream(connection, parsedData);
          break;

        case WsDataType.DRAW:
          handleDraw(connection, parsedData);
          break;

        case WsDataType.UPDATE:
          handleUpdate(connection, parsedData);
          break;

        case WsDataType.ERASER:
          handleEraser(connection, parsedData);
          break;

        default:
          console.warn(
            `Unknown message type received from connection ${connectionId}: ${parsedData.type}`
          );
          break;
      }
    } catch (error) {
      console.error("Error processing message: ", error);
    }
  });

  ws.on("close", (code, reason) => {
    handleDisconnect(connectionId);
  });
});

wss.on("listening", () => {
  console.log(`Websocket server started on port ${PORT}`);
});
