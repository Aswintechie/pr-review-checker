/**
 * Vercel Serverless Function for Health Check API
 * This file exports the Express app as a serverless function
 * Handles: /health
 */

const app = require('../server/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app; 