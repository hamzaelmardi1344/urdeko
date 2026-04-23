import { Resend } from "resend";
import { env } from "@/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(params: {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}): Promise<void> {
  if (!resend) {
    console.info(`[email] RESEND_API_KEY manquant — skipped email to ${params.to}`);
    return;
  }
  await resend.emails.send({
    from: env.AUTH_EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    react: params.react,
    replyTo: params.replyTo,
  });
}
