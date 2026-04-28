const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");
const rootNodeModules = path.resolve(__dirname, "../../node_modules");
const sharedPackages = ["packages/shared-types", "packages/trpc-router", "packages/ui-kit"].map(
  (packagePath) => path.join(workspaceRoot, packagePath),
);

config.resolver.unstable_enablePackageExports = false;
config.resolver.useWatchman = false;
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules"), rootNodeModules];
config.watchFolders = [rootNodeModules, ...sharedPackages];

module.exports = withNativeWind(config, { input: "./global.css" });
