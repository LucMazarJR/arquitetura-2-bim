import { useEffect, useRef, useState } from "react";
import type { LiveMessage } from "./api";

export function useLiveFeed(onMessage: (message: LiveMessage) => void): boolean {
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket;
    let retryTimer: number | undefined;
    let stopped = false;

    const connect = () => {
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${location.host}/ws`);
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => handler.current(JSON.parse(event.data));
      socket.onclose = () => {
        setConnected(false);
        if (!stopped) retryTimer = window.setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket.close();
    };
  }, []);

  return connected;
}
