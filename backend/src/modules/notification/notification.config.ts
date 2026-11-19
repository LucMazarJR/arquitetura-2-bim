import { ConfigType, registerAs } from "@nestjs/config";

export const notificationConfig = registerAs("notification", () => ({
  email: {
    smtpHost: process.env.SMTP_HOST ?? "localhost",
    smtpPort: Number(process.env.SMTP_PORT ?? 1025),
    from: process.env.EMAIL_FROM ?? "Energy Monitor <alerts@energy.local>",
    to: process.env.EMAIL_TO ?? "resident@energy.local",
  },
}));

export type NotificationConfig = ConfigType<typeof notificationConfig>;
