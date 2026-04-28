import { useState } from "react";
import { CheckCircle2, CreditCard } from "lucide-react-native";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import { useBillingCheckout, useShop } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

export default function BillingScreen() {
  const shop = useShop();
  const checkout = useBillingCheckout();
  const [plan, setPlan] = useState<"PRO" | "BUSINESS">("PRO");
  const [email, setEmail] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    try {
      const response = await checkout.mutateAsync({ plan, customerEmail: email });
      setCheckoutUrl(response.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  if (shop.isLoading) return <StateView state="loading" />;
  if (checkoutUrl) {
    return (
      <Screen padded={false}>
        <WebView
          source={{ uri: checkoutUrl }}
          style={{ minHeight: 720 }}
          onNavigationStateChange={(state) => {
            if (state.url.includes("success") || state.url.includes("checkout.completed")) {
              shop.refetch();
            }
          }}
        />
        <View className="gap-3 p-4">
          <Button
            label={t("shop.paymentDone")}
            icon={CheckCircle2}
            onPress={() => {
              shop.refetch();
              setCheckoutUrl(null);
            }}
          />
        </View>
      </Screen>
    );
  }
  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("shop.billing")}
        </Text>
        <Text className="text-base text-muted" selectable>
          {t("shop.currentPlan")}: {shop.data?.plan ?? "FREE"}
        </Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label="Pro 99 MAD"
            variant={plan === "PRO" ? "primary" : "secondary"}
            onPress={() => setPlan("PRO")}
          />
        </View>
        <View className="flex-1">
          <Button
            label="Business"
            variant={plan === "BUSINESS" ? "primary" : "secondary"}
            onPress={() => setPlan("BUSINESS")}
          />
        </View>
      </View>
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      {error ? (
        <Text className="text-sm text-danger" selectable>
          {error}
        </Text>
      ) : null}
      <Button
        label={t("shop.upgrade")}
        icon={CreditCard}
        onPress={startCheckout}
        loading={checkout.isPending}
        disabled={!email.includes("@")}
      />
    </Screen>
  );
}
