import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { AlertRaisedEvent } from "../../contracts/events";
import { EventBus } from "../../platform/ports";
import { CHANNELS, type Channel } from "./channels";
import { DeliveryRepository } from "./delivery.repository";

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly bus: EventBus,
    private readonly repository: DeliveryRepository,
    @Inject(CHANNELS) private readonly channels: Channel[],
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("alerts", "notification", (event) => this.notify(event));
    this.logger.log(`waiting for alerts on channels: ${this.channels.map((c) => c.name).join(", ")}`);
  }

  async notify(event: AlertRaisedEvent): Promise<void> {
    const alert = event.data;

    for (const channel of this.channels) {
      if (await this.repository.wasDelivered(alert.alertId, channel.name)) continue;

      try {
        await channel.send(alert);
        await this.repository.record(alert.alertId, channel.name, true, null);
        this.logger.log(`${channel.name} sent: ${alert.message}`);
      } catch (error) {
        await this.repository.record(alert.alertId, channel.name, false, String(error));
        this.logger.error(`${channel.name} failed: ${error}`);
      }
    }
  }
}
