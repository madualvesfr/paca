// Metro config for the Expo app inside the Turborepo monorepo.
// - withNativeWind compiles ./global.css so className styling works.
// - watchFolders + nodeModulesPaths let Metro resolve the hoisted workspace
//   packages (@paca/api, @paca/shared) and the root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
