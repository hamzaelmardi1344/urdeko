import type { FastifyRequest } from "fastify";

export type RequestUser = {
  id: string;
  clerkId: string;
  email: string;
  shopId: string | null;
};

export type AuthenticatedRequest = FastifyRequest & {
  user: RequestUser;
};
