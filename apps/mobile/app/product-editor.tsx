import * as ImagePicker from "expo-image-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Save } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { createProductInputSchema, type CreateProductInput } from "@bep/shared-types";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { useCreateProduct } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

export default function ProductEditorScreen() {
  const createProduct = useCreateProduct();
  const { control, handleSubmit, setValue, watch, formState } = useForm<
    z.input<typeof createProductInputSchema>,
    unknown,
    CreateProductInput
  >({
    resolver: zodResolver(createProductInputSchema),
    defaultValues: {
      title: "",
      description: "",
      priceMAD: 0,
      stock: 0,
      unlimited: false,
      status: "DRAFT",
      images: [],
      variants: [],
      aiGenerated: false,
    },
  });
  const images = watch("images");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) setValue("images", [{ url: uri, position: 0 }], { shouldValidate: true });
    }
  }

  async function submit(values: CreateProductInput) {
    await createProduct.mutateAsync(values);
  }

  return (
    <Screen>
      <Text className="text-2xl font-bold text-ink" selectable>
        {t("catalog.title")}
      </Text>
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField label={t("onboarding.shopName")} value={field.value} onChangeText={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField label={t("catalog.generate")} value={field.value} onChangeText={field.onChange} multiline />
        )}
      />
      <Controller
        control={control}
        name="priceMAD"
        render={({ field }) => (
          <TextField
            label={t("catalog.price")}
            value={String(field.value)}
            onChangeText={(value) => field.onChange(Number(value) * 100)}
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
            onChangeText={(value) => field.onChange(Number(value))}
            keyboardType="numeric"
          />
        )}
      />
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="font-semibold text-ink" selectable>
          {t("catalog.photos")}: {images.length}
        </Text>
        <Button label={t("catalog.photos")} icon={Camera} variant="secondary" onPress={pickImage} />
      </View>
      <Button
        label={t("common.save")}
        icon={Save}
        onPress={handleSubmit(submit)}
        loading={formState.isSubmitting || createProduct.isPending}
      />
    </Screen>
  );
}
