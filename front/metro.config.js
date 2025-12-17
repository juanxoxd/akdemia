const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-worklets": require.resolve("react-native-worklets-core"),
  "react-native-worklets/plugin": require.resolve("react-native-worklets-core/plugin"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
