import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { TextField } from "@/components/text-field";
import { t } from "@/i18n/i18n";

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOtp() {
    if (!isLoaded) return;
    setPending(true);
    setError(null);
    try {
      const attempt = await signIn.create({ identifier });
      const factor = attempt.supportedFirstFactors?.find(
        (candidate) => candidate.strategy === "phone_code" || candidate.strategy === "email_code",
      );
      if (!factor) throw new Error(t("common.error"));
      if (factor.strategy === "phone_code") {
        await signIn.prepareFirstFactor({ strategy: "phone_code", phoneNumberId: factor.phoneNumberId });
      } else {
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setPending(false);
    }
  }

  async function verifyOtp() {
    if (!isLoaded) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "phone_code", code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(auth)/shop-onboarding");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <View className="gap-4 pt-8">
        <Text className="text-2xl font-bold text-ink" selectable>
          {t("onboarding.signInTitle")}
        </Text>
        <Text className="text-base text-muted" selectable>
          {t("onboarding.signInBody")}
        </Text>
        <TextField
          label={t("onboarding.whatsapp")}
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="phone-pad"
          placeholder="+212600000000"
        />
        <Button label={t("onboarding.start")} onPress={startOtp} loading={pending} />
        <TextField label="OTP" value={code} onChangeText={setCode} keyboardType="numeric" />
        <Button label={t("common.save")} onPress={verifyOtp} loading={pending} variant="secondary" />
        {error ? (
          <Text className="text-sm text-danger" selectable>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
