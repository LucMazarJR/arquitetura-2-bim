import { Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { AlertRaised } from "../../contracts/events";
import type { NotificationConfig } from "./notification.config";

export const CHANNELS = "NOTIFICATION_CHANNELS";

export interface Channel {
  readonly name: string;
  send(alert: AlertRaised): Promise<void>;
}

export class EmailChannel implements Channel {
  readonly name = "email";
  private readonly transport;

  constructor(private readonly config: NotificationConfig["email"]) {
    this.transport = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });
  }

  async send(alert: AlertRaised): Promise<void> {
    await this.transport.sendMail({
      from: this.config.from,
      to: this.config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.message}`,
      text: [
        alert.message,
        "",
        `Home: ${alert.homeId}`,
        `Meter: ${alert.meterId}`,
        `Rule: ${alert.rule}`,
        `When: ${alert.raisedAt}`,
      ].join("\n"),
    });
  }
}

export class FakePushChannel implements Channel {
  readonly name = "push";
  private readonly logger = new Logger("FakePushChannel");

  async send(alert: AlertRaised): Promise<void> {
    this.logger.log(`push sent to ${alert.meterId}: ${alert.message}`);
  }
}

export function defaultChannels(config: NotificationConfig): Channel[] {
  return [new EmailChannel(config.email), new FakePushChannel()];
}
