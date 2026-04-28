/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#E8417F",
        "primary-dark": "#B82E63",
        accent: "#1B4332",
        surface: "#FFFFFF",
        "surface-warm": "#FAFAF7",
        ink: "#0E1116",
        muted: "#5C6470",
        danger: "#D7263D",
        warning: "#F4A261",
        success: "#2A9D8F",
        cod: "#F4A261"
      },
      borderRadius: {
        "2xl": "24px"
      }
    }
  }
};
