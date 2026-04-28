import * as Application from "expo-application";
import Constants from "expo-constants";

const extra: Record<string, unknown> = Constants.expoConfig?.extra ?? {};

export const mobilePreviewConfig = {
  appEnv: readExtraString("appEnv", process.env.APP_ENV ?? "local"),
  apiUrl: readExtraString("apiUrl", process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"),
  previewBuild: readExtraBoolean("previewBuild", false),
  packageName: Application.applicationId ?? "ma.jibi.mobile",
  appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "0.1.0",
  buildVersion: Application.nativeBuildVersion ?? "1",
  clerkConfigured: Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
  sentryConfigured: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  posthogConfigured: Boolean(process.env.EXPO_PUBLIC_POSTHOG_API_KEY),
};

function readExtraString(key: string, fallback: string): string {
  const value = extra[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readExtraBoolean(key: string, fallback: boolean): boolean {
  const value = extra[key];
  return typeof value === "boolean" ? value : fallback;
}
