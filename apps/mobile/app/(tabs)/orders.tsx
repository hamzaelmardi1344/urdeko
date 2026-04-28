import { Link, router } from "expo-router";
import { Check, Plus, Truck } from "lucide-react-native";
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
  return (
    <Screen>
      <Button
        label={t("orders.newOrder")}
        icon={Plus}
        onPress={() => router.push("/order-editor")}
      />
      {!orders.data?.length ? <StateView state="empty" /> : null}
      {orders.data?.map((order) => (
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
            <View className="flex-row flex-wrap gap-2">
              <Text
                className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
                selectable
              >
                {sourceLabel(order.source)}
              </Text>
              <Text
                className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
                selectable
              >
                {cashStatusLabel(order.codPaymentStatus)}
              </Text>
              <Text
                className="rounded-full bg-surface-warm px-3 py-1 text-xs font-semibold text-muted"
                selectable
              >
                {formatMAD(order.totalMAD)}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label={t("orders.confirm")}
                  icon={Check}
                  disabled={order.status !== "PENDING"}
                  onPress={() => confirm.mutate(order.id)}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t("orders.delivered")}
                  icon={Truck}
                  variant="secondary"
                  disabled={order.status !== "HANDED_OVER" && order.status !== "IN_TRANSIT"}
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

function sourceLabel(source: OrderSourceLabelInput): string {
  if (source === "PUBLIC_LINK") return t("orders.publicLink");
  if (source === "INSTAGRAM_DM") return t("orders.instagramDm");
  if (source === "WHATSAPP") return t("orders.whatsapp");
  return t("orders.manual");
}

function cashStatusLabel(status: CashStatusLabelInput): string {
  if (status === "PENDING") return t("orders.cashPending");
  if (status === "COLLECTED") return t("orders.cashCollected");
  if (status === "REMITTED") return t("orders.cashRemitted");
  return t("orders.cashNotApplicable");
}

type OrderSourceLabelInput = "PUBLIC_LINK" | "INSTAGRAM_DM" | "WHATSAPP" | "MANUAL";
type CashStatusLabelInput = "PENDING" | "COLLECTED" | "REMITTED" | "RETURNED" | "NOT_APPLICABLE";
