import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { createSmtpTransport } from "./smtp";
import { env } from "@/env";

export async function sendEmail(params: {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}): Promise<void> {
  const html = await render(params.react);
  const transport = createSmtpTransport();
  await transport.sendMail({
    from: env.AUTH_EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html,
    replyTo: params.replyTo,
  });
}
