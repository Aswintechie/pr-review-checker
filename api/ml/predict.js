/**
 * Vercel Serverless Function for ML Predict API
 * This file exports the Express app as a serverless function
 * Handles: /api/ml/predict
 */

const app = require('../../server/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app; 