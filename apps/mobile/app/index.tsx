import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import { shopSchema } from "@bep/shared-types";
import { apiRequest } from "@/api/client";
import { StateView } from "@/components/state-view";

export default function IndexRoute() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const shop = useQuery({
    queryKey: ["bootstrap-shop"],
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
    queryFn: async () =>
      apiRequest({
        path: "/shops/current",
        token: await getToken(),
        schema: shopSchema,
        cacheKey: "shop",
      }),
  });

  if (!isLoaded) return <StateView state="loading" />;
  if (!isSignedIn) return <Redirect href="/(auth)/onboarding" />;
  if (shop.isLoading) return <StateView state="loading" />;
  if (shop.isError) return <Redirect href="/(auth)/shop-onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}
