import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  customerSchema,
  deliverySchema,
  orderSchema,
  productSchema,
  shopSchema,
  type Order,
  type Product,
} from "@bep/shared-types";
import { apiRequest } from "@/api/client";

const analyticsSummarySchema = z.object({
  pendingOrders: z.number(),
  todayOrders: z.number(),
  todayRevenueMAD: z.number(),
  monthOrders: z.number(),
  monthRevenueMAD: z.number(),
  codPendingMAD: z.number(),
  codCollectedMAD: z.number(),
  codRemittedMAD: z.number(),
  freeQuotaUsed: z.number(),
  freeQuotaLimit: z.number(),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
  topCustomers: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
      totalOrders: z.number(),
      totalSpentMAD: z.number(),
    }),
  ),
  topProducts: z.array(
    z.object({
      productId: z.string(),
      title: z.string(),
      revenueMAD: z.number(),
      quantity: z.number(),
    }),
  ),
});

const shopListSchema = shopSchema;
const productsSchema = z.array(productSchema);
const customersSchema = z.array(customerSchema);
const ordersSchema = z.array(orderSchema);
const orderActionSchema = orderSchema;
const deliveryActionSchema = deliverySchema;

export function useSessionToken() {
  const { getToken } = useAuth();
  return async () => getToken();
}

export function useDashboard() {
  const token = useSessionToken();
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () =>
      apiRequest({
        path: "/analytics/summary",
        token: await token(),
        schema: analyticsSummarySchema,
        cacheKey: "dashboard",
      }),
  });
}

export function useShop() {
  const token = useSessionToken();
  return useQuery({
    queryKey: ["shop"],
    queryFn: async () =>
      apiRequest({
        path: "/shops/current",
        token: await token(),
        schema: shopListSchema,
        cacheKey: "shop",
      }),
  });
}

export function useProducts() {
  const token = useSessionToken();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () =>
      apiRequest({
        path: "/products",
        token: await token(),
        schema: productsSchema,
        cacheKey: "products",
      }),
  });
}

export function useCustomers() {
  const token = useSessionToken();
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () =>
      apiRequest({
        path: "/customers",
        token: await token(),
        schema: customersSchema,
        cacheKey: "customers",
      }),
  });
}

export function useOrders() {
  const token = useSessionToken();
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () =>
      apiRequest({
        path: "/orders",
        token: await token(),
        schema: ordersSchema,
        cacheKey: "orders",
      }),
  });
}

export function useOrderAction(
  action: "confirm" | "mark-prepared" | "mark-handed-over" | "mark-delivered",
) {
  const token = useSessionToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      apiRequest({
        path: `/orders/${action}`,
        method: "POST",
        token: await token(),
        body: { orderId },
        schema: orderActionSchema,
      }),
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData<Order[]>(["orders"]);
      queryClient.setQueryData<Order[]>(["orders"], (current) =>
        current?.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: optimisticStatus(action),
                codPaymentStatus:
                  action === "mark-delivered" && order.paymentMethod === "COD"
                    ? "COLLECTED"
                    : order.codPaymentStatus,
              }
            : order,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["orders"], context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}

type ManualDeliveryInput = {
  orderId: string;
  courierName: string;
  courierPhoneE164?: string;
  courierNotes?: string;
};

export function useAssignManualDelivery() {
  const token = useSessionToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ManualDeliveryInput) =>
      apiRequest({
        path: "/delivery/assign",
        method: "POST",
        token: await token(),
        body: { ...input, provider: "MANUAL" },
        schema: deliveryActionSchema,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData<Order[]>(["orders"]);
      queryClient.setQueryData<Order[]>(["orders"], (current) =>
        current?.map((order) =>
          order.id === input.orderId ? { ...order, status: "HANDED_OVER" } : order,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["orders"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMarkCashRemitted() {
  const token = useSessionToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      apiRequest({
        path: "/orders/mark-cash-remitted",
        method: "POST",
        token: await token(),
        body: { orderId },
        schema: orderActionSchema,
      }),
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      const previous = queryClient.getQueryData<Order[]>(["orders"]);
      queryClient.setQueryData<Order[]>(["orders"], (current) =>
        current?.map((order) =>
          order.id === orderId ? { ...order, codPaymentStatus: "REMITTED" } : order,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["orders"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateProduct() {
  const token = useSessionToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: unknown) =>
      apiRequest({
        path: "/products",
        method: "POST",
        token: await token(),
        body: product,
        schema: productSchema,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["products"] });
      const previous = queryClient.getQueryData<Product[]>(["products"]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["products"], context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

function optimisticStatus(
  action: "confirm" | "mark-prepared" | "mark-handed-over" | "mark-delivered",
): Order["status"] {
  if (action === "confirm") return "CONFIRMED";
  if (action === "mark-prepared") return "PREPARING";
  if (action === "mark-handed-over") return "HANDED_OVER";
  return "DELIVERED";
}
