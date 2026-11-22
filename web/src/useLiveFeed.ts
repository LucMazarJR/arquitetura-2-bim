import { useEffect, useRef, useState } from "react";
import { liveFeedUrl, type LiveMessage } from "./api";

export function useLiveFeed(onMessage: (message: LiveMessage) => void): boolean {
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let socket: WebSocket;
    let retryTimer: number | undefined;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(liveFeedUrl());
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
