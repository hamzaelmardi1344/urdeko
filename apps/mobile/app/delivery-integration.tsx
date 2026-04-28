import { useAuth } from "@clerk/clerk-expo";
import { z } from "zod";
import { useState } from "react";
import { KeyRound, Save } from "lucide-react-native";
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

  async function save() {
    setSaving(true);
    try {
      await apiRequest({
        path: "/delivery/configure",
        method: "POST",
        token: await getToken(),
        body: { provider, pickupCity, apiKey },
        schema: deliveryConfigSchema,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <TextField label={t("shop.delivery")} value={provider} onChangeText={setProvider} />
      <TextField label={t("onboarding.city")} value={pickupCity} onChangeText={setPickupCity} />
      <TextField label="API key" value={apiKey} onChangeText={setApiKey} />
      <Button label={t("common.save")} icon={saving ? undefined : KeyRound} onPress={save} loading={saving} />
      <Button label={t("common.retry")} icon={Save} variant="secondary" onPress={save} />
    </Screen>
  );
}
