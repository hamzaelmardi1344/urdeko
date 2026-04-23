import type { Config } from "tailwindcss";
import preset from "@urdeko/design-system/tailwind-preset";

const config = {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/design-system/src/**/*.{ts,tsx}",
  ],
} satisfies Config;

export default config;
