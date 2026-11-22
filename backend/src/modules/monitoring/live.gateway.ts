import { Inject } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { IncomingMessage } from "node:http";
import { WebSocket, type Server } from "ws";
import { monitoringConfig, type MonitoringConfig } from "./monitoring.config";

export interface LiveMessage {
  type: "reading" | "alert" | "forecast";
  data: unknown;
}

@WebSocketGateway({ path: "/ws" })
export class LiveGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(@Inject(monitoringConfig.KEY) private readonly config: MonitoringConfig) {}

  handleConnection(client: WebSocket, request: IncomingMessage) {
    const token = new URL(request.url ?? "/", "http://localhost").searchParams.get("token");
    if (token !== this.config.apiToken) client.close(1008, "invalid token");
  }

  broadcast(message: LiveMessage) {
    const text = JSON.stringify(message);
    for (const client of this.server?.clients ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(text);
    }
  }
}
