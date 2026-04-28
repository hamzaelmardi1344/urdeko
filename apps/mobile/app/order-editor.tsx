import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Save, ShoppingCart } from "lucide-react-native";
import { Text, View } from "react-native";
import type { OrderSource } from "@bep/shared-types";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import { useCreateCustomer, useCreateOrder, useProducts } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function OrderEditorScreen() {
  const products = useProducts();
  const createCustomer = useCreateCustomer();
  const createOrder = useCreateOrder();
  const [source, setSource] = useState<OrderSource>("WHATSAPP");
  const [fullName, setFullName] = useState("");
  const [phoneE164, setPhoneE164] = useState("+212");
  const [city, setCity] = useState("Casablanca");
  const [addressLine, setAddressLine] = useState("");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [deliveryMAD, setDeliveryMAD] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const selectedProduct = useMemo(
    () => products.data?.find((product) => product.id === productId),
    [productId, products.data],
  );
  const totalMAD =
    (selectedProduct?.priceMAD ?? 0) * (Number(quantity) || 1) +
    Math.round((Number(deliveryMAD) || 0) * 100);

  if (products.isLoading) return <StateView state="loading" />;
  if (products.isError) return <StateView state="error" onRetry={() => products.refetch()} />;
  if (!products.data?.length) return <StateView state="empty" />;

  async function submit() {
    setError(null);
    try {
      if (!productId) throw new Error(t("orders.pickProduct"));
      const customer = await createCustomer.mutateAsync({
        fullName,
        phoneE164,
        city,
        addressLine,
        notes: notes || undefined,
      });
      await createOrder.mutateAsync({
        customerId: customer.id,
        paymentMethod: "COD",
        source,
        deliveryMAD: Math.round((Number(deliveryMAD) || 0) * 100),
        discountMAD: 0,
        items: [{ productId, quantity: Number(quantity) || 1 }],
      });
      router.replace("/(tabs)/orders");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("orders.newOrder")}
        </Text>
        <Text className="text-sm text-muted" selectable>
          COD · {formatMAD(totalMAD)}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label={t("orders.whatsapp")}
            variant={source === "WHATSAPP" ? "primary" : "secondary"}
            onPress={() => setSource("WHATSAPP")}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("orders.instagramDm")}
            variant={source === "INSTAGRAM_DM" ? "primary" : "secondary"}
            onPress={() => setSource("INSTAGRAM_DM")}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("orders.manual")}
            variant={source === "MANUAL" ? "primary" : "secondary"}
            onPress={() => setSource("MANUAL")}
          />
        </View>
      </View>
      <TextField label={t("customers.fullName")} value={fullName} onChangeText={setFullName} />
      <TextField
        label={t("customers.phone")}
        value={phoneE164}
        onChangeText={setPhoneE164}
        keyboardType="phone-pad"
      />
      <TextField label={t("onboarding.city")} value={city} onChangeText={setCity} />
      <TextField
        label={t("customers.address")}
        value={addressLine}
        onChangeText={setAddressLine}
        multiline
      />
      <TextField label={t("orders.note")} value={notes} onChangeText={setNotes} multiline />
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-xl font-bold text-ink" selectable>
          {t("orders.product")}
        </Text>
        {products.data.map((product) => (
          <Button
            key={product.id}
            label={`${product.title} · ${formatMAD(product.priceMAD)}`}
            icon={ShoppingCart}
            variant={productId === product.id ? "primary" : "secondary"}
            onPress={() => setProductId(product.id)}
          />
        ))}
      </View>
      <TextField
        label={t("orders.quantity")}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <TextField
        label={t("orders.deliveryFee")}
        value={deliveryMAD}
        onChangeText={setDeliveryMAD}
        keyboardType="numeric"
      />
      {error ? (
        <Text className="text-sm text-danger" selectable>
          {error}
        </Text>
      ) : null}
      <Button
        label={t("common.save")}
        icon={Save}
        onPress={submit}
        loading={createCustomer.isPending || createOrder.isPending}
      />
    </Screen>
  );
}
