import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as Sentry from "@sentry/react-native";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bug,
  CheckCircle2,
  Cloud,
  CreditCard,
  Instagram,
  MessageCircle,
  Plug,
  RefreshCw,
  Send,
  WandSparkles,
} from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import type { LucideProps } from "lucide-react-native";
import type { ComponentType } from "react";
import { Text, View } from "react-native";
import type {
  IntegrationProviderStatus,
  PreviewHealth,
  WhatsappTemplateType,
} from "@bep/shared-types";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { TextField } from "@/components/text-field";
import { mobilePreviewConfig } from "@/config/preview";
import {
  useIntegrationStatus,
  usePreviewHealth,
  useTestWhatsappTemplate,
  useVerifyR2,
} from "@/hooks/use-api-data";
import { t } from "@/i18n/i18n";

type IconComponent = ComponentType<LucideProps>;
type TrackingProperties = Record<string, string | number | boolean | null | undefined>;

const WHATSAPP_TEST_TYPES: WhatsappTemplateType[] = [
  "ORDER_CONFIRMATION",
  "ORDER_SHIPPED",
  "CART_ABANDONED",
];

export default function IntegrationsScreen() {
  const status = useIntegrationStatus();
  const previewHealth = usePreviewHealth();
  const verifyR2 = useVerifyR2();
  const whatsappTest = useTestWhatsappTemplate();
  const posthog = usePostHog();
  const [r2Result, setR2Result] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappType, setWhatsappType] = useState<WhatsappTemplateType>("ORDER_CONFIRMATION");
  const [whatsappResult, setWhatsappResult] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>("unknown");

  function trackPreview(event: string, properties?: TrackingProperties) {
    posthog?.capture(event, {
      appEnv: mobilePreviewConfig.appEnv,
      previewBuild: mobilePreviewConfig.previewBuild,
      ...properties,
    });
  }

  useEffect(() => {
    trackPreview("jibi_preview_integrations_opened");
    Notifications.getPermissionsAsync()
      .then((permissions) => setNotificationStatus(permissions.status))
      .catch((error: unknown) => Sentry.captureException(error));
  }, []);

  async function runR2Verify() {
    setR2Result(null);
    try {
      const result = await verifyR2.mutateAsync();
      setR2Result(result.message);
      trackPreview("jibi_preview_r2_verify", { ok: result.ok });
    } catch (error) {
      setR2Result(error instanceof Error ? error.message : t("common.error"));
      trackPreview("jibi_preview_r2_verify", { ok: false });
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
      trackPreview("jibi_preview_whatsapp_template_test", {
        ok: true,
        type: whatsappType,
      });
    } catch (error) {
      setWhatsappResult(error instanceof Error ? error.message : t("common.error"));
      trackPreview("jibi_preview_whatsapp_template_test", {
        ok: false,
        type: whatsappType,
      });
    }
  }

  async function refreshStatuses() {
    setPreviewResult(null);
    const [healthResult, statusResult] = await Promise.all([
      previewHealth.refetch(),
      status.refetch(),
    ]);
    trackPreview("jibi_preview_status_refreshed", {
      apiOk: healthResult.data?.ok ?? null,
      providers: statusResult.data?.providers.length ?? 0,
    });
  }

  async function requestNotifications() {
    try {
      const permissions = await Notifications.requestPermissionsAsync();
      setNotificationStatus(permissions.status);
      setPreviewResult(t("integrations.notificationsResult", { status: permissions.status }));
      trackPreview("jibi_preview_notifications_requested", { status: permissions.status });
    } catch (error) {
      setPreviewResult(error instanceof Error ? error.message : t("common.error"));
      Sentry.captureException(error);
      trackPreview("jibi_preview_notifications_requested", { status: "error" });
    }
  }

  function testSentry() {
    const eventId = Sentry.captureException(new Error("Jibi preview Sentry diagnostic"));
    setPreviewResult(
      mobilePreviewConfig.sentryConfigured
        ? t("integrations.sentrySent", { id: eventId })
        : t("integrations.sentryMissing"),
    );
    trackPreview("jibi_preview_sentry_test", {
      configured: mobilePreviewConfig.sentryConfigured,
    });
  }

  function testPostHog() {
    trackPreview("jibi_preview_posthog_test", {
      configured: mobilePreviewConfig.posthogConfigured,
    });
    setPreviewResult(
      mobilePreviewConfig.posthogConfigured
        ? t("integrations.posthogSent")
        : t("integrations.posthogMissing"),
    );
  }

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
      <PreviewAndroidCard
        health={previewHealth.data}
        healthError={previewHealth.error instanceof Error ? previewHealth.error.message : null}
        notificationStatus={notificationStatus}
        refreshing={previewHealth.isFetching || status.isFetching}
        previewResult={previewResult}
        onRefresh={refreshStatuses}
        onRequestNotifications={requestNotifications}
        onTestSentry={testSentry}
        onTestPostHog={testPostHog}
      />
      {status.isLoading ? <StateView state="loading" /> : null}
      {status.isError ? <StateView state="error" onRetry={() => status.refetch()} /> : null}
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

