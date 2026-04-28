import { describe, expect, it } from "vitest";
import { calculateOrderTotals, canTransitionOrder } from "./order";

describe("order state machine", () => {
  it("allows only backend-approved order transitions", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PENDING", "DELIVERED")).toBe(false);
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
