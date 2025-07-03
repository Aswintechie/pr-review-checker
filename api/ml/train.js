/**
 * Vercel Serverless Function for ML Train API
 * This file exports the Express app as a serverless function
 * Handles: /api/ml/train
 */

const app = require('../../server/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app; 