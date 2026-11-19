import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { WsAdapter } from "@nestjs/platform-ws";
import { ALL_MODULES, AppModule } from "./app.module";

async function bootstrap() {
  const modules = (process.env.MODULES ?? ALL_MODULES.join(","))
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const app = await NestFactory.create(AppModule.register(modules));
  app.enableCors();
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableShutdownHooks();

  if (modules.includes("ingestion")) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: process.env.MQTT_URL ?? "mqtt://localhost:1883",
        clientId: process.env.MQTT_CLIENT_ID ?? "backend-ingestion-1",
        clean: false,
        subscribeOptions: { qos: 1 },
      },
    });
    await app.startAllMicroservices();
  }

  const port = Number(process.env.HTTP_PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`backend running with modules [${modules.join(", ")}] on port ${port}`);
}

bootstrap();
