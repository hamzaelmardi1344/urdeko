import { Link } from "expo-router";
import { Check, Truck } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useOrderAction, useOrders } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function OrdersScreen() {
  const orders = useOrders();
  const confirm = useOrderAction("confirm");
  const delivered = useOrderAction("mark-delivered");
  if (orders.isLoading) return <StateView state="loading" />;
  if (orders.isError) return <StateView state="error" onRetry={() => orders.refetch()} />;
  if (!orders.data?.length) return <StateView state="empty" />;
  return (
    <Screen>
      {orders.data.map((order) => (
        <Link key={order.id} href={`/orders/${order.id}`} asChild>
          <Pressable className="gap-3 rounded-2xl bg-white p-4">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-lg font-bold text-ink" selectable>
                {order.reference}
              </Text>
              <Text className="rounded-full bg-cod px-3 py-1 text-xs font-bold text-ink" selectable>
                {order.status}
              </Text>
            </View>
            <Text className="text-base text-muted" selectable>
              {formatMAD(order.totalMAD)}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label={t("orders.confirm")} icon={Check} onPress={() => confirm.mutate(order.id)} />
              </View>
              <View className="flex-1">
                <Button
                  label={t("orders.delivered")}
                  icon={Truck}
                  variant="secondary"
                  onPress={() => delivered.mutate(order.id)}
                />
              </View>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
