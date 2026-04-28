import { describe, expect, it } from "vitest";
import { calculateOrderTotals, canTransitionOrder, createOrderInputSchema } from "./order";
import { canCreateOrderForPlan } from "./shop";

describe("order state machine", () => {
  it("allows only backend-approved order transitions", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PENDING", "DELIVERED")).toBe(false);
    expect(canTransitionOrder("HANDED_OVER", "DELIVERED")).toBe(true);
    expect(canTransitionOrder("DELIVERED", "RETURNED")).toBe(false);
  });
});

describe("order totals", () => {
  it("calculates subtotal and clamps totals to zero", () => {
    expect(
      calculateOrderTotals({
        items: [
          { unitPriceMAD: 10_000, quantity: 2 },
          { unitPriceMAD: 4_500, quantity: 1 },
        ],
        deliveryMAD: 2_000,
        discountMAD: 1_000,
      }),
    ).toEqual({ subtotalMAD: 24_500, totalMAD: 25_500 });

    expect(
      calculateOrderTotals({
        items: [{ unitPriceMAD: 1_000, quantity: 1 }],
        deliveryMAD: 0,
        discountMAD: 2_000,
      }),
    ).toEqual({ subtotalMAD: 1_000, totalMAD: 0 });
  });
});

describe("paid v1 order contracts", () => {
  it("defaults social orders to WhatsApp and COD", () => {
    const parsed = createOrderInputSchema.parse({
      customerId: "cm2s4c3zx000001l8a9zmf1bp",
      items: [{ productId: "cm2s4c3zx000101l8swh3io2v", quantity: 1 }],
    });

    expect(parsed.paymentMethod).toBe("COD");
    expect(parsed.source).toBe("WHATSAPP");
  });

  it("keeps the Free plan capped at the monthly order quota", () => {
    expect(
      canCreateOrderForPlan({ plan: "FREE", monthlyOrderQuota: 20, ordersThisMonth: 19 }),
    ).toBe(true);
    expect(
      canCreateOrderForPlan({ plan: "FREE", monthlyOrderQuota: 20, ordersThisMonth: 20 }),
    ).toBe(false);
    expect(
      canCreateOrderForPlan({ plan: "PRO", monthlyOrderQuota: 20, ordersThisMonth: 200 }),
    ).toBe(true);
  });
});
