import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";

type ScreenProps = PropsWithChildren<{
  padded?: boolean;
}>;

export function Screen({ children, padded = true }: ScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-surface-warm"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: padded ? 16 : 0, gap: 16 }}
    >
      <View className="gap-4">{children}</View>
    </ScrollView>
  );
}
