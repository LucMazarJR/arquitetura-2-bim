import { ConfigType, registerAs } from "@nestjs/config";

export const notificationConfig = registerAs("notification", () => ({
  email: {
    smtpHost: process.env.SMTP_HOST ?? "localhost",
    smtpPort: Number(process.env.SMTP_PORT ?? 1025),
    from: process.env.EMAIL_FROM ?? "Monitor de Energia <alertas@energia.local>",
    to: process.env.EMAIL_TO ?? "morador@energia.local",
    timeZone: process.env.TIME_ZONE ?? "America/Sao_Paulo",
  },
}));

export type NotificationConfig = ConfigType<typeof notificationConfig>;
