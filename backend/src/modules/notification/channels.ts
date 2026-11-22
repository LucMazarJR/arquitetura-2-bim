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
      subject: `[${SEVERITY_LABELS[alert.severity]}] ${alert.message}`,
      text: [
        alert.message,
        "",
        `Casa: ${alert.homeId}`,
        `Medidor: ${alert.meterId}`,
        `Regra: ${alert.rule}`,
        `Quando: ${formatDateTime(alert.raisedAt, this.config.timeZone)}`,
      ].join("\n"),
    });
  }
}

const SEVERITY_LABELS: Record<AlertRaised["severity"], string> = {
  warning: "AVISO",
  critical: "CRÍTICO",
};

function formatDateTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone, dateStyle: "short", timeStyle: "medium" });
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
