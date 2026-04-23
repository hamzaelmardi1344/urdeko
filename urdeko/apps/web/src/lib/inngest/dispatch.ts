import { inngest } from "./client";

export async function dispatch(event: {
  name: string;
  data: Record<string, unknown>;
}): Promise<void> {
  await inngest.send(event);
}
