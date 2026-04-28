import { useState } from "react";
import { router } from "expo-router";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CreditCard,
  Instagram,
  MessageCircle,
  Plug,
  Send,
  WandSparkles,
} from "lucide-react-native";
import type { LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { Text, View } from "react-native";
import type { IntegrationProviderStatus, WhatsappTemplateType } from "@bep/shared-types";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import { useIntegrationStatus, useTestWhatsappTemplate, useVerifyR2 } from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

type IconComponent = ComponentType<LucideProps>;
const WHATSAPP_TEST_TYPES: WhatsappTemplateType[] = [
  "ORDER_CONFIRMATION",
  "ORDER_SHIPPED",
  "CART_ABANDONED",
];

export default function IntegrationsScreen() {
  const status = useIntegrationStatus();
  const verifyR2 = useVerifyR2();
  const whatsappTest = useTestWhatsappTemplate();
  const [r2Result, setR2Result] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappType, setWhatsappType] = useState<WhatsappTemplateType>("ORDER_CONFIRMATION");
  const [whatsappResult, setWhatsappResult] = useState<string | null>(null);

  async function runR2Verify() {
    setR2Result(null);
    try {
      const result = await verifyR2.mutateAsync();
      setR2Result(result.message);
    } catch (error) {
      setR2Result(error instanceof Error ? error.message : t("common.error"));
    }
  }

  async function sendWhatsappTest() {
    setWhatsappResult(null);
    try {
      const result = await whatsappTest.mutateAsync({
        toE164: whatsappNumber.trim(),
        type: whatsappType,
        language: "fr",
      });
      setWhatsappResult(t("integrations.whatsappSent", { id: result.messageId }));
    } catch (error) {
      setWhatsappResult(error instanceof Error ? error.message : t("common.error"));
    }
  }

  if (status.isLoading) return <StateView state="loading" />;
  if (status.isError) return <StateView state="error" onRetry={() => status.refetch()} />;

  return (
    <Screen>
      <View className="gap-2 rounded-2xl bg-white p-4">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("integrations.title")}
        </Text>
        <Text className="text-sm text-muted" selectable>
          {t("integrations.subtitle")}
        </Text>
      </View>
      {status.data?.providers.map((provider) => (
        <IntegrationCard key={provider.provider} provider={provider} />
      ))}
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-xl font-bold text-ink" selectable>
          R2
        </Text>
        <Button
          label={t("integrations.verifyR2")}
          icon={Cloud}
          variant="secondary"
          onPress={runR2Verify}
          loading={verifyR2.isPending}
        />
        {r2Result ? (
          <Text className="text-sm text-muted" selectable>
            {r2Result}
          </Text>
        ) : null}
      </View>
      <View className="gap-3 rounded-2xl bg-white p-4">
        <Text className="text-xl font-bold text-ink" selectable>
          {t("integrations.whatsappTest")}
        </Text>
        <TextField
          label={t("integrations.whatsappNumber")}
          value={whatsappNumber}
          onChangeText={setWhatsappNumber}
          keyboardType="phone-pad"
          placeholder="+2126..."
        />
        <View className="flex-row gap-2">
          {WHATSAPP_TEST_TYPES.map((type) => (
            <View key={type} className="flex-1">
              <Button
                label={templateLabel(type)}
                variant={whatsappType === type ? "primary" : "secondary"}
                onPress={() => setWhatsappType(type)}
              />
            </View>
          ))}
        </View>
        <Button
          label={t("integrations.sendWhatsappTest")}
          icon={Send}
          onPress={sendWhatsappTest}
          loading={whatsappTest.isPending}
          disabled={!whatsappNumber.startsWith("+")}
        />
        {whatsappResult ? (
          <Text className="text-sm text-muted" selectable>
            {whatsappResult}
          </Text>
        ) : null}
        {whatsappTest.isError ? (
          <Text className="text-sm text-danger" selectable>
            {whatsappTest.error instanceof Error ? whatsappTest.error.message : t("common.error")}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function IntegrationCard({ provider }: { provider: IntegrationProviderStatus }) {
  const Icon = providerIcon(provider.provider);
  const color = provider.configured ? "#2A9D8F" : "#D7263D";
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="flex-row items-center gap-3">
        <Icon size={22} color={color} />
        <View className="flex-1">
          <Text className="text-lg font-bold text-ink" selectable>
            {provider.provider}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {statusLabel(provider)} · {modeLabel(provider.mode)}
          </Text>
        </View>
        {provider.configured ? (
          <CheckCircle2 size={22} color="#2A9D8F" />
        ) : (
          <AlertTriangle size={22} color="#D7263D" />
        )}
      </View>
      {provider.missingEnv.length ? (
        <Text className="text-sm text-danger" selectable>
          {t("integrations.missingEnv")}: {provider.missingEnv.join(", ")}
        </Text>
      ) : (
        <Text className="text-sm text-muted" selectable>
          {t("integrations.ready")}
        </Text>
      )}
      {provider.provider === "WHATSAPP" && !provider.configured ? (
        <Text className="text-sm text-muted" selectable>
          {t("integrations.whatsappFallback")}
        </Text>
      ) : null}
      {provider.provider === "INSTAGRAM" ? (
        <Button
          label={t("integrations.openCatalog")}
          icon={Instagram}
          variant="secondary"
          onPress={() => router.push("/(tabs)/catalog")}
        />
      ) : null}
      {provider.provider === "PADDLE" ? (
        <Button
          label={t("integrations.openBilling")}
          icon={CreditCard}
          variant="secondary"
          onPress={() => router.push("/billing")}
        />
      ) : null}
      {provider.provider === "CLAUDE" ? (
        <Button
          label={t("integrations.openProductEditor")}
          icon={WandSparkles}
          variant="secondary"
          onPress={() => router.push("/product-editor")}
        />
      ) : null}
    </View>
  );
}

function providerIcon(provider: IntegrationProviderStatus["provider"]): IconComponent {
  if (provider === "R2") return Cloud;
  if (provider === "INSTAGRAM") return Instagram;
  if (provider === "WHATSAPP") return MessageCircle;
  if (provider === "PADDLE") return CreditCard;
  if (provider === "CLAUDE") return WandSparkles;
  return Plug;
}

function statusLabel(provider: IntegrationProviderStatus): string {
  if (!provider.configured) return t("integrations.missing");
  if (provider.connected) return t("integrations.connected");
  return t("integrations.configured");
}

function modeLabel(mode: IntegrationProviderStatus["mode"]): string {
  if (mode === "sandbox") return t("integrations.sandbox");
  if (mode === "production") return t("integrations.production");
  if (mode === "preview") return t("integrations.preview");
  return t("integrations.missing");
}

function templateLabel(type: WhatsappTemplateType): string {
  if (type === "ORDER_SHIPPED") return t("integrations.orderShipped");
  if (type === "CART_ABANDONED") return t("integrations.cartAbandoned");
  return t("integrations.orderConfirmation");
}
