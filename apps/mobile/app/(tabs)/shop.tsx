import { router } from "expo-router";
import { Bell, CreditCard, MessageCircle, Plug, Store, Truck } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useShop } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

export default function ShopScreen() {
  const shop = useShop();
  if (shop.isLoading) return <StateView state="loading" />;
  if (shop.isError) return <StateView state="error" onRetry={() => shop.refetch()} />;
  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {shop.data?.name ?? t("shop.title")}
        </Text>
        <Text className="text-base text-muted" selectable>
          {shop.data?.slug} · {shop.data?.city}
        </Text>
        <Text className="text-sm text-muted" selectable>
          {t("shop.currentPlan")}: {shop.data?.plan ?? "FREE"}
        </Text>
      </View>
      <Button label={t("shop.billing")} icon={CreditCard} onPress={() => router.push("/billing")} />
      <Button
        label={t("home.previewShop")}
        icon={Store}
        variant="secondary"
        onPress={() => router.push("/store-preview")}
      />
      <Button
        label={t("shop.integrations")}
        icon={Plug}
        variant="secondary"
        onPress={() => router.push("/integrations")}
      />
      <Button
        label={t("shop.delivery")}
        icon={Truck}
        variant="secondary"
        onPress={() => router.push("/delivery-integration")}
      />
      <Button
        label={t("shop.whatsapp")}
        icon={MessageCircle}
        variant="secondary"
        onPress={() => router.push("/whatsapp-templates")}
      />
      <Button
        label={t("shop.notifications")}
        icon={Bell}
        variant="secondary"
        onPress={() => router.push("/notifications")}
      />
    </Screen>
  );
}
