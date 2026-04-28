import { router } from "expo-router";
import { Store, Truck, WandSparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { t } from "@/i18n/i18n";

export default function OnboardingScreen() {
  const slides = [
    { icon: Store, label: t("onboarding.slide1") },
    { icon: Truck, label: t("onboarding.slide2") },
    { icon: WandSparkles, label: t("onboarding.slide3") },
  ];
  return (
    <Screen>
      <View className="gap-4 pt-16">
        <Text className="text-4xl font-bold text-ink" selectable>
          Jibi
        </Text>
        {slides.map((slide) => (
          <View key={slide.label} className="flex-row items-center gap-4 rounded-2xl bg-white p-5">
            <slide.icon size={26} color="#E8417F" />
            <Text className="flex-1 text-lg font-semibold text-ink" selectable>
              {slide.label}
            </Text>
          </View>
        ))}
        <Button label={t("onboarding.start")} onPress={() => router.push("/(auth)/sign-in")} />
      </View>
    </Screen>
  );
}
