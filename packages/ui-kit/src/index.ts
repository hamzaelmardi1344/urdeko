export const colors = {
  primary: "#E8417F",
  primaryDark: "#B82E63",
  accent: "#1B4332",
  surface: "#FFFFFF",
  surfaceWarm: "#FAFAF7",
  ink: "#0E1116",
  inkMuted: "#5C6470",
  danger: "#D7263D",
  warning: "#F4A261",
  success: "#2A9D8F",
  cod: "#F4A261",
} as const;

export const typography = {
  titleFamily: "Plus Jakarta Sans",
  bodyFamily: "Inter",
  arabicFamily: "Noto Naskh Arabic",
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "4xl": 32,
  },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
} as const;

export const button = {
  height: 52,
  minTapTarget: 44,
} as const;

export const shadow = {
  subtle: "0 1px 2px rgba(14, 17, 22, 0.06)",
  medium: "0 8px 18px rgba(14, 17, 22, 0.08)",
} as const;
