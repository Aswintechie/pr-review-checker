const { override, overrideDevServer } = require('customize-cra');

const devServerConfig = () => (config) => {
  // Remove deprecated middleware options
  delete config.onAfterSetupMiddleware;
  delete config.onBeforeSetupMiddleware;
  
  // Remove any HTTPS configuration that's causing issues
  delete config.https;
  
  // Force HTTP only for development
  config.server = {
    type: 'http'
  };

  // Use the new setupMiddlewares option
  config.setupMiddlewares = (middlewares, devServer) => {
    return middlewares;
  };

  return config;
};

module.exports = {
  webpack: override(),
  devServer: overrideDevServer(devServerConfig()),
};