/**
 * Vercel Serverless Function for PR Approvers API
 * This file exports the Express app as a serverless function
 */

const app = require('../server/index.js');

// Export the Express app as a Vercel serverless function
module.exports = app; 