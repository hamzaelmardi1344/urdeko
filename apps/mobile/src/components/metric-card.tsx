import { Text, View } from "react-native";
import { theme } from "@/theme/styles";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning";
};

export function MetricCard({ label, value, tone = "primary" }: MetricCardProps) {
  const accent = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <View
      className="flex-1 gap-3 rounded-2xl bg-white p-4"
      style={{ borderCurve: "continuous", boxShadow: theme.shadow.subtle }}
    >
      <View className={`h-1.5 w-12 rounded-full ${accent}`} />
      <Text className="text-sm text-muted" selectable>
        {label}
      </Text>
      <Text className="text-2xl font-bold text-ink" selectable>
        {value}
      </Text>
    </View>
  );
}
