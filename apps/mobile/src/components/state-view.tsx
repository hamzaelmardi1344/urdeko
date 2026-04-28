import { RefreshCw } from "lucide-react-native";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "./button";
import { t } from "@/i18n/i18n";

type StateViewProps = {
  state: "loading" | "empty" | "error";
  message?: string;
  onRetry?: () => void;
};

export function StateView({ state, message, onRetry }: StateViewProps) {
  return (
    <View className="min-h-[180px] items-center justify-center gap-4 rounded-2xl bg-white p-6">
      {state === "loading" ? <ActivityIndicator color="#E8417F" /> : null}
      <Text className="text-center text-base text-muted" selectable>
        {message ?? t(state === "loading" ? "common.loading" : state === "empty" ? "common.empty" : "common.error")}
      </Text>
      {state === "error" && onRetry ? (
        <Button label={t("common.retry")} onPress={onRetry} icon={RefreshCw} variant="secondary" />
      ) : null}
    </View>
  );
}
