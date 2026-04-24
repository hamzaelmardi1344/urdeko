import { createTransport } from "nodemailer";
import { env } from "@/env";

/** Options passées au provider Nodemailer d’Auth.js (`server`). */
export function smtpServerOptions() {
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  };
}

export function createSmtpTransport() {
  return createTransport(smtpServerOptions());
}
