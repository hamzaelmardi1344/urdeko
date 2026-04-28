import { router } from "expo-router";
import { ImagePlus, Instagram, Store } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { MetricCard } from "@/components/metric-card";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useDashboard } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function HomeScreen() {
  const dashboard = useDashboard();
  if (dashboard.isLoading) return <StateView state="loading" />;
  if (dashboard.isError) return <StateView state="error" onRetry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  if (!data) return <StateView state="empty" />;
  return (
    <Screen>
      <View className="flex-row gap-3">
        <MetricCard label={t("home.pending")} value={String(data.pendingOrders)} />
        <MetricCard label={t("home.todayRevenue")} value={formatMAD(data.todayRevenueMAD)} tone="success" />
      </View>
      <MetricCard label={t("home.monthRevenue")} value={formatMAD(data.monthRevenueMAD)} tone="warning" />
      <Text className="text-xl font-bold text-ink" selectable>
        {t("home.shortcuts")}
      </Text>
      <Button label={t("home.addProduct")} icon={ImagePlus} onPress={() => router.push("/product-editor")} />
      <Button label={t("home.importIg")} icon={Instagram} variant="secondary" onPress={() => router.push("/(tabs)/catalog")} />
      <Button label={t("home.previewShop")} icon={Store} variant="secondary" onPress={() => router.push("/store-preview")} />
    </Screen>
  );
}
