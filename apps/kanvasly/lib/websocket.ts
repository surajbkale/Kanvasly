import { useEffect, useState } from "react";

// websocket events
export enum WebSocketEvent {
  JOIN_ROOM = "JOIN_ROOM",
  LEAVE_ROOM = "LEAVE_ROOM",
  MESSAGE = "MESSAGE",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
}

export type WebSocketMessage = {
  event: WebSocketEvent;
  payload: string;
};

type Message = {
  userId: string;
  content: string;
  timestamp: string;
};

// Hook to use websocket connection in client components
export function useWebSocket(roomCode: string, userId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);

  useEffect(() => {
    // create websocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    const host = window.location.host;
    const ws = new WebSocket(
      `${protocol}//${host}/api/ws?roomCode=${roomCode}&userId=${userId}`
    );

    // Connection opened
    ws.addEventListener("open", () => {
      setIsConnected(true);
      // Join room event
      const joinMessage: WebSocketMessage = {
        event: WebSocketEvent.JOIN_ROOM,
        payload: { roomCode, userId },
      };
      ws.send(JSON.stringify(joinMessage));
    });

    // Listen for messages
    ws.addEventListener("message", (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);

      switch (data.event) {
        case WebSocketEvent.MESSAGE:
          const msg: Message = JSON.parse(data.payload);
          setMessage((prev) => [...prev, msg]);
          break;
        case WebSocketEvent.USER_JOINED:
          setParticipants((prev) => [...prev, data.payload]);
          break;
        case WebSocketEvent.USER_LEFT:
          setParticipants((prev) => prev.filter((id) => id !== data.payload));
          break;
        default:
          break;
      }
    });

    // Connection closed
    ws.addEventListener("close", () => {
      setIsConnected(false);
    });

    setSocket(ws);

    // Cleanup on unmount
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send leave room event
        const leaveMessage: WebSocketMessage = {
          event: WebSocketEvent.LEAVE_ROOM,
          payload: { roomCode, userId },
        };
        ws.send(JSON.stringify(leaveMessage));
        ws.close();
      }
    };
  }, [roomCode, userId]);

  // function to send message
  const sendMessage = (content: string) => {
    if (socket && isConnected) {
      const message: WebSocketMessage = {
        event: WebSocketEvent.MESSAGE,
        payload: {
          roomCode,
          userId,
          content,
          timestamp: new Date().toISOString(),
        },
      };
      socket.send(JSON.stringify(message));
    }
  };

  return { isConnected, messages: message, participants, sendMessage };
}
