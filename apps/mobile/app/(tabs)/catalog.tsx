import { useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ImagePlus, Instagram, Search, WandSparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import {
  useInstagramConnect,
  useInstagramImport,
  useInstagramOAuthUrl,
  useProducts,
} from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";
import { formatMAD } from "@/utils/money";

type CatalogFilter = "ALL" | "DRAFT" | "PUBLISHED";

WebBrowser.maybeCompleteAuthSession();

export default function CatalogScreen() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CatalogFilter>("ALL");
  const [error, setError] = useState<string | null>(null);
  const redirectUri = makeRedirectUri({ scheme: "jibi", path: "instagram-callback" });
  const products = useProducts();
  const instagramOAuthUrl = useInstagramOAuthUrl(redirectUri);
  const instagramConnect = useInstagramConnect();
  const instagramImport = useInstagramImport();
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      products.data?.filter((product) => {
        const matchesFilter = filter === "ALL" || product.status === filter;
        const matchesQuery =
          !normalizedQuery ||
          product.title.toLowerCase().includes(normalizedQuery) ||
          product.description.toLowerCase().includes(normalizedQuery);
        return matchesFilter && matchesQuery;
      }) ?? []
    );
  }, [filter, products.data, query]);

  async function importInstagram() {
    setError(null);
    try {
      const oauth = await instagramOAuthUrl.refetch();
      if (!oauth.data) throw new Error(t("common.error"));
      const result = await WebBrowser.openAuthSessionAsync(oauth.data.url, redirectUri);
      if (result.type !== "success") return;
      const callback = new URL(result.url);
      const state = callback.searchParams.get("state");
      if (state !== oauth.data.state) throw new Error(t("catalog.instagramStateMismatch"));
      const code = callback.searchParams.get("code");
      if (!code) throw new Error(t("catalog.instagramMissingCode"));
      await instagramConnect.mutateAsync({ code, redirectUri, state: oauth.data.state });
      const imported = await instagramImport.mutateAsync();
      setError(t("catalog.instagramImported", { count: imported.imported }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  if (products.isLoading) return <StateView state="loading" />;
  if (products.isError) return <StateView state="error" onRetry={() => products.refetch()} />;
  return (
    <Screen>
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("catalog.title")}
        </Text>
        <TextField label={t("common.search")} value={query} onChangeText={setQuery} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label={t("catalog.all")}
              variant={filter === "ALL" ? "primary" : "secondary"}
              onPress={() => setFilter("ALL")}
            />
          </View>
          <View className="flex-1">
            <Button
              label={t("catalog.draft")}
              variant={filter === "DRAFT" ? "primary" : "secondary"}
              onPress={() => setFilter("DRAFT")}
            />
          </View>
          <View className="flex-1">
            <Button
              label={t("catalog.published")}
              variant={filter === "PUBLISHED" ? "primary" : "secondary"}
              onPress={() => setFilter("PUBLISHED")}
            />
          </View>
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label={t("catalog.addProduct")}
            icon={ImagePlus}
            onPress={() => router.push("/product-editor")}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("home.importIg")}
            icon={Instagram}
            variant="secondary"
            onPress={importInstagram}
            loading={
              instagramConnect.isPending ||
              instagramImport.isPending ||
              instagramOAuthUrl.isFetching
            }
          />
        </View>
      </View>
      {error ? (
        <Text className="text-sm text-muted" selectable>
          {error}
        </Text>
      ) : null}
      {!filteredProducts.length ? <StateView state="empty" /> : null}
      <View className="flex-row flex-wrap gap-3">
        {filteredProducts.map((product) => (
          <View key={product.id} className="w-[48%] gap-2 rounded-2xl bg-white p-3">
            {product.images[0]?.url ? (
              <Image
                source={{ uri: product.images[0].url }}
                style={{ width: "100%", aspectRatio: 1, borderRadius: 14 }}
              />
            ) : (
              <View className="aspect-square items-center justify-center rounded-2xl bg-surface-warm">
                <Search size={24} color="#5C6470" />
              </View>
            )}
            <Text className="text-base font-bold text-ink" numberOfLines={2} selectable>
              {product.title}
            </Text>
            <Text className="text-sm text-muted" selectable>
              {formatMAD(product.priceMAD)}
            </Text>
            <Text className="text-xs text-muted" selectable>
              {product.status} · {t("catalog.stock")}: {product.unlimited ? "∞" : product.stock}
            </Text>
            <Button
              label={product.aiGenerated ? t("catalog.editProduct") : t("catalog.generate")}
              icon={WandSparkles}
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/product-editor", params: { id: product.id } })
              }
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}
