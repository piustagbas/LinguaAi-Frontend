const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to use fixed host and port
config.server = {
  host: process.env.EXPO_PUBLIC_METRO_HOST || 'localhost',
  port: parseInt(process.env.EXPO_PUBLIC_METRO_PORT || '8081'),
};

module.exports = config;