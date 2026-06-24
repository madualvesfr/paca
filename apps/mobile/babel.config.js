module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 52) wires the react-native-reanimated plugin
    // automatically when reanimated is installed, and must stay last.
    // jsxImportSource "nativewind" + the nativewind/babel preset enable
    // className styling across the app.
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
