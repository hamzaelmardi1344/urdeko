import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Text, View } from "react-native";
import { apiRequest } from "@/api/client";
import { Screen } from "@/components/screen";
import { StateView } from "@/components/state-view";
import { t } from "@/i18n/i18n";

const templateSchema = z.object({
  id: z.string(),
  type: z.string(),
  language: z.string(),
  body: z.string(),
  active: z.boolean(),
});

export default function WhatsappTemplatesScreen() {
  const { getToken } = useAuth();
  const templates = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () =>
      apiRequest({
        path: "/notifications/whatsapp/templates",
        token: await getToken(),
        schema: z.array(templateSchema),
        cacheKey: "whatsapp-templates",
      }),
  });
  if (templates.isLoading) return <StateView state="loading" />;
  if (templates.isError) return <StateView state="error" onRetry={() => templates.refetch()} />;
  if (!templates.data?.length) return <StateView state="empty" />;
  return (
    <Screen>
      {templates.data.map((template) => (
        <View key={template.id} className="gap-2 rounded-2xl bg-white p-4">
          <Text className="font-bold text-ink" selectable>
            {t("shop.whatsapp")} · {template.type}
          </Text>
          <Text className="text-sm text-muted" selectable>
            {template.body}
          </Text>
        </View>
      ))}
    </Screen>
  );
}
