/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "widget",
  // Appended to the main app bundle id -> com.martinez.orbit.widget
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.martinez.orbit"],
  },
});