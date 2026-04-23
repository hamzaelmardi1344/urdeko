/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  rules: {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "off"
  }
};
