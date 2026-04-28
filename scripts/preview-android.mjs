import { spawnSync } from "node:child_process";

const env = { ...process.env, APP_ENV: "preview" };
const check = spawnSync(process.execPath, ["scripts/preview-check.mjs"], {
  env,
  stdio: "inherit",
});

if (check.status !== 0) {
  process.exit(check.status ?? 1);
}

console.log("\nRunning: eas build --platform android --profile preview");
console.log("This creates a preview APK/AAB only; it does not submit to Play Store.\n");

const eas = spawnSync(
  "pnpm",
  ["exec", "eas", "build", "--platform", "android", "--profile", "preview"],
  {
    env,
    stdio: "inherit",
  },
);

if (eas.error) {
  console.error(
    "Could not start EAS CLI. Install or authenticate EAS, then rerun preview:android.",
  );
  process.exit(1);
}

process.exit(eas.status ?? 1);