function PreviewAndroidCard({
  health,
  healthError,
  notificationStatus,
  refreshing,
  previewResult,
  onRefresh,
  onRequestNotifications,
  onTestSentry,
  onTestPostHog,
}: {
  health: PreviewHealth | undefined;
  healthError: string | null;
  notificationStatus: string;
  refreshing: boolean;
  previewResult: string | null;
  onRefresh: () => void;
  onRequestNotifications: () => void;
  onTestSentry: () => void;
  onTestPostHog: () => void;
}) {
  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="flex-row items-center gap-3">
        <Plug size={22} color={health?.ok ? "#2A9D8F" : "#F4A261"} />
        <View className="flex-1">
          <Text className="text-xl font-bold text-ink" selectable>
            {t("integrations.previewAndroid")}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {health?.ok ? t("integrations.apiHealthy") : t("integrations.apiNeedsAttention")}
          </Text>
        </View>
      </View>
      <View className="gap-2">
        <DiagnosticRow label="APP_ENV" value={mobilePreviewConfig.appEnv} />
        <DiagnosticRow label="API" value={mobilePreviewConfig.apiUrl} />
        <DiagnosticRow
          label="Version"
          value={`${mobilePreviewConfig.appVersion} (${mobilePreviewConfig.buildVersion})`}
        />
        <DiagnosticRow label="Package" value={mobilePreviewConfig.packageName} />
        <DiagnosticRow label="Preview" value={yesNo(mobilePreviewConfig.previewBuild)} />
        <DiagnosticRow label="Clerk" value={configuredLabel(mobilePreviewConfig.clerkConfigured)} />
        <DiagnosticRow
          label="Sentry"
          value={configuredLabel(mobilePreviewConfig.sentryConfigured)}
        />
        <DiagnosticRow
          label="PostHog"
          value={configuredLabel(mobilePreviewConfig.posthogConfigured)}
        />
        <DiagnosticRow label={t("integrations.notifications")} value={notificationStatus} />
        <DiagnosticRow
          label={t("integrations.healthDb")}
          value={health ? yesNo(health.dbReachable) : t("integrations.notChecked")}
        />
        <DiagnosticRow
          label={t("integrations.healthRedis")}
          value={health ? yesNo(health.redisReachable) : t("integrations.notChecked")}
        />
        {health?.checkedAt ? (
          <DiagnosticRow label={t("integrations.lastChecked")} value={health.checkedAt} />
        ) : null}
      </View>
      {healthError ? (
        <Text className="text-sm text-danger" selectable>
          {healthError}
        </Text>
      ) : null}
      {previewResult ? (
        <Text className="text-sm text-muted" selectable>
          {previewResult}
        </Text>
      ) : null}
      <View className="gap-3">
        <Button
          label={t("integrations.refreshStatuses")}
          icon={RefreshCw}
          variant="secondary"
          onPress={onRefresh}
          loading={refreshing}
        />
        <Button
          label={t("integrations.requestNotifications")}
          icon={Bell}
          variant="secondary"
          onPress={onRequestNotifications}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              label={t("integrations.testSentry")}
              icon={Bug}
              variant="secondary"
              onPress={onTestSentry}
            />
          </View>
          <View className="flex-1">
            <Button
              label={t("integrations.testPosthog")}
              icon={BarChart3}
              variant="secondary"
              onPress={onTestPostHog}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text className="text-sm font-semibold text-ink" selectable>
        {label}
      </Text>
      <Text className="max-w-[65%] text-right text-sm text-muted" selectable>
        {value}
      </Text>
    </View>
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

function yesNo(value: boolean): string {
  return value ? t("integrations.yes") : t("integrations.no");
}

function configuredLabel(value: boolean): string {
  return value ? t("integrations.configured") : t("integrations.missing");
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
