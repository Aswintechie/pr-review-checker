/**
 * PR Approval Finder v5.0 - Server
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');
const Codeowners = require('codeowners');

// Constants
const GITHUB_API_BASE = 'https://api.github.com';
const MATCHED_BY_CODEOWNERS = 'Matched by codeowners library';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, '../client/build')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'PR Approval Finder' });
});

// ML CODEOWNERS endpoints

// Train the ML model
app.post('/api/ml/train', async (req, res) => {
  try {
    const { owner, repo, token, prCount = 50 } = req.body;

    if (!owner || !repo || !token) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['owner', 'repo', 'token'],
      });
    }

    // // console.log(`🤖 Starting ML training for ${owner}/${repo}`);

    // Train the model
    const pythonPath = path.join(__dirname, '..', 'codeowners_ml_train.py');
    const pythonCommand = process.env.PYTHON_CMD || 'python3';

    const mlPromise = new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonCommand, [pythonPath, owner, repo, token, prCount], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PATH: process.env.PATH },
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', data => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', code => {
        if (code === 0) {
          try {
            const summary = JSON.parse(output);
            resolve(summary);
          } catch (parseError) {
            reject(new Error(`Failed to parse CODEOWNERS ML output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', error => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });

    try {
      const summary = await mlPromise;

      res.json({
        success: true,
        message: 'Model trained successfully',
        summary,
      });
    } catch (mlError) {
      console.warn('⚠️ CODEOWNERS ML training failed:', mlError.message);
      res.status(500).json({
        error: 'Training failed',
        message: mlError.message,
      });
    }
  } catch (error) {
    console.error('❌ ML training error:', error.message);
    res.status(500).json({
      error: 'Training failed',
      message: error.message,
    });
  }
});

// Predict approvers for given files
app.post('/api/ml/predict', async (req, res) => {
  try {
    const { files, confidence = 0.3 } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid files parameter',
        message: 'Please provide an array of file paths',
      });
    }

    // Use the CODEOWNERS-aware ML model (learns within each CODEOWNERS group)
    console.log('🤖 Using CODEOWNERS-aware ML model for prediction...');
    console.log('📁 Files:', files.length, 'files');
    console.log('🎯 Confidence threshold:', confidence);

    const mlPromise = new Promise((resolve, reject) => {
      // Use python3 or the virtual environment python
      const pythonCommand = process.env.PYTHON_CMD || 'python3';
      const pythonProcess = spawn(
        pythonCommand,
        [path.join(__dirname, '..', 'codeowners_ml_predict.py'), JSON.stringify(files), '10'],
        {
          cwd: path.join(__dirname, '..'),
          env: { ...process.env, PATH: process.env.PATH },
        }
      );

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', data => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', code => {
        if (code === 0) {
          try {
            const predictions = JSON.parse(output);
            resolve(predictions);
          } catch (parseError) {
            reject(new Error(`Failed to parse CODEOWNERS ML output: ${parseError.message}`));
          }
        } else {
          reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', error => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });

    try {
      const mlPredictions = await mlPromise;

      // Filter by confidence threshold
      const filteredPredictions = mlPredictions
        .filter(p => p.confidence / 100 >= confidence)
        .slice(0, 10);

      console.log('✅ CODEOWNERS-aware ML predictions:', filteredPredictions.length, 'approvers');

      return res.json({
        success: true,
        prediction: {
          predictions: filteredPredictions.map(p => ({
            approver: p.approver,
            confidence: p.confidence / 100, // Convert percentage to decimal
            reasoning: p.reasoning || `CODEOWNERS ML Model: ${p.confidence}% confidence`,
            source: 'codeowners_ml_model',
            group_scores: p.group_scores || {}, // Include group-specific scores
            group_labels: p.group_labels || [], // Include human-readable group labels
          })),
          matchedPatterns: files.map(file => ({
            pattern: 'codeowners_group_pattern',
            file,
            confidence: 0.9,
          })),
          fallbackUsed: false,
          modelAvailable: true,
          modelType: 'codeowners_random_forest',
        },
        requestedFiles: files,
        confidenceThreshold: confidence,
        message: 'Using CODEOWNERS-aware ML model predictions',
      });
    } catch (mlError) {
      console.error('❌ CODEOWNERS ML prediction failed:', mlError.message);

      return res.status(500).json({
        success: false,
        error: 'ML prediction failed',
        message: mlError.message,
        requestedFiles: files,
        confidenceThreshold: confidence,
      });
    }
  } catch (error) {
    console.error('❌ ML prediction error:', error.message);

    const confidence = req.body.confidence || 0.3;
    const files = req.body.files || [];

    res.status(500).json({
      success: false,
      error: 'ML prediction service unavailable',
      message: error.message,
      requestedFiles: files,
      confidenceThreshold: confidence,
    });
  }
});

// Get model statistics and summary for CODEOWNERS-aware ML model
app.get('/api/ml/stats', async (req, res) => {
  try {
    // Check if CODEOWNERS-aware ML model exists
    const modelPath = path.join(__dirname, '..', 'codeowners_ml_model.pkl');

    try {
      // Check if model file exists
      fs.accessSync(modelPath, fs.constants.F_OK);

      // Extract real statistics from the trained model
      const pythonPath = path.join(__dirname, '..', 'codeowners_ml_stats.py');
      const pythonCommand = process.env.PYTHON_CMD || 'python3';

      const statsPromise = new Promise((resolve, reject) => {
        const pythonProcess = spawn(pythonCommand, [pythonPath, modelPath], {
          cwd: path.join(__dirname, '..'),
          env: { ...process.env, PATH: process.env.PATH },
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', data => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', data => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', code => {
          if (code === 0) {
            try {
              const statsData = JSON.parse(output);
              resolve(statsData);
            } catch (parseError) {
              reject(new Error(`Failed to parse ML stats output: ${parseError.message}`));
            }
          } else {
            reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
          }
        });

        pythonProcess.on('error', error => {
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });
      });

      // Get real statistics from the trained model
      const statsResult = await statsPromise;

      if (statsResult.success) {
        console.log('✅ CODEOWNERS ML model stats extracted:', statsResult.message);

        res.json({
          success: true,
          stats: statsResult.stats,
          isModelTrained: true,
          modelType: 'codeowners_ml_random_forest',
          message: 'Using real CODEOWNERS ML model statistics',
        });
      } else {
        throw new Error(statsResult.error || 'Failed to extract model statistics');
      }
    } catch (modelError) {
      console.error(
        '❌ CODEOWNERS ML model not found or stats extraction failed:',
        modelError.message
      );

      res.status(500).json({
        success: false,
        error: 'CODEOWNERS ML model not available',
        message: modelError.message,
        isModelTrained: false,
      });
    }
  } catch (error) {
    console.error('❌ CODEOWNERS ML stats error:', error.message);

    res.status(500).json({
      success: false,
      error: 'CODEOWNERS ML stats service unavailable',
      message: error.message,
      isModelTrained: false,
    });
  }
});

// Clear training log to force fresh training
app.post('/api/ml/clear-training-log', async (req, res) => {
  try {
    const clearedLogs = [];

    // Clear Python training log
    const pythonLogPath = path.join(__dirname, '..', 'python_training_log.json');
    if (fs.existsSync(pythonLogPath)) {
      fs.unlinkSync(pythonLogPath);
      clearedLogs.push('python_training_log.json');
      console.log('🗑️ Python training log cleared via API');
    }

    res.json({
      success: true,
      message: 'Training log cleared - next training will process all PRs',
      clearedLogs,
    });
  } catch (error) {
    console.error('❌ Clear training log error:', error.message);
    res.status(500).json({
      error: 'Failed to clear training log',
      message: error.message,
    });
  }
});

// Feedback submission endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, type, subject, message, rating } = req.body;

    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Basic validation
    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject must be less than 200 characters' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message must be less than 2000 characters' });
    }

    const feedbackId = `feedback_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Log feedback to console
    // // console.log('\n📝 New Feedback Received:');
    // // console.log('========================');
    // // console.log(`Type: ${type || 'feedback'}`);
    // // console.log(`Rating: ${rating || 5}/5`);
    // // console.log(`Subject: ${subject}`);
    // // console.log(`Message: ${message}`);
    // if (name) // console.log(`Name: ${name}`);
    // if (email) // console.log(`Email: ${email}`);
    // // console.log(`Timestamp: ${timestamp}`);
    // // console.log('========================\n');

    // Send email notification if configured
    if (emailTransporter && process.env.FEEDBACK_EMAIL) {
      try {
        const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 24px;">📝 New Feedback Received</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">PR Approval Finder Feedback System</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Type:</strong> 
              <span style="background: #f3f4f6; padding: 4px 8px; border-radius: 6px; margin-left: 8px; text-transform: capitalize;">${type || 'feedback'}</span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Rating:</strong> 
              <span style="margin-left: 8px; font-size: 18px;">
                ${'⭐'.repeat(rating || 5)} (${rating || 5}/5)
              </span>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Subject:</strong>
              <p style="margin: 5px 0 0 0; padding: 10px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #667eea;">${subject}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Message:</strong>
              <div style="margin: 5px 0 0 0; padding: 15px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #667eea; white-space: pre-wrap; line-height: 1.6;">${message}</div>
            </div>
            
            ${
              name
                ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Name:</strong> 
              <span style="margin-left: 8px;">${name}</span>
            </div>
            `
                : ''
            }
            
            ${
              email
                ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Contact Email:</strong> 
              <a href="mailto:${email}" style="margin-left: 8px; color: #667eea; text-decoration: none;">${email}</a>
            </div>
            `
                : ''
            }
            
            <div style="margin-bottom: 15px;">
              <strong style="color: #374151;">Feedback ID:</strong> 
              <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; margin-left: 8px;">${feedbackId}</code>
            </div>
            
            <div style="margin-bottom: 0;">
              <strong style="color: #374151;">Submitted:</strong> 
              <span style="margin-left: 8px; color: #6b7280;">${new Date(timestamp).toLocaleString()}</span>
            </div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: #e5e7eb; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              This feedback was automatically sent from the PR Approval Finder application
            </p>
          </div>
        </div>
        `;

        const mailOptions = {
          from: `"PR Approval Finder" <${process.env.SMTP_USER}>`,
          to: process.env.FEEDBACK_EMAIL,
          subject: `[PR Approval Finder] ${(type || 'feedback').toUpperCase()}: ${subject}`,
          html: emailHtml,
          text: `
New Feedback Received - PR Approval Finder

Type: ${type || 'feedback'}
Rating: ${rating || 5}/5 stars
Subject: ${subject}

Message:
${message}

${name ? `Name: ${name}` : ''}
${email ? `Contact Email: ${email}` : ''}

Feedback ID: ${feedbackId}
Submitted: ${new Date(timestamp).toLocaleString()}
          `.trim(),
        };

        await emailTransporter.sendMail(mailOptions);
        // // console.log('📧 Email notification sent successfully to', process.env.FEEDBACK_EMAIL);
      } catch (emailError) {
        console.error('📧 Failed to send email notification:', emailError.message);
        // Don't fail the whole request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: feedbackId,
      emailSent: !!(emailTransporter && process.env.FEEDBACK_EMAIL),
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email endpoint for debugging
app.post('/api/test-email', async (req, res) => {
  try {
    if (!emailTransporter) {
      return res.status(400).json({
        error: 'Email not configured',
        message: 'Please check your SMTP configuration in .env file',
        required: ['SMTP_USER', 'SMTP_PASS', 'FEEDBACK_EMAIL'],
      });
    }

    if (!process.env.FEEDBACK_EMAIL) {
      return res.status(400).json({
        error: 'FEEDBACK_EMAIL not set',
        message: 'Please set FEEDBACK_EMAIL in your .env file',
      });
    }

    const testMailOptions = {
      from: `"PR Approval Finder Test" <${process.env.SMTP_USER}>`,
      to: process.env.FEEDBACK_EMAIL,
      subject: '[PR Approval Finder] Email Test - Configuration Working!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h2 style="color: white; margin: 0; font-size: 24px;">✅ Email Configuration Test</h2>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">PR Approval Finder - SMTP Test</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
            <h3 style="color: #10b981; margin-top: 0;">🎉 Success!</h3>
            <p>Your email configuration is working correctly. You should now receive feedback notifications when users submit feedback through the form.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #065f46;">Configuration Details:</h4>
              <ul style="margin: 0; color: #374151;">
                <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
                <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT || '587'}</li>
                <li><strong>From Email:</strong> ${process.env.SMTP_USER}</li>
                <li><strong>To Email:</strong> ${process.env.FEEDBACK_EMAIL}</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            
            <p style="margin-bottom: 0;">You can now use the feedback form with confidence that notifications will be delivered to your inbox!</p>
          </div>
        </div>
      `,
      text: `
Email Configuration Test - SUCCESS!

Your PR Approval Finder email configuration is working correctly.

Configuration:
- SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}
- SMTP Port: ${process.env.SMTP_PORT || '587'}
- From Email: ${process.env.SMTP_USER}
- To Email: ${process.env.FEEDBACK_EMAIL}
- Test Time: ${new Date().toLocaleString()}

You should now receive feedback notifications when users submit feedback.
      `.trim(),
    };

    await emailTransporter.sendMail(testMailOptions);

    res.json({
      success: true,
      message: 'Test email sent successfully!',
      details: {
        from: process.env.SMTP_USER,
        to: process.env.FEEDBACK_EMAIL,
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '587',
      },
    });
  } catch (error) {
    console.error('📧 Email test failed:', error);
    res.status(500).json({
      error: 'Email test failed',
      message: error.message,
      code: error.code,
      troubleshooting: 'Check docs/EMAIL_TROUBLESHOOTING.md for help',
    });
  }
});

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_TEAMS_TOKEN = process.env.GITHUB_TEAMS_TOKEN;

// Email configuration
let emailTransporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Verify email configuration
  emailTransporter.verify((error, _success) => {
    if (error) {
      console.warn('⚠️  Email configuration error:', error.message);
      console.warn('📧 Email notifications will be disabled');
      emailTransporter = null;
    } else {
      // // console.log('📧 Email server is ready to send feedback notifications');
    }
  });
} else {
  // // console.log('📧 No email configuration found - feedback will only be logged to console');
}

// Optimized temp directory management with shared base directory
let sharedBaseTempDir = null;
let initializationPromise = null;

// Initialize shared base directory at startup for optimal performance
// This function uses a caching mechanism with 'initializationPromise' to ensure
// that the shared base directory is initialized only once. If multiple calls
// are made concurrently, they will share the same promise to prevent race conditions.
async function initializeSharedBaseDir() {
  // If already initialized, return immediately
  if (sharedBaseTempDir) {
    return Promise.resolve();
  }

  // Return existing promise if initialization is already in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create and store the initialization promise to prevent race conditions
  initializationPromise = (async () => {
    const tempDir = os.tmpdir();
    const proposedDir = path.join(tempDir, 'codeowners-base');

    try {
      await fsPromises.mkdir(proposedDir, { recursive: true });
      sharedBaseTempDir = proposedDir;
    } catch (error) {
      console.warn('Could not create shared base temp directory:');
      console.warn('  Error Message:', error.message);
      console.warn('  Error Stack:', error.stack);
      console.warn('  Attempted Path:', proposedDir);
      console.warn('  Fallback: Using system temp directory directly');
      // Fallback to using system temp directory directly
      sharedBaseTempDir = tempDir;
    }
  })();

  return initializationPromise;
}

// Thread-safe CODEOWNERS analysis with optimized directory management
async function analyzeCodeownersContent(codeownersContent, changedFiles) {
  // Ensure shared base directory exists
  await initializeSharedBaseDir();

  // Create unique subdirectory for this request to avoid race conditions
  const requestId = `${Date.now()}-${crypto.randomUUID()}`;
  const tempCodeownersDir = path.join(sharedBaseTempDir, `req-${requestId}`);
  const tempCodeownersFile = path.join(tempCodeownersDir, 'CODEOWNERS');

  try {
    // Create unique subdirectory and CODEOWNERS file for this request
    await fsPromises.mkdir(tempCodeownersDir, { recursive: true });
    await fsPromises.writeFile(tempCodeownersFile, codeownersContent);

    // Create codeowners instance (requires exact "CODEOWNERS" filename)
    const codeowners = new Codeowners(tempCodeownersDir);

    // Process all files and return results
    const results = [];
    for (const file of changedFiles) {
      try {
        const owners = codeowners.getOwner(file);
        results.push({ file, owners });
      } catch (fileError) {
        console.warn(`Error getting owners for file ${file}:`);
        console.warn('  File Error Message:', fileError.message);
        console.warn('  File Error Stack:', fileError.stack);
        console.warn('  Request ID:', requestId);
        results.push({ file, owners: [] });
      }
    }

    return results;
  } catch (error) {
    console.warn('Error in analyzeCodeownersContent:');
    console.warn('  Message:', error.message);
    console.warn('  Stack:', error.stack);
    console.warn('  Request ID:', requestId);
    console.warn('  Temp Directory:', tempCodeownersDir);
    console.warn('  Changed Files Count:', changedFiles.length);
    console.warn('  CODEOWNERS Content Length:', codeownersContent.length);

    // Return empty results for all files if there's an error
    return changedFiles.map(file => ({ file, owners: [] }));
  } finally {
    // Clean up request-specific directory - this always runs regardless of success or error
    try {
      await fsPromises.rm(tempCodeownersDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.info(
        `Cleanup failed for Request ID ${requestId} - Temp Directory: ${tempCodeownersDir}`
      );
    }
  }
}

// Shared cleanup function for consistent behavior
function cleanupSharedTempDir(isSync = false) {
  if (sharedBaseTempDir && sharedBaseTempDir !== os.tmpdir()) {
    try {
      if (isSync) {
        fs.rmSync(sharedBaseTempDir, { recursive: true, force: true });
      } else {
        return fsPromises.rm(sharedBaseTempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Silently ignore cleanup errors - errors are now handled by callers where appropriate
    }
  }
}

// Process exit cleanup (synchronous - no async allowed in 'exit' event)
process.on('exit', () => {
  try {
    cleanupSharedTempDir(true);
    // // console.log('🧹 Process exit cleanup completed successfully');
  } catch (error) {
    console.error('❌ Process exit cleanup failed:', error.message);
  }
});

// Graceful shutdown on termination signals (synchronous for reliability)
function handleTerminationSignal(signal) {
  // // console.log(`📤 Received ${signal}, cleaning up...`);
  try {
    cleanupSharedTempDir(true);
    // // console.log(`🧹 ${signal} cleanup completed successfully`);
  } catch (error) {
    console.error(`❌ ${signal} cleanup failed:`, error.message);
  }
  process.exit(0);
}

process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));

// GitHub Teams Support Functions
// fetchTeamMembers function removed (not currently used)

async function fetchTeamDetails(org, teamSlug, token) {
  try {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
    };

    const [teamResponse, membersResponse] = await Promise.all([
      axios.get(`${GITHUB_API_BASE}/orgs/${org}/teams/${teamSlug}`, { headers }),
      axios.get(`${GITHUB_API_BASE}/orgs/${org}/teams/${teamSlug}/members`, { headers }),
    ]);

    const team = teamResponse.data;
    const members = membersResponse.data;

    // Fetch full user details for each team member
    const memberDetailsPromises = members.map(async member => {
      try {
        const userResponse = await axios.get(`${GITHUB_API_BASE}/users/${member.login}`, {
          headers,
        });
        return {
          username: member.login,
          name: userResponse.data.name || member.login, // Use full name if available, fallback to username
          avatar_url: member.avatar_url,
          type: 'user',
        };
      } catch (error) {
        console.warn(`Could not fetch details for user ${member.login}:`, error.message);
        return {
          username: member.login,
          name: member.login, // Fallback to username if API call fails
          avatar_url: member.avatar_url,
          type: 'user',
        };
      }
    });

    const membersWithDetails = await Promise.all(memberDetailsPromises);

    return {
      name: team.name,
      slug: team.slug,
      description: team.description,
      url: team.html_url,
      memberCount: team.members_count,
      members: membersWithDetails,
      type: 'team',
    };
  } catch (error) {
    console.warn(`Could not fetch details for team ${org}/${teamSlug}:`, error.message);
    return {
      name: `${org}/${teamSlug}`,
      slug: teamSlug,
      description: 'Team details unavailable',
      url: null,
      memberCount: 0,
      members: [],
      type: 'team',
    };
  }
}

// isUserInTeams function removed (not currently used)

// Helper function to get the appropriate token for different operations
function getTokenForOperation(userToken, operation = 'repo') {
  // If user provided a token, use it for all operations
  if (userToken) {
    return userToken;
  }

  // Fallback to .env tokens based on operation
  if (operation === 'teams' && GITHUB_TEAMS_TOKEN) {
    return GITHUB_TEAMS_TOKEN;
  }

  return GITHUB_TOKEN;
}

// Get required approvers for a PR
app.post('/api/pr-approvers', async (req, res) => {
  try {
    const { prUrl, githubToken } = req.body;

    if (!prUrl) {
      return res.status(400).json({ error: 'PR URL is required' });
    }

    // Parse GitHub PR URL
    const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid GitHub PR URL format' });
    }

    const [, owner, repo, prNumber] = urlMatch;
    const token = getTokenForOperation(githubToken);

    // Create headers with optional authorization
    const headers = {
      Accept: 'application/vnd.github.v3+json',
    };

    // Add authorization header only if token is provided
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // Fetch PR information
    const prResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers }
    );

    const pr = prResponse.data;

    // Enhanced PR status detection
    let prStatus = pr.state;
    const prStatusDetails = {
      state: pr.state,
      isDraft: pr.draft || false,
      isMerged: pr.merged || false,
      mergeable: pr.mergeable,
      mergeableState: pr.mergeable_state,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    };

    // Determine specific status
    if (pr.merged) {
      prStatus = 'merged';
    } else if (pr.draft) {
      prStatus = 'draft';
    } else if (pr.state === 'closed' && !pr.merged) {
      prStatus = 'closed';
    } else if (pr.state === 'open') {
      prStatus = 'open';
    }

    // Fetch PR files with pagination support
    let changedFiles = [];
    let page = 1;
    const perPage = 100; // GitHub's max per_page for this endpoint is 3000, but 100 is reasonable
    let hasMorePages = true;

    while (hasMorePages) {
      const filesResponse = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files`,
        {
          headers,
          params: {
            per_page: perPage,
            page,
          },
        }
      );

      const files = filesResponse.data.map(file => file.filename);
      changedFiles = changedFiles.concat(files);

      // If we got fewer files than per_page, we've reached the last page
      if (files.length < perPage) {
        hasMorePages = false;
      }

      page++;

      // Safety check to prevent infinite loops (GitHub API shouldn't have more than ~1000 pages)
      if (page > 1000) {
        console.warn(`⚠️  Stopped fetching files at page ${page} - possible infinite loop`);
        hasMorePages = false;
      }
    }

    // // console.log(`📁 Successfully fetched ${changedFiles.length} files from ${page} page(s)`);

    // Fetch CODEOWNERS file
    let codeownersContent = '';
    const codeownersPaths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];

    for (const path of codeownersPaths) {
      try {
        const codeownersResponse = await axios.get(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
          { headers }
        );

        if (codeownersResponse.data.content) {
          codeownersContent = Buffer.from(codeownersResponse.data.content, 'base64').toString();
          break;
        }
      } catch (error) {
        // Continue to next path if file not found
        continue;
      }
    }

    const requiredApprovers = new Set();

    const fileApprovalDetails = [];

    if (codeownersContent) {
      // Use optimized codeowners analysis with reusable temp directory
      try {
        const fileOwnerResults = await analyzeCodeownersContent(codeownersContent, changedFiles);

        // Process each file's owners
        for (const { file, owners: fileOwners } of fileOwnerResults) {
          if (fileOwners && fileOwners.length > 0) {
            // Only accept entries that originally started with @ (valid CODEOWNERS entries)
            const cleanOwners = fileOwners
              .filter(owner => {
                // Must start with @ to be a valid CODEOWNERS entry
                return owner && owner.startsWith('@');
              })
              .map(owner => owner.replace('@', '').trim())
              .filter(owner => {
                // Additional validation for cleaned owner names
                return (
                  owner &&
                  owner.length > 0 &&
                  // Valid GitHub usernames/teams contain only alphanumeric, hyphens, underscores, and forward slashes
                  /^[a-zA-Z0-9\-_/]+$/.test(owner)
                );
              });

            if (cleanOwners.length > 0) {
              fileApprovalDetails.push({
                file,
                pattern: MATCHED_BY_CODEOWNERS,
                owners: cleanOwners,
                ruleIndex: -1,
              });

              // Add owners to the global set
              cleanOwners.forEach(owner => requiredApprovers.add(owner));
            } else {
              fileApprovalDetails.push({
                file,
                pattern: 'No valid owners found',
                owners: [],
                ruleIndex: -1,
              });
            }
          } else {
            fileApprovalDetails.push({
              file,
              pattern: 'No matching rule',
              owners: [],
              ruleIndex: -1,
            });
          }
        }
      } catch (error) {
        console.warn('Error using codeowners library, falling back to no analysis:', error.message);

        // Add all files as having no owners if library fails
        for (const file of changedFiles) {
          fileApprovalDetails.push({
            file,
            pattern: 'Library error - no analysis',
            owners: [],
            ruleIndex: -1,
          });
        }
      }
    }

    // Get current reviews
    const reviewsResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      { headers }
    );

    const reviews = reviewsResponse.data;

    // Get only the latest review from each user (GitHub API returns reviews chronologically)
    const latestReviewByUser = new Map();
    reviews.forEach(review => {
      const username = review.user.login;
      // GitHub API returns reviews in chronological order, so later reviews overwrite earlier ones
      latestReviewByUser.set(username, review);
    });

    // Only count users whose LATEST review state is 'APPROVED' AND who are not currently re-requested
    const currentlyRequestedReviewers = new Set(pr.requested_reviewers?.map(r => r.login) || []);
    const approvals = Array.from(latestReviewByUser.values())
      .filter(
        review => review.state === 'APPROVED' && !currentlyRequestedReviewers.has(review.user.login)
      )
      .map(review => review.user.login);

    // Get requested reviewers
    const requestedReviewers = pr.requested_reviewers?.map(reviewer => reviewer.login) || [];
    const requestedTeams = pr.requested_teams?.map(team => team.name) || [];

    // Calculate minimum required approvers
    const approvedBy = new Set(approvals);

    // Group files by their required approvers to find minimum set
    const approverGroups = new Map();
    const filesByApproverGroup = new Map();
    const filesWithoutOwners = [];

    for (const detail of fileApprovalDetails) {
      if (detail.owners && detail.owners.length > 0) {
        const groupKey = detail.owners.sort().join(',');

        if (!approverGroups.has(groupKey)) {
          approverGroups.set(groupKey, detail.owners);
          filesByApproverGroup.set(groupKey, []);
        }
        filesByApproverGroup.get(groupKey).push(detail.file);
      } else {
        // Track files with no CODEOWNERS rule separately
        filesWithoutOwners.push(detail.file);
      }
    }

    // Fetch team details for any teams referenced in CODEOWNERS or requested teams
    const teamDetails = new Map();
    const teamsToFetch = new Set();

    // Collect teams from CODEOWNERS entries (teams are identified by org/team format)
    Array.from(requiredApprovers).forEach(approver => {
      if (approver.includes('/')) {
        teamsToFetch.add(approver);
      }
    });

    // Add requested teams
    requestedTeams.forEach(team => teamsToFetch.add(team));

    // Fetch team details if we have a token
    const teamsToken = getTokenForOperation(githubToken, 'teams');
    if (teamsToken && teamsToFetch.size > 0) {
      // // console.log('🔍 Fetching team details for:', Array.from(teamsToFetch));

      const teamPromises = Array.from(teamsToFetch).map(async teamName => {
        // Handle both 'org/team' and 'team' formats
        let org, teamSlug;
        if (teamName.includes('/')) {
          [org, teamSlug] = teamName.split('/');
        } else {
          // If no org specified, try to extract from repo owner
          org = owner;
          teamSlug = teamName;
        }

        const details = await fetchTeamDetails(org, teamSlug, teamsToken);
        return { teamName, details };
      });

      const teamResults = await Promise.all(teamPromises);
      teamResults.forEach(({ teamName, details }) => {
        teamDetails.set(teamName, details);
      });
    }

    // Helper function to check if an individual approver satisfies a team requirement
    const checkTeamApproval = (teamName, approvedBy) => {
      const team = teamDetails.get(teamName);
      if (!team || !team.members) return null;

      // Check which individual approvers are team members
      const approvedTeamMembers = [];
      for (const approver of approvedBy) {
        const isMember = team.members.some(member => member.username === approver);
        if (isMember) {
          approvedTeamMembers.push(approver);
        }
      }

      return approvedTeamMembers.length > 0 ? approvedTeamMembers : null;
    };

    // Calculate minimum required approvals with enhanced team support
    const minRequiredApprovals = [];
    const stillNeedApprovalGroups = [];

    for (const [groupKey, owners] of approverGroups) {
      const files = filesByApproverGroup.get(groupKey);
      let hasApproval = false;
      let approver = null;
      let approverType = 'individual'; // 'individual' or 'team'
      let teamName = null;
      let approvedTeamMembers = [];
      const allGroupApprovers = []; // Track all approvers from this group

      // Check each owner (individual or team) for approval
      for (const owner of owners) {
        if (approvedBy.has(owner)) {
          // Direct individual approval
          hasApproval = true;
          allGroupApprovers.push(owner);
          if (!approver) {
            approver = owner; // Set first approver as primary
            approverType = 'individual';
          }
          // Don't break - continue to find all approvers in this group
        } else if (owner.includes('/')) {
          // Check if this is a team and if any approver is a team member
          const teamApprovers = checkTeamApproval(owner, approvedBy);
          if (teamApprovers) {
            hasApproval = true;
            if (!approver) {
              approver = teamApprovers[0]; // Primary approver for display
              approvedTeamMembers = teamApprovers; // All approved team members
              approverType = 'team';
              teamName = owner;
            }
            // Don't break - continue to find all approvers in this group
          }
        }
      }

      if (!hasApproval) {
        // Need at least one approval from this group
        minRequiredApprovals.push({
          files,
          owners,
          needsApproval: true,
          approvedBy: null,
          approverType: null,
          teamName: null,
          approvedTeamMembers: [],
        });
        stillNeedApprovalGroups.push(owners);
      } else {
        // This group is satisfied
        minRequiredApprovals.push({
          files,
          owners,
          needsApproval: false,
          approvedBy: approver,
          approverType,
          teamName,
          approvedTeamMembers,
          allGroupApprovers, // Include all approvers from this group
        });
      }
    }

    // Fetch user details (full names) for all required approvers + current approvers + requested reviewers
    const userDetails = new Map();
    const allUsers = Array.from(
      new Set([...requiredApprovers, ...approvals, ...requestedReviewers])
    );

    // Fetch user info in parallel for better performance
    const userPromises = allUsers.map(async username => {
      try {
        // Skip team names (contain forward slash)
        if (username.includes('/')) {
          return { username, name: username, type: 'team' };
        }

        const userResponse = await axios.get(`${GITHUB_API_BASE}/users/${username}`, { headers });

        return {
          username,
          name: userResponse.data.name || username,
          avatar_url: userResponse.data.avatar_url,
          type: 'user',
        };
      } catch (error) {
        console.warn(`Could not fetch details for user ${username}:`, error.message);
        return { username, name: username, type: 'user' };
      }
    });

    const userDetailsArray = await Promise.all(userPromises);
    userDetailsArray.forEach(details => {
      userDetails.set(details.username, details);
    });

    // Legacy calculation for compatibility
    const stillNeedApproval = Array.from(requiredApprovers).filter(
      approver => !approvedBy.has(approver)
    );

    // Debug information
    // // console.log('=== PR Analysis Debug ===');
    // // console.log('Changed files:', changedFiles.length);
    // // console.log('\nFile-by-file analysis:');
    // fileApprovalDetails.forEach(detail => {
    //   // console.log(`  ${detail.file}`);
    //   // console.log(`    Pattern: ${detail.pattern}`);
    //   // console.log(`    Owners: ${detail.owners.join(', ') || 'None'}`);
    //   if (detail.ruleIndex >= 0) {
    //     // console.log(`    Rule Index: ${detail.ruleIndex} (last matching rule wins)`);
    //   }
    // });
    // // console.log('\nMinimum Required Approvals:');
    minRequiredApprovals.forEach((group, _index) => {
      // console.log(`  Group ${_index + 1}: ${group.files.length} files`);
      // console.log(`    Files: ${group.files.join(', ')}`);
      // console.log(`    Options: ${group.owners.join(', ')}`);
      if (group.needsApproval) {
        // console.log(`    Status: ❌ NEEDS APPROVAL`);
      } else {
        if (group.approverType === 'team') {
          // const membersList =
          //   group.approvedTeamMembers.length > 1
          //     ? `${group.approvedTeamMembers.join(', ')}`
          //     : group.approvedBy;
          // console.log(
          //   `    Status: ✅ Approved by ${group.approvedBy} (member${group.approvedTeamMembers.length > 1 ? 's' : ''} of ${group.teamName})`
          // );
        } else {
          // console.log(`    Status: ✅ Approved by ${group.approvedBy}`);
        }
      }
    });

    // Show files without CODEOWNERS rules
    if (filesWithoutOwners.length > 0) {
      // console.log(`  Files without CODEOWNERS rules: ${filesWithoutOwners.length} files`);
      // console.log(`    Files: ${filesWithoutOwners.join(', ')}`);
      // console.log(`    Status: ⚪ NO APPROVAL REQUIRED (no CODEOWNERS rule)`);
    }

    const totalGroupsNeedingApproval = minRequiredApprovals.filter(g => g.needsApproval).length;
    const totalFilesInGroups = minRequiredApprovals.reduce(
      (sum, group) => sum + group.files.length,
      0
    );
    const totalAccountedFiles = totalFilesInGroups + filesWithoutOwners.length;

    // console.log(`\n📊 MINIMUM APPROVALS NEEDED: ${totalGroupsNeedingApproval} more people`);
    // console.log(
    //   `📈 FILE ACCOUNTING: ${totalAccountedFiles}/${changedFiles.length} files accounted for`
    // );
    if (totalAccountedFiles !== changedFiles.length) {
      // console.log(`⚠️  MISMATCH: ${changedFiles.length - totalAccountedFiles} files unaccounted!`);
    }

    // Include current approvers and requested reviewers in the "all possible" set since they clearly have approval permissions
    const allPossibleApprovers = new Set([
      ...requiredApprovers,
      ...approvals,
      ...requestedReviewers,
    ]);

    // console.log('\n🔍 DETAILED APPROVER ANALYSIS:');
    // console.log('📋 Required approvers (from CODEOWNERS):', Array.from(requiredApprovers));
    // console.log('✅ Current approvals:', approvals);
    // console.log('📝 Requested reviewers:', requestedReviewers);
    // console.log('🔧 Creating allPossibleApprovers set...');
    // console.log('   - Adding required approvers:', Array.from(requiredApprovers));
    // console.log('   - Adding current approvals:', approvals);
    // console.log('   - Adding requested reviewers:', requestedReviewers);
    // console.log(
    // '👥 All possible approvers (required + current + requested):',
    // Array.from(allPossibleApprovers)
    // );

    // Debug: Check if the combination worked
    const missingFromRequired = approvals.filter(approval => !requiredApprovers.has(approval));
    if (missingFromRequired.length > 0) {
      // console.log('⚠️  Current approvers NOT in CODEOWNERS:', missingFromRequired);
      // console.log('✅ These will be added to allPossibleApprovers');
    }

    const requestedNotInRequired = requestedReviewers.filter(
      reviewer => !requiredApprovers.has(reviewer)
    );
    if (requestedNotInRequired.length > 0) {
      // console.log('⚠️  Requested reviewers NOT in CODEOWNERS:', requestedNotInRequired);
      // console.log('✅ These will be added to allPossibleApprovers');
    }

    // console.log('========================');

    // Add user details to each approval group for the new UI
    const enhancedMinRequiredApprovals = minRequiredApprovals.map(group => ({
      ...group,
      ownerDetails: group.owners.map(owner => {
        if (teamDetails.has(owner)) {
          return teamDetails.get(owner);
        }
        return userDetails.get(owner) || { username: owner, name: owner, type: 'user' };
      }),
    }));

    // Extract rate limit information from the last response headers
    const lastResponseHeaders = reviewsResponse.headers;
    let rateLimitInfo = null;

    if (lastResponseHeaders['x-ratelimit-remaining'] !== undefined) {
      const remaining = parseInt(lastResponseHeaders['x-ratelimit-remaining']);
      const resetTimestamp = lastResponseHeaders['x-ratelimit-reset'];
      const limit = parseInt(lastResponseHeaders['x-ratelimit-limit']);

      if (resetTimestamp) {
        const resetTime = new Date(parseInt(resetTimestamp) * 1000);
        const now = new Date();
        const minutesUntilReset = Math.ceil((resetTime - now) / (1000 * 60));

        rateLimitInfo = {
          remaining: parseInt(remaining),
          limit: parseInt(limit),
          resetTime: resetTime.toISOString(),
          resetTimestamp: parseInt(resetTimestamp),
          minutesUntilReset: Math.max(0, minutesUntilReset),
          resetTimeFormatted: resetTime.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          }),
          showWarning: parseInt(remaining) < 100, // Only show warning when < 100 requests remaining
        };
      }
    }

    const result = {
      prInfo: {
        title: pr.title,
        number: pr.number,
        author: pr.user.login,
        state: prStatus,
        url: pr.html_url,
        statusDetails: prStatusDetails,
      },
      changedFiles,
      fileApprovalDetails,
      minRequiredApprovals: enhancedMinRequiredApprovals,
      filesWithoutOwners,
      totalGroupsNeedingApproval,
      minApprovalsNeeded: totalGroupsNeedingApproval,
      requiredApprovers: Array.from(requiredApprovers),
      allPossibleApprovers: Array.from(allPossibleApprovers),
      allUserDetails: userDetailsArray,
      userDetails: Object.fromEntries(userDetails),
      teamDetails: Object.fromEntries(teamDetails),
      teamsConfigured: getTokenForOperation(githubToken, 'teams') ? true : false,
      approvals,
      currentApprovals: approvals,
      stillNeedApproval,
      requestedReviewers,
      requestedTeams,
      isReadyToMerge: totalGroupsNeedingApproval === 0 && minRequiredApprovals.length > 0,
      rateLimitInfo,
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching PR information:', error.response?.data || error.message);
    console.error('Full error:', error);

    // More detailed error information
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    };

    console.error('Error details:', errorDetails);

    let userFriendlyError = 'Failed to fetch PR information';
    let rateLimitInfo = null;

    if (error.response?.status === 401) {
      userFriendlyError = 'GitHub authentication failed. Please check your token.';
    } else if (error.response?.status === 403) {
      // Extract rate limit information from headers
      const headers = error.response.headers;
      const remaining = headers['x-ratelimit-remaining'];
      const resetTimestamp = headers['x-ratelimit-reset'];
      const limit = headers['x-ratelimit-limit'];

      if (remaining !== undefined && resetTimestamp) {
        const resetTime = new Date(parseInt(resetTimestamp) * 1000);
        const now = new Date();
        const minutesUntilReset = Math.ceil((resetTime - now) / (1000 * 60));

        rateLimitInfo = {
          remaining: parseInt(remaining),
          limit: parseInt(limit),
          resetTime: resetTime.toISOString(),
          resetTimestamp: parseInt(resetTimestamp),
          minutesUntilReset: Math.max(0, minutesUntilReset),
          resetTimeFormatted: resetTime.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          }),
          showWarning: parseInt(remaining) < 100, // Only show warning when < 100 requests remaining
        };

        // Only show rate limit error if remaining requests are less than 100
        if (parseInt(remaining) < 100) {
          if (minutesUntilReset > 0) {
            userFriendlyError = `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Rate limit resets in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} at ${rateLimitInfo.resetTimeFormatted}. Try adding a GitHub token for higher limits.`;
          } else {
            userFriendlyError =
              'GitHub API rate limit exceeded. Try adding a GitHub token for higher limits.';
          }
        } else {
          // If we have 100+ requests remaining, this might be a different 403 error
          userFriendlyError =
            'GitHub API access denied. This might be due to insufficient permissions or repository access restrictions.';
        }
      } else {
        userFriendlyError =
          'GitHub API access denied. This might be due to insufficient permissions or repository access restrictions.';
      }
    } else if (error.response?.status === 404) {
      userFriendlyError =
        'PR not found. Please check the URL and ensure the repository is accessible.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      userFriendlyError = 'Network error. Please check your internet connection.';
    }

    res.status(500).json({
      error: userFriendlyError,
      details: error.response?.data?.message || error.message,
      rateLimitInfo,
      debug: errorDetails,
    });
  }
});

// 404 handler for all other unmatched routes (including APIs)
app.use((req, res, _next) => {
  res.status(404).json({ error: 'Not found' });
});

// Cleanup function for tests
const cleanup = async () => {
  return new Promise(resolve => {
    if (emailTransporter && typeof emailTransporter.close === 'function') {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        emailTransporter = null;
        resolve();
      }, 1000);

      emailTransporter.close(() => {
        clearTimeout(timeout);
        emailTransporter = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    // console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
module.exports.cleanup = cleanup;
