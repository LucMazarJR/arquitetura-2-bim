import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { WebSocket, type Server } from "ws";

export interface LiveMessage {
  type: "reading" | "alert" | "forecast";
  data: unknown;
}

@WebSocketGateway({ path: "/ws" })
export class LiveGateway {
  @WebSocketServer()
  private readonly server: Server;

  broadcast(message: LiveMessage) {
    const text = JSON.stringify(message);
    for (const client of this.server?.clients ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(text);
    }
  }
}
