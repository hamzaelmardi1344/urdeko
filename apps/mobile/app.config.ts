import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type ConfigContext, type ExpoConfig } from "expo/config";

const googleServicesFile = process.env.GOOGLE_SERVICES_FILE ?? "./google-services.json";
const appEnv = process.env.APP_ENV ?? "local";
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const androidVersionCode = readPositiveInt(process.env.ANDROID_VERSION_CODE, 1);
const sentryPluginOptions = {
  url: "https://sentry.io/",
  ...(process.env.SENTRY_ORG ? { organization: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const android: NonNullable<ExpoConfig["android"]> = {
    package: "ma.jibi.mobile",
    versionCode: androidVersionCode,
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
      ["@sentry/react-native/expo", sentryPluginOptions],
    ],
    extra: {
      appEnv,
      apiUrl,
      previewBuild: appEnv === "preview",
      router: {
        origin: false,
      },
    },
  };
};

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
