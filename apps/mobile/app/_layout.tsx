import "../global.css";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as Notifications from "expo-notifications";
import { PostHogProvider } from "posthog-react-native";
import { useEffect, useMemo } from "react";
import { trpc } from "@/api/trpc";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
});

function RootLayout() {
  useEffect(() => {
    Notifications.setNotificationChannelAsync("orders", {
      name: "Commandes",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E8417F",
    }).catch((error: unknown) => Sentry.captureException(error));
    Notifications.requestPermissionsAsync().catch((error: unknown) =>
      Sentry.captureException(error),
    );
  }, []);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      }),
    [],
  );
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/trpc`,
          }),
        ],
      }),
    [],
  );
  const content = (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
      tokenCache={tokenCache}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="orders/[id]" options={{ title: "Commande" }} />
            <Stack.Screen name="customers/[id]" options={{ title: "Cliente" }} />
            <Stack.Screen
              name="order-editor"
              options={{ presentation: "modal", title: "Nouvelle commande" }}
            />
            <Stack.Screen
              name="product-editor"
              options={{ presentation: "modal", title: "Produit" }}
            />
            <Stack.Screen name="delivery-integration" options={{ title: "Livraison" }} />
            <Stack.Screen name="integrations" options={{ title: "Intégrations" }} />
            <Stack.Screen name="whatsapp-templates" options={{ title: "WhatsApp" }} />
            <Stack.Screen name="billing" options={{ title: "Plan Pro" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="store-preview" options={{ title: "Boutique publique" }} />
          </Stack>
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!posthogKey) return content;
  return (
    <PostHogProvider apiKey={posthogKey} options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}>
      {content}
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
