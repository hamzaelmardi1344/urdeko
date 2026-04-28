import { z } from "zod";
import {
  cuidSchema,
  e164PhoneSchema,
  isoDateStringSchema,
  madCentsSchema,
  nonEmptyStringSchema,
} from "./common";
import { customerSchema } from "./customer";
import { deliverySchema } from "./delivery";
import {
  codPaymentStatusSchema,
  orderEventTypeSchema,
  orderSourceSchema,
  orderStatusSchema,
  paymentMethodSchema,
  reminderStatusSchema,
} from "./enums";

export const orderItemInputSchema = z.object({
  productId: cuidSchema,
  variantId: cuidSchema.optional(),
  quantity: z.number().int().min(1).max(999),
});

export const orderItemSchema = z.object({
  id: cuidSchema,
  orderId: cuidSchema,
  productId: cuidSchema,
  variantId: cuidSchema.nullable(),
  titleSnapshot: nonEmptyStringSchema,
  imageUrlSnapshot: z.string().url().nullable(),
  unitPriceMAD: madCentsSchema,
  quantity: z.number().int().min(1),
  totalMAD: madCentsSchema,
});

export const orderEventSchema = z.object({
  id: cuidSchema,
  orderId: cuidSchema,
  type: orderEventTypeSchema,
  meta: z.record(z.unknown()).nullable(),
  createdAt: isoDateStringSchema,
});

export const orderSchema = z.object({
  id: cuidSchema,
  shopId: cuidSchema,
  customerId: cuidSchema,
  reference: z.string().regex(/^BEP-\d{4}-[A-Z0-9]{6}$/),
  status: orderStatusSchema,
  paymentMethod: paymentMethodSchema,
  source: orderSourceSchema,
  codPaymentStatus: codPaymentStatusSchema,
  reminderStatus: reminderStatusSchema,
  reminderCount: z.number().int().nonnegative(),
  lastReminderAt: isoDateStringSchema.nullable(),
  subtotalMAD: madCentsSchema,
  deliveryMAD: madCentsSchema,
  discountMAD: madCentsSchema,
  totalMAD: madCentsSchema,
  items: z.array(orderItemSchema),
  events: z.array(orderEventSchema),
  customer: customerSchema.optional(),
  delivery: deliverySchema.nullable().optional(),
  abandonedAt: isoDateStringSchema.nullable(),
  recoveredAt: isoDateStringSchema.nullable(),
  createdAt: isoDateStringSchema,
  updatedAt: isoDateStringSchema,
});

export const createOrderInputSchema = z.object({
  customerId: cuidSchema,
  paymentMethod: paymentMethodSchema.default("COD"),
  source: orderSourceSchema.default("WHATSAPP"),
  deliveryMAD: madCentsSchema.default(0),
  discountMAD: madCentsSchema.default(0),
  items: z.array(orderItemInputSchema).min(1).max(100),
});

export const orderActionInputSchema = z.object({
  orderId: cuidSchema,
  note: z.string().max(1000).optional(),
});

export const assignDeliveryInputSchema = z.object({
  orderId: cuidSchema,
  provider: z.enum(["AMANA", "SPEEDAF", "SENDIT", "MANUAL"]),
  pickupAt: isoDateStringSchema.optional(),
  courierName: z.string().trim().min(2).max(120).optional(),
  courierPhoneE164: e164PhoneSchema.optional(),
  courierNotes: z.string().trim().max(1000).optional(),
});

type SharedOrderStatus = z.infer<typeof orderStatusSchema>;

export const allowedOrderTransitions: Record<SharedOrderStatus, readonly SharedOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "ABANDONED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["HANDED_OVER", "CANCELLED"],
  HANDED_OVER: ["IN_TRANSIT", "DELIVERED", "RETURNED"],
  IN_TRANSIT: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
  ABANDONED: ["PENDING", "CANCELLED"],
};

export function canTransitionOrder(
  from: z.infer<typeof orderStatusSchema>,
  to: z.infer<typeof orderStatusSchema>,
): boolean {
  return allowedOrderTransitions[from].includes(to);
}

export function calculateOrderTotals(input: {
  items: Array<{ unitPriceMAD: number; quantity: number }>;
  deliveryMAD: number;
  discountMAD: number;
}): { subtotalMAD: number; totalMAD: number } {
  const subtotalMAD = input.items.reduce((sum, item) => sum + item.unitPriceMAD * item.quantity, 0);
  const totalMAD = Math.max(0, subtotalMAD + input.deliveryMAD - input.discountMAD);
  return { subtotalMAD, totalMAD };
}

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderEvent = z.infer<typeof orderEventSchema>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type OrderActionInput = z.infer<typeof orderActionInputSchema>;
export type AssignDeliveryInput = z.infer<typeof assignDeliveryInputSchema>;
