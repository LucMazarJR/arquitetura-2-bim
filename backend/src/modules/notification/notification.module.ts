import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CHANNELS, defaultChannels } from "./channels";
import { DeliveryRepository } from "./delivery.repository";
import { notificationConfig, type NotificationConfig } from "./notification.config";
import { NotificationService } from "./notification.service";

@Module({
  imports: [ConfigModule.forFeature(notificationConfig)],
  providers: [
    NotificationService,
    DeliveryRepository,
    {
      provide: CHANNELS,
      inject: [notificationConfig.KEY],
      useFactory: (config: NotificationConfig) => defaultChannels(config),
    },
  ],
})
export class NotificationModule {}
