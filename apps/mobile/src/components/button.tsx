import type { ComponentType } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import type { LucideProps } from "lucide-react-native";
import { theme } from "@/theme/styles";

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ComponentType<LucideProps>;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled,
  loading,
}: ButtonProps) {
  const bg =
    variant === "primary" ? "bg-primary" : variant === "danger" ? "bg-danger" : "bg-white";
  const text = variant === "secondary" ? "text-ink" : "text-white";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      className={`${bg} min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl px-5 ${
        disabled ? "opacity-50" : "opacity-100"
      }`}
      style={{ borderCurve: "continuous", boxShadow: theme.shadow.subtle }}
    >
      {loading ? <ActivityIndicator color={variant === "secondary" ? "#0E1116" : "#FFFFFF"} /> : null}
      {!loading && Icon ? <Icon size={20} color={variant === "secondary" ? "#0E1116" : "#FFFFFF"} /> : null}
      <Text className={`${text} text-base font-semibold`} selectable={false}>
        {label}
      </Text>
    </Pressable>
  );
}
