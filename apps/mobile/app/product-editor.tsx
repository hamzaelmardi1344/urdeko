import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Camera, Plus, Save, WandSparkles } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import {
  createProductInputSchema,
  type CreateProductInput,
  type Product,
  type UpsertProductVariantInput,
} from "@bep/shared-types";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import {
  useCreateProduct,
  useDeleteProduct,
  useGenerateProductCopy,
  useProducts,
  useUpdateProduct,
  useUploadProductImage,
} from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

type ProductFormInput = z.input<typeof createProductInputSchema>;

export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const products = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadProductImage = useUploadProductImage();
  const generateCopy = useGenerateProductCopy();
  const [variantName, setVariantName] = useState("");
  const [variantStock, setVariantStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const existingProduct = useMemo(
    () => products.data?.find((product) => product.id === id),
    [id, products.data],
  );
  const { control, handleSubmit, setValue, watch, reset, formState } = useForm<
    ProductFormInput,
    unknown,
    CreateProductInput
  >({
    resolver: zodResolver(createProductInputSchema),
    defaultValues: emptyProductDefaults(),
  });
  const images = watch("images") ?? [];
  const variants = watch("variants") ?? [];
  const status = watch("status");
  const title = watch("title");
  const priceMAD = watch("priceMAD");

  useEffect(() => {
    if (existingProduct) {
      reset(productToForm(existingProduct));
    }
  }, [existingProduct, reset]);

  if (id && products.isLoading) return <StateView state="loading" />;
  if (id && !existingProduct) return <StateView state="empty" />;

  async function pickImage() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    const contentType = normalizeImageMime(asset.mimeType);
    const byteSize = asset.fileSize ?? 1_000_000;
    try {
      const upload = await uploadProductImage.mutateAsync({
        fileName: asset.fileName ?? `product-${Date.now()}.jpg`,
        contentType,
        byteSize,
      });
      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();
      const uploadResponse = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(t("catalog.uploadFailed"));
      }
      setValue("images", [{ url: upload.publicUrl, position: images.length }], {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  async function improveCopy() {
    setError(null);
    try {
      const result = await generateCopy.mutateAsync({
        imageUrl: images[0]?.url,
        category: title || "Produit",
        priceMAD,
        keywords: keywordInput(title),
      });
      setValue("title", result.title_fr, { shouldDirty: true, shouldValidate: true });
      setValue("titleAr", result.title_ar, { shouldDirty: true });
      setValue("description", result.description_fr, { shouldDirty: true, shouldValidate: true });
      setValue("descriptionDarija", result.description_darija, { shouldDirty: true });
      setValue("aiGenerated", true, { shouldDirty: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  function addVariant() {
    const name = variantName.trim();
    if (!name) return;
    const nextVariant: UpsertProductVariantInput = {
      name,
      stock: Number(variantStock) || 0,
    };
    setValue("variants", [...variants, nextVariant], { shouldDirty: true, shouldValidate: true });
    setVariantName("");
    setVariantStock("0");
  }

  async function submit(values: CreateProductInput) {
    setError(null);
    try {
      if (existingProduct) {
        await updateProduct.mutateAsync({ ...values, id: existingProduct.id });
      } else {
        await createProduct.mutateAsync(values);
      }
      router.replace("/(tabs)/catalog");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    }
  }

  async function archiveProduct() {
    if (!existingProduct) return;
    await deleteProduct.mutateAsync(existingProduct.id);
    router.replace("/(tabs)/catalog");
  }

  return (
    <Screen>
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {existingProduct ? t("catalog.editProduct") : t("catalog.addProduct")}
        </Text>
        <Text className="text-sm text-muted" selectable>
          {status === "PUBLISHED" ? t("catalog.published") : t("catalog.draft")}
        </Text>
      </View>
      <View className="gap-3 rounded-2xl bg-white p-4">
        {images[0]?.url ? (
          <Image
            source={{ uri: images[0].url }}
            style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 18 }}
          />
        ) : null}
        <Button
          label={images[0]?.url ? t("catalog.changePhoto") : t("catalog.photos")}
          icon={Camera}
          variant="secondary"
          onPress={pickImage}
          loading={uploadProductImage.isPending}
        />
      </View>
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            label={t("catalog.productTitle")}
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label={t("catalog.description")}
            value={field.value}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="descriptionDarija"
        render={({ field }) => (
          <TextField
            label={t("catalog.descriptionDarija")}
            value={field.value ?? ""}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="priceMAD"
        render={({ field }) => (
          <TextField
            label={t("catalog.price")}
            value={field.value ? String(field.value / 100) : ""}
            onChangeText={(value) =>
              field.onChange(Math.round((Number(value.replace(",", ".")) || 0) * 100))
            }
            keyboardType="numeric"
          />
        )}
      />
      <Controller
        control={control}
        name="stock"
        render={({ field }) => (
          <TextField
            label={t("catalog.stock")}
            value={String(field.value)}
            onChangeText={(value) => field.onChange(Number(value) || 0)}
            keyboardType="numeric"
          />
        )}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button
            label={t("catalog.draft")}
            variant={status === "DRAFT" ? "primary" : "secondary"}
            onPress={() => setValue("status", "DRAFT", { shouldDirty: true })}
          />
        </View>
        <View className="flex-1">
          <Button
            label={t("catalog.published")}
            variant={status === "PUBLISHED" ? "primary" : "secondary"}
            onPress={() => setValue("status", "PUBLISHED", { shouldDirty: true })}
          />
        </View>
      </View>
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-xl font-bold text-ink" selectable>
          {t("catalog.variants")}
        </Text>
        {variants.map((variant, index) => (
          <Text key={`${variant.name}-${index}`} className="text-sm text-muted" selectable>
            {variant.name} · {variant.stock}
          </Text>
        ))}
        <TextField
          label={t("catalog.variantName")}
          value={variantName}
          onChangeText={setVariantName}
        />
        <TextField
          label={t("catalog.variantStock")}
          value={variantStock}
          onChangeText={setVariantStock}
          keyboardType="numeric"
        />
        <Button
          label={t("catalog.addVariant")}
          icon={Plus}
          variant="secondary"
          onPress={addVariant}
        />
      </View>
      <Button
        label={t("catalog.generate")}
        icon={WandSparkles}
        variant="secondary"
        onPress={improveCopy}
        loading={generateCopy.isPending}
      />
      {error ? (
        <Text className="text-sm text-danger" selectable>
          {error}
        </Text>
      ) : null}
      <Button
        label={t("common.save")}
        icon={Save}
        onPress={handleSubmit(submit)}
        loading={formState.isSubmitting || createProduct.isPending || updateProduct.isPending}
      />
      {existingProduct ? (
        <Button
          label={t("catalog.archive")}
          icon={Archive}
          variant="danger"
          onPress={archiveProduct}
        />
      ) : null}
    </Screen>
  );
}

function emptyProductDefaults(): ProductFormInput {
  return {
    title: "",
    description: "",
    priceMAD: 0,
    stock: 0,
    unlimited: false,
    status: "DRAFT",
    images: [],
    variants: [],
    aiGenerated: false,
  };
}

function productToForm(product: Product): ProductFormInput {
  return {
    title: product.title,
    titleAr: product.titleAr ?? undefined,
    description: product.description,
    descriptionAr: product.descriptionAr ?? undefined,
    descriptionDarija: product.descriptionDarija ?? undefined,
    priceMAD: product.priceMAD,
    comparePriceMAD: product.comparePriceMAD ?? undefined,
    stock: product.stock,
    unlimited: product.unlimited,
    status: product.status === "ARCHIVED" ? "DRAFT" : product.status,
    images: product.images.map((image) => ({ url: image.url, position: image.position })),
    variants: product.variants.map((variant) => ({
      name: variant.name,
      sku: variant.sku ?? undefined,
      priceMAD: variant.priceMAD ?? undefined,
      stock: variant.stock,
    })),
    sourceInstagramPostId: product.sourceInstagramPostId ?? undefined,
    aiGenerated: product.aiGenerated,
  };
}

function keywordInput(title: string): string[] {
  const words = title
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3);
  return words.length ? words : ["mode"];
}

function normalizeImageMime(
  value: string | undefined,
): "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif" {
  if (
    value === "image/png" ||
    value === "image/webp" ||
    value === "image/heic" ||
    value === "image/heif"
  ) {
    return value;
  }
  return "image/jpeg";
}
