import { useLocalSearchParams } from "expo-router";
import { Check, FileText, PackageCheck, Truck } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useOrderAction, useOrders } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useOrders();
  const confirm = useOrderAction("confirm");
  const prepare = useOrderAction("mark-prepared");
  const handover = useOrderAction("mark-handed-over");
  const delivered = useOrderAction("mark-delivered");
  if (orders.isLoading) return <StateView state="loading" />;
  const order = orders.data?.find((candidate) => candidate.id === id);
  if (!order) return <StateView state="empty" />;
  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {order.reference}
        </Text>
        <Text className="text-base text-muted" selectable>
          {order.status} · {formatMAD(order.totalMAD)}
        </Text>
      </View>
      <Button label={t("orders.confirm")} icon={Check} onPress={() => confirm.mutate(order.id)} />
      <Button label={t("orders.prepare")} icon={PackageCheck} variant="secondary" onPress={() => prepare.mutate(order.id)} />
      <Button label={t("orders.handover")} icon={Truck} variant="secondary" onPress={() => handover.mutate(order.id)} />
      <Button label={t("orders.delivered")} icon={Check} variant="secondary" onPress={() => delivered.mutate(order.id)} />
      <Text className="text-xl font-bold text-ink" selectable>
        {t("orders.timeline")}
      </Text>
      {order.events.map((event) => (
        <View key={event.id} className="flex-row gap-3 rounded-2xl bg-white p-4">
          <FileText size={20} color="#E8417F" />
          <View className="flex-1">
            <Text className="font-semibold text-ink" selectable>
              {event.type}
            </Text>
            <Text className="text-sm text-muted" selectable>
              {new Date(event.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}
