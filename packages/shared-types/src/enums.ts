import { z } from "zod";

export const planSchema = z.enum(["FREE", "PRO", "BUSINESS"]);
export const shopStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]);
export const productStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "OUT_OF_STOCK"]);
export const orderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "HANDED_OVER",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
  "ABANDONED",
]);
export const paymentMethodSchema = z.enum(["COD", "CARD", "WALLET"]);
export const orderEventTypeSchema = z.enum([
  "CREATED",
  "CONFIRMED",
  "PREPARED",
  "HANDED_OVER",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
  "REMINDER_SENT",
  "NOTE_ADDED",
]);
export const deliveryProviderSchema = z.enum(["AMANA", "SPEEDAF", "SENDIT", "MANUAL"]);
export const whatsappTemplateTypeSchema = z.enum([
  "ORDER_CONFIRMATION",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "CART_ABANDONED",
  "REVIEW_REQUEST",
]);
export const localeSchema = z.enum(["fr", "ar", "darija"]);

export type Plan = z.infer<typeof planSchema>;
export type ShopStatus = z.infer<typeof shopStatusSchema>;
export type ProductStatus = z.infer<typeof productStatusSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type OrderEventType = z.infer<typeof orderEventTypeSchema>;
export type DeliveryProvider = z.infer<typeof deliveryProviderSchema>;
export type WhatsappTemplateType = z.infer<typeof whatsappTemplateTypeSchema>;
export type Locale = z.infer<typeof localeSchema>;
