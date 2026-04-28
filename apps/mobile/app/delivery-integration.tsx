import { useAuth } from "@clerk/clerk-expo";
import { z } from "zod";
import { useState } from "react";
import { KeyRound } from "lucide-react-native";
import { Text, View } from "react-native";
import { apiRequest } from "@/api/client";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n/i18n";

const deliveryConfigSchema = z.object({ id: z.string() });

export default function DeliveryIntegrationScreen() {
  const { getToken } = useAuth();
  const [provider, setProvider] = useState("AMANA");
  const [pickupCity, setPickupCity] = useState("Casablanca");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await apiRequest({
        path: "/delivery/configure",
        method: "POST",
        token: await getToken(),
        body: { provider, pickupCity, apiKey },
        schema: deliveryConfigSchema,
      });
      setStatus(t("common.save"));
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("shop.delivery")}
        </Text>
        <Text className="text-base text-muted" selectable>
          {t("shop.manualDeliveryFirst")}
        </Text>
      </View>
      <TextField label={t("shop.delivery")} value={provider} onChangeText={setProvider} />
      <TextField label={t("onboarding.city")} value={pickupCity} onChangeText={setPickupCity} />
      <TextField label="API key" value={apiKey} onChangeText={setApiKey} />
      {status ? (
        <Text className="text-sm text-muted" selectable>
          {status}
        </Text>
      ) : null}
      <Button label={t("common.save")} icon={KeyRound} onPress={save} loading={saving} />
    </Screen>
  );
}
