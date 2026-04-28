import { useLocalSearchParams } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useCustomer } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customer = useCustomer(id);
  if (customer.isLoading) return <StateView state="loading" />;
  if (customer.isError) return <StateView state="error" onRetry={() => customer.refetch()} />;
  if (!customer.data) return <StateView state="empty" />;
  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {customer.data.fullName}
        </Text>
        <Text className="text-sm text-muted" selectable>
          {customer.data.segment} · {customer.data.phoneE164} · {customer.data.city}
        </Text>
        <Text className="text-sm text-muted" selectable>
          {t("customers.totalOrders")}: {customer.data.totalOrders} · {t("customers.spent")}:{" "}
          {formatMAD(customer.data.totalSpentMAD)}
        </Text>
      </View>
      <Button
        label={t("customers.openWhatsapp")}
        icon={MessageCircle}
        onPress={() => Linking.openURL(`https://wa.me/${customer.data.phoneE164.replace("+", "")}`)}
      />
      <Text className="text-xl font-bold text-ink" selectable>
        {t("customers.history")}
      </Text>
      {!customer.data.orders.length ? <StateView state="empty" /> : null}
      {customer.data.orders.map((order) => (
        <View key={order.id} className="gap-2 rounded-2xl bg-white p-4">
          <Text className="font-bold text-ink" selectable>
            {order.reference}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {order.status} · {formatMAD(order.totalMAD)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
