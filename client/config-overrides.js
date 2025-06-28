const { override, overrideDevServer } = require('customize-cra');

// Override dev server configuration to handle webpack-dev-server v5 compatibility
const devServerConfig = () => (config) => {
  // Remove deprecated onAfterSetupMiddleware if it exists
  if (config.onAfterSetupMiddleware) {
    delete config.onAfterSetupMiddleware;
  }
  
  // Remove deprecated onBeforeSetupMiddleware if it exists
  if (config.onBeforeSetupMiddleware) {
    delete config.onBeforeSetupMiddleware;
  }
  
  // Use the new setupMiddlewares option instead
  config.setupMiddlewares = (middlewares, devServer) => {
    // Add any custom middleware here if needed
    return middlewares;
  };
  
  return config;
};

module.exports = {
  webpack: override(),
  devServer: overrideDevServer(devServerConfig())
}; 