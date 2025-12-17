module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "react-native-worklets": "react-native-worklets-core",
            "react-native-worklets/plugin": "react-native-worklets-core/plugin",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};