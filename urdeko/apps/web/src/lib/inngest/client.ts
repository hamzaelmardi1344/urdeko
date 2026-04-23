import { Inngest } from "inngest";
import { env } from "@/env";

export const inngest = new Inngest({
  id: "urdeko",
  name: "UrdeKo",
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
  baseUrl: env.INNGEST_BASE_URL,
});
