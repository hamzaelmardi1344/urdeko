import type { Config } from "tailwindcss";

/**
 * UrdeKo shared Tailwind preset.
 * Remplace les ~20 blobs `tailwind-config` dupliques dans les maquettes HTML.
 * Toutes les couleurs references les CSS custom properties de tokens.css
 * pour rester coherentes avec le design system.
 */
const preset = {
  content: [],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        headline: ["var(--font-manrope)", "Manrope", "sans-serif"],
        body: ["var(--font-manrope)", "Manrope", "sans-serif"],
        label: ["var(--font-manrope)", "Manrope", "sans-serif"],
        display: ["var(--font-manrope)", "Manrope", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-md": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "headline-lg": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "headline-md": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        "headline-sm": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "title-lg": ["1.375rem", { lineHeight: "1.3" }],
        "title-md": ["1.125rem", { lineHeight: "1.4" }],
        "body-lg": ["1rem", { lineHeight: "1.6" }],
        "body-md": ["0.875rem", { lineHeight: "1.5" }],
        "label-md": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        ambient: "var(--shadow-ambient)",
        "ambient-lg": "var(--shadow-ambient-lg)",
        glow: "var(--shadow-glow)",
        "glow-sm": "var(--shadow-glow-sm)",
      },
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          container: "rgb(var(--color-primary-container) / <alpha-value>)",
          dim: "rgb(var(--color-primary-dim) / <alpha-value>)",
          fixed: "rgb(var(--color-primary-fixed) / <alpha-value>)",
          "fixed-dim": "rgb(var(--color-primary-fixed-dim) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
          container: "rgb(var(--color-secondary-container) / <alpha-value>)",
          dim: "rgb(var(--color-secondary-dim) / <alpha-value>)",
          fixed: "rgb(var(--color-secondary-fixed) / <alpha-value>)",
          "fixed-dim": "rgb(var(--color-secondary-fixed-dim) / <alpha-value>)",
        },
        tertiary: {
          DEFAULT: "rgb(var(--color-tertiary) / <alpha-value>)",
          container: "rgb(var(--color-tertiary-container) / <alpha-value>)",
          dim: "rgb(var(--color-tertiary-dim) / <alpha-value>)",
          fixed: "rgb(var(--color-tertiary-fixed) / <alpha-value>)",
          "fixed-dim": "rgb(var(--color-tertiary-fixed-dim) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          container: "rgb(var(--color-error-container) / <alpha-value>)",
          dim: "rgb(var(--color-error-dim) / <alpha-value>)",
        },
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          bright: "rgb(var(--color-surface-bright) / <alpha-value>)",
          dim: "rgb(var(--color-surface-dim) / <alpha-value>)",
          tint: "rgb(var(--color-surface-tint) / <alpha-value>)",
          variant: "rgb(var(--color-surface-variant) / <alpha-value>)",
          container: {
            DEFAULT: "rgb(var(--color-surface-container) / <alpha-value>)",
            lowest: "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
            low: "rgb(var(--color-surface-container-low) / <alpha-value>)",
            high: "rgb(var(--color-surface-container-high) / <alpha-value>)",
            highest: "rgb(var(--color-surface-container-highest) / <alpha-value>)",
          },
          inverse: "rgb(var(--color-inverse-surface) / <alpha-value>)",
        },
        "on-primary": {
          DEFAULT: "rgb(var(--color-on-primary) / <alpha-value>)",
          container: "rgb(var(--color-on-primary-container) / <alpha-value>)",
          fixed: "rgb(var(--color-on-primary-fixed) / <alpha-value>)",
          "fixed-variant": "rgb(var(--color-on-primary-fixed-variant) / <alpha-value>)",
        },
        "on-secondary": {
          DEFAULT: "rgb(var(--color-on-secondary) / <alpha-value>)",
          container: "rgb(var(--color-on-secondary-container) / <alpha-value>)",
          fixed: "rgb(var(--color-on-secondary-fixed) / <alpha-value>)",
          "fixed-variant": "rgb(var(--color-on-secondary-fixed-variant) / <alpha-value>)",
        },
        "on-tertiary": {
          DEFAULT: "rgb(var(--color-on-tertiary) / <alpha-value>)",
          container: "rgb(var(--color-on-tertiary-container) / <alpha-value>)",
          fixed: "rgb(var(--color-on-tertiary-fixed) / <alpha-value>)",
          "fixed-variant": "rgb(var(--color-on-tertiary-fixed-variant) / <alpha-value>)",
        },
        "on-error": {
          DEFAULT: "rgb(var(--color-on-error) / <alpha-value>)",
          container: "rgb(var(--color-on-error-container) / <alpha-value>)",
        },
        "on-surface": {
          DEFAULT: "rgb(var(--color-on-surface) / <alpha-value>)",
          variant: "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        },
        "on-background": "rgb(var(--color-on-background) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--color-inverse-on-surface) / <alpha-value>)",
        "inverse-primary": "rgb(var(--color-inverse-primary) / <alpha-value>)",
        outline: {
          DEFAULT: "rgb(var(--color-outline) / <alpha-value>)",
          variant: "rgb(var(--color-outline-variant) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "glow-gradient":
          "linear-gradient(to bottom right, rgb(var(--color-primary-container)), rgb(var(--color-primary)))",
      },
    },
  },
} satisfies Config;

export default preset;
