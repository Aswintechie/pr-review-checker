const { override, overrideDevServer } = require('customize-cra');

// Override dev server configuration to handle webpack-dev-server v5 compatibility
const devServerConfig = () => (config, env) => {
  console.log('Applying dev server config overrides...');
  console.log('Original config keys:', Object.keys(config));
  
  // Remove deprecated properties that cause issues in webpack-dev-server v5
  const deprecatedProps = ['onAfterSetupMiddleware', 'onBeforeSetupMiddleware', 'https'];
  deprecatedProps.forEach(prop => {
    if (config.hasOwnProperty(prop)) {
      console.log(`Removing deprecated property: ${prop}`);
      delete config[prop];
    }
  });
  
  // Prevent https property from being added back
  Object.defineProperty(config, 'https', {
    value: undefined,
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  // Use the new setupMiddlewares option instead of deprecated middleware options
  config.setupMiddlewares = (middlewares, devServer) => {
    // Add any custom middleware here if needed
    return middlewares;
  };
  
  // Ensure proper server configuration for webpack-dev-server v5
  config.server = 'http';
  
  console.log('Dev server config applied successfully');
  console.log('Final config keys:', Object.keys(config));
  console.log('https property value:', config.https);
  
  return config;
};

module.exports = {
  webpack: override(),
  devServer: overrideDevServer(devServerConfig())
}; 