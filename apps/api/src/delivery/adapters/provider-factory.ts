import type { DeliveryProvider } from "@bep/shared-types";
import { EnvService } from "../../config/env.service";
import { HttpDeliveryAdapter } from "./http-delivery-adapter";
import { ManualDeliveryAdapter } from "./manual-delivery-adapter";
import type { DeliveryProviderAdapter } from "./delivery-provider-adapter";

export function createDeliveryAdapter(provider: DeliveryProvider, env: EnvService): DeliveryProviderAdapter {
  if (provider === "AMANA") {
    return new HttpDeliveryAdapter("AMANA", env.get("AMANA_API_BASE_URL") ?? "", {
      createShipmentPath: "/shipments",
      shipmentPath: (id) => `/shipments/${encodeURIComponent(id)}`,
      cancelPath: (id) => `/shipments/${encodeURIComponent(id)}/cancel`,
      ratePath: (input) =>
        `/rates?from=${encodeURIComponent(input.fromCity)}&to=${encodeURIComponent(
          input.toCity,
        )}&weight=${input.weightGrams}`,
    });
  }
  if (provider === "SPEEDAF") {
    return new HttpDeliveryAdapter("SPEEDAF", env.get("SPEEDAF_API_BASE_URL") ?? "", {
      createShipmentPath: "/shipments",
      shipmentPath: (id) => `/shipments/${encodeURIComponent(id)}`,
      cancelPath: (id) => `/shipments/${encodeURIComponent(id)}/cancel`,
      ratePath: (input) =>
        `/rates?origin=${encodeURIComponent(input.fromCity)}&destination=${encodeURIComponent(
          input.toCity,
        )}&weight=${input.weightGrams}`,
    });
  }
  if (provider === "SENDIT") {
    return new HttpDeliveryAdapter("SENDIT", env.get("SENDIT_API_BASE_URL") ?? "", {
      createShipmentPath: "/shipments",
      shipmentPath: (id) => `/shipments/${encodeURIComponent(id)}`,
      cancelPath: (id) => `/shipments/${encodeURIComponent(id)}/cancel`,
      ratePath: (input) =>
        `/rates?from=${encodeURIComponent(input.fromCity)}&to=${encodeURIComponent(
          input.toCity,
        )}&weight=${input.weightGrams}`,
    });
  }
  return new ManualDeliveryAdapter();
}
