import { initTRPC } from "@trpc/server";

export type AuthenticatedContext = {
  userId: string;
  shopId: string;
  clerkId: string;
};

export type PublicContext = {
  userId?: string;
  shopId?: string;
  clerkId?: string;
};

export const trpc = initTRPC.context<PublicContext>().create();

export const placeholderRouter = trpc.router({
  health: trpc.procedure.query(() => ({ ok: true as const })),
});

export type AppRouter = typeof placeholderRouter;
