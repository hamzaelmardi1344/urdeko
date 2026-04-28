import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@bep/trpc-router";

export const trpc = createTRPCReact<AppRouter>();
