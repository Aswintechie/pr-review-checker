// Version utility - Single source of truth
// This file gets the version from environment variables set during build

// Fallback version if environment variable is not set
// This should match the current version in package.json
const FALLBACK_VERSION = '7.0.0';

export const APP_VERSION = process.env.REACT_APP_VERSION || FALLBACK_VERSION;
export const APP_VERSION_SHORT = APP_VERSION.split('.').slice(0, 2).join('.'); // e.g., "7.0" from "7.0.0"

export default {
  full: APP_VERSION,
  short: APP_VERSION_SHORT,
};
