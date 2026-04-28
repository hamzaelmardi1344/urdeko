import { Bell } from "lucide-react-native";
import { Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { t } from "@/i18n/i18n";

export default function NotificationsScreen() {
  return (
    <Screen>
      <View className="items-center gap-3 rounded-2xl bg-white p-8">
        <Bell size={32} color="#E8417F" />
        <Text className="text-center text-base text-muted" selectable>
          {t("common.empty")}
        </Text>
      </View>
    </Screen>
  );
}
