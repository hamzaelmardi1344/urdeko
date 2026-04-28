import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type ConfigContext, type ExpoConfig } from "expo/config";

const googleServicesFile = process.env.GOOGLE_SERVICES_FILE ?? "./google-services.json";

export default ({ config }: ConfigContext): ExpoConfig => {
  const android: NonNullable<ExpoConfig["android"]> = {
    package: "ma.jibi.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#E8417F",
    },
    permissions: ["POST_NOTIFICATIONS"],
  };

  if (existsSync(resolve(__dirname, googleServicesFile))) {
    android.googleServicesFile = googleServicesFile;
  }

  return {
    ...config,
    name: "Jibi",
    slug: "jibi",
    scheme: "jibi",
    version: "0.1.0",
    icon: "./assets/icon.png",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "ma.jibi.mobile",
    },
    android,
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#E8417F",
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
        },
      ],
    ],
    extra: {
      router: {
        origin: false,
      },
    },
  };
};
