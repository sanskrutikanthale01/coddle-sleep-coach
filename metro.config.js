// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude test files from the bundle
config.resolver.blockList = [
  /.*\/__tests__\/.*/,
  /.*\.test\.(js|ts|tsx)$/,
  /.*\.spec\.(js|ts|tsx)$/,
];

module.exports = config;

