// Wires plugins/mlkit_simulator_patch.rb into the generated ios/Podfile so the
// MLKit simulator fix survives `npx expo prebuild --clean`. See the .rb file
// for what the patch does and why.
const { withPodfile } = require("expo/config-plugins");

const REQUIRE_LINE = "require_relative '../plugins/mlkit_simulator_patch'";
const CALL_LINE = "    apply_mlkit_simulator_patch(installer)";

module.exports = function withMLKitSimulatorPatch(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes(REQUIRE_LINE)) {
      contents = `${REQUIRE_LINE}\n${contents}`;
    }
    if (!contents.includes("apply_mlkit_simulator_patch(installer)")) {
      const anchor = /post_install do \|installer\|/;
      if (!anchor.test(contents)) {
        throw new Error(
          "with-mlkit-simulator-patch: no post_install block found in Podfile"
        );
      }
      contents = contents.replace(
        anchor,
        `post_install do |installer|\n${CALL_LINE}`
      );
    }
    config.modResults.contents = contents;
    return config;
  });
};
