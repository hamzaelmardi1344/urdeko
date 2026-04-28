import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Check, FileText, HandCoins, PackageCheck, Truck } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import {
  useAssignManualDelivery,
  useMarkCashRemitted,
  useOrderAction,
  useOrders,
} from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [courierNotes, setCourierNotes] = useState("");
  const orders = useOrders();
  const confirm = useOrderAction("confirm");
  const prepare = useOrderAction("mark-prepared");
  const delivered = useOrderAction("mark-delivered");
  const assignManualDelivery = useAssignManualDelivery();
  const cashRemitted = useMarkCashRemitted();
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
        <Text className="text-sm text-muted" selectable>
          {t("orders.source")}: {sourceLabel(order.source)} · {t("orders.cash")}:{" "}
          {cashStatusLabel(order.codPaymentStatus)}
        </Text>
        {order.customer ? (
          <Text className="text-sm text-muted" selectable>
            {order.customer.fullName} · {order.customer.phoneE164} · {order.customer.city}
          </Text>
        ) : null}
      </View>
      <Button
        label={t("orders.confirm")}
        icon={Check}
        disabled={order.status !== "PENDING"}
        loading={confirm.isPending}
        onPress={() => confirm.mutate(order.id)}
      />
      <Button
        label={t("orders.prepare")}
        icon={PackageCheck}
        variant="secondary"
        disabled={order.status !== "CONFIRMED"}
        loading={prepare.isPending}
        onPress={() => prepare.mutate(order.id)}
      />
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-xl font-bold text-ink" selectable>
          {t("orders.assignManual")}
        </Text>
        <TextField
          label={t("orders.courierName")}
          value={courierName}
          onChangeText={setCourierName}
        />
        <TextField
          label={t("orders.courierPhone")}
          value={courierPhone}
          onChangeText={setCourierPhone}
          placeholder="+2126..."
          keyboardType="phone-pad"
        />
        <TextField
          label={t("orders.courierNotes")}
          value={courierNotes}
          onChangeText={setCourierNotes}
          multiline
        />
        {order.delivery?.courierName ? (
          <Text className="text-sm text-muted" selectable>
            {order.delivery.courierName}
            {order.delivery.courierPhoneE164 ? ` · ${order.delivery.courierPhoneE164}` : ""}
          </Text>
        ) : null}
        <Button
          label={t("orders.handover")}
          icon={Truck}
          variant="secondary"
          disabled={courierName.trim().length < 2 || order.status !== "PREPARING"}
          loading={assignManualDelivery.isPending}
          onPress={() =>
            assignManualDelivery.mutate({
              orderId: order.id,
              courierName: courierName.trim(),
              courierPhoneE164: courierPhone.trim() || undefined,
              courierNotes: courierNotes.trim() || undefined,
            })
          }
        />
      </View>
      <Button
        label={t("orders.delivered")}
        icon={Check}
        variant="secondary"
        disabled={order.status !== "HANDED_OVER" && order.status !== "IN_TRANSIT"}
        loading={delivered.isPending}
        onPress={() => delivered.mutate(order.id)}
      />
      <Button
        label={t("orders.markCashRemitted")}
        icon={HandCoins}
        variant="secondary"
        disabled={order.codPaymentStatus !== "COLLECTED"}
        loading={cashRemitted.isPending}
        onPress={() => cashRemitted.mutate(order.id)}
      />
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

function sourceLabel(source: "PUBLIC_LINK" | "INSTAGRAM_DM" | "WHATSAPP" | "MANUAL"): string {
  if (source === "PUBLIC_LINK") return t("orders.publicLink");
  if (source === "INSTAGRAM_DM") return t("orders.instagramDm");
  if (source === "WHATSAPP") return t("orders.whatsapp");
  return t("orders.manual");
}

function cashStatusLabel(
  status: "PENDING" | "COLLECTED" | "REMITTED" | "RETURNED" | "NOT_APPLICABLE",
): string {
  if (status === "PENDING") return t("orders.cashPending");
  if (status === "COLLECTED") return t("orders.cashCollected");
  if (status === "REMITTED") return t("orders.cashRemitted");
  return t("orders.cashNotApplicable");
}
