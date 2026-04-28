import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: "" }} />
      <Stack.Screen name="shop-onboarding" options={{ title: "" }} />
    </Stack>
  );
}
