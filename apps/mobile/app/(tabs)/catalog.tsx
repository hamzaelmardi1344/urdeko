import { router } from "expo-router";
import { ImagePlus, WandSparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { useProducts } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

export default function CatalogScreen() {
  const products = useProducts();
  if (products.isLoading) return <StateView state="loading" />;
  if (products.isError) return <StateView state="error" onRetry={() => products.refetch()} />;
  return (
    <Screen>
      <Button label={t("home.addProduct")} icon={ImagePlus} onPress={() => router.push("/product-editor")} />
      {!products.data?.length ? <StateView state="empty" /> : null}
      <View className="flex-row flex-wrap gap-3">
        {products.data?.map((product) => (
          <View key={product.id} className="w-[48%] gap-2 rounded-2xl bg-white p-3">
            <Text className="text-base font-bold text-ink" numberOfLines={2} selectable>
              {product.title}
            </Text>
            <Text className="text-sm text-muted" selectable>
              {formatMAD(product.priceMAD)}
            </Text>
            <Text className="text-xs text-muted" selectable>
              {t("catalog.stock")}: {product.unlimited ? "∞" : product.stock}
            </Text>
            <Button
              label={t("catalog.generate")}
              icon={WandSparkles}
              variant="secondary"
              onPress={() => router.push({ pathname: "/product-editor", params: { id: product.id } })}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}
