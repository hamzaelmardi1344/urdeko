import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { createShopInputSchema, type CreateShopInput, shopSchema } from "@bep/shared-types";
import { apiRequest } from "@/api/client";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n/i18n";
import { useAppStore } from "@/state/use-app-store";

export default function ShopOnboardingScreen() {
  const { getToken } = useAuth();
  const setShopId = useAppStore((state) => state.setShopId);
  const { control, handleSubmit, formState } = useForm<CreateShopInput>({
    resolver: zodResolver(createShopInputSchema),
    defaultValues: {
      name: "",
      slug: "",
      city: "Casablanca",
      whatsappNumber: "+212",
      instagramHandle: "",
    },
  });

  async function submit(values: CreateShopInput) {
    const token = await getToken();
    const shop = await apiRequest({
      path: "/shops",
      method: "POST",
      token,
      body: values,
      schema: shopSchema,
    });
    setShopId(shop.id);
    router.replace("/(tabs)/home");
  }
  const fields: Array<{ name: keyof CreateShopInput; label: string }> = [
    { name: "name", label: t("onboarding.shopName") },
    { name: "slug", label: t("onboarding.slug") },
    { name: "city", label: t("onboarding.city") },
    { name: "whatsappNumber", label: t("onboarding.whatsapp") },
    { name: "instagramHandle", label: t("onboarding.instagram") },
  ];

  return (
    <Screen>
      <Text className="text-2xl font-bold text-ink" selectable>
        {t("onboarding.shopTitle")}
      </Text>
      <View className="gap-4">
        {fields.map((field) => (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: { value, onChange } }) => (
              <TextField label={field.label} value={String(value ?? "")} onChangeText={onChange} />
            )}
          />
        ))}
      </View>
      <Button
        label={t("common.save")}
        onPress={handleSubmit(submit)}
        loading={formState.isSubmitting}
      />
    </Screen>
  );
}
