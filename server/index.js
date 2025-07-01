/**
 * PR Approval Finder v5.0 - Server
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Codeowners = require('codeowners');
require('dotenv').config();

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
    console.log('\n📝 New Feedback Received:');
    console.log('========================');
    console.log(`Type: ${type || 'feedback'}`);
    console.log(`Rating: ${rating || 5}/5`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    if (name) console.log(`Name: ${name}`);
    if (email) console.log(`Email: ${email}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log('========================\n');

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
        console.log('📧 Email notification sent successfully to', process.env.FEEDBACK_EMAIL);
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
const GITHUB_API_BASE = 'https://api.github.com';

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
      console.log('📧 Email server is ready to send feedback notifications');
    }
  });
} else {
  console.log('📧 No email configuration found - feedback will only be logged to console');
}

// Optimized temp directory management with shared base directory
let sharedBaseTempDir = null;

// Initialize shared base directory at startup for optimal performance
async function initializeSharedBaseDir() {
  if (!sharedBaseTempDir) {
    const tempDir = os.tmpdir();
    sharedBaseTempDir = path.join(tempDir, 'codeowners-base');
    try {
      await fs.promises.mkdir(sharedBaseTempDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create shared base temp directory:', error.message);
      // Fallback to using system temp directory directly
      sharedBaseTempDir = tempDir;
    }
  }
}

// Thread-safe CODEOWNERS analysis with optimized directory management
async function analyzeCodeownersContent(codeownersContent, changedFiles) {
  // Ensure shared base directory exists
  await initializeSharedBaseDir();

  // Create unique subdirectory for this request to avoid race conditions
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tempCodeownersDir = path.join(sharedBaseTempDir, `req-${requestId}`);
  const tempCodeownersFile = path.join(tempCodeownersDir, 'CODEOWNERS');

  try {
    // Create unique subdirectory and CODEOWNERS file for this request
    await fs.promises.mkdir(tempCodeownersDir, { recursive: true });
    await fs.promises.writeFile(tempCodeownersFile, codeownersContent);

    // Create codeowners instance (requires exact "CODEOWNERS" filename)
    const codeowners = new Codeowners(tempCodeownersDir);

    // Process all files and return results
    const results = [];
    for (const file of changedFiles) {
      try {
        const owners = codeowners.getOwner(file);
        results.push({ file, owners });
      } catch (fileError) {
        console.warn(`Error getting owners for file ${file}:`, fileError.message);
        results.push({ file, owners: [] });
      }
    }

    // Clean up request-specific directory immediately after use
    await fs.promises.rm(tempCodeownersDir, { recursive: true, force: true });

    return results;
  } catch (error) {
    console.warn('Error in analyzeCodeownersContent:', error.message);

    // Clean up request-specific directory on error
    try {
      await fs.promises.access(tempCodeownersDir);
      await fs.promises.rm(tempCodeownersDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Cleanup failed, which is fine
    }

    // Return empty results for all files if there's an error
    return changedFiles.map(file => ({ file, owners: [] }));
  }
}

// Cleanup shared base directory on process exit
process.on('exit', () => {
  if (sharedBaseTempDir && sharedBaseTempDir !== os.tmpdir()) {
    try {
      fs.rmSync(sharedBaseTempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors during exit
    }
  }
});

process.on('SIGINT', async () => {
  if (sharedBaseTempDir && sharedBaseTempDir !== os.tmpdir()) {
    try {
      await fs.promises.rm(sharedBaseTempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors during shutdown
    }
  }
  process.exit(0);
});

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

    console.log(`📁 Successfully fetched ${changedFiles.length} files from ${page} page(s)`);

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
                pattern: 'Matched by codeowners library',
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
    const approvals = reviews
      .filter(review => review.state === 'APPROVED')
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
      console.log('🔍 Fetching team details for:', Array.from(teamsToFetch));

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

      // Check each owner (individual or team) for approval
      for (const owner of owners) {
        if (approvedBy.has(owner)) {
          // Direct individual approval
          hasApproval = true;
          approver = owner;
          approverType = 'individual';
          break;
        } else if (owner.includes('/')) {
          // Check if this is a team and if any approver is a team member
          const teamApprovers = checkTeamApproval(owner, approvedBy);
          if (teamApprovers) {
            hasApproval = true;
            approver = teamApprovers[0]; // Primary approver for display
            approvedTeamMembers = teamApprovers; // All approved team members
            approverType = 'team';
            teamName = owner;
            break;
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
    console.log('=== PR Analysis Debug ===');
    console.log('Changed files:', changedFiles.length);
    console.log('\nFile-by-file analysis:');
    fileApprovalDetails.forEach(detail => {
      console.log(`  ${detail.file}`);
      console.log(`    Pattern: ${detail.pattern}`);
      console.log(`    Owners: ${detail.owners.join(', ') || 'None'}`);
      if (detail.ruleIndex >= 0) {
        console.log(`    Rule Index: ${detail.ruleIndex} (last matching rule wins)`);
      }
    });
    console.log('\nMinimum Required Approvals:');
    minRequiredApprovals.forEach((group, index) => {
      console.log(`  Group ${index + 1}: ${group.files.length} files`);
      console.log(`    Files: ${group.files.join(', ')}`);
      console.log(`    Options: ${group.owners.join(', ')}`);
      if (group.needsApproval) {
        console.log(`    Status: ❌ NEEDS APPROVAL`);
      } else {
        if (group.approverType === 'team') {
          const membersList =
            group.approvedTeamMembers.length > 1
              ? `${group.approvedTeamMembers.join(', ')}`
              : group.approvedBy;
          console.log(
            `    Status: ✅ Approved by ${membersList} (member${group.approvedTeamMembers.length > 1 ? 's' : ''} of ${group.teamName})`
          );
        } else {
          console.log(`    Status: ✅ Approved by ${group.approvedBy}`);
        }
      }
    });

    // Show files without CODEOWNERS rules
    if (filesWithoutOwners.length > 0) {
      console.log(`  Files without CODEOWNERS rules: ${filesWithoutOwners.length} files`);
      console.log(`    Files: ${filesWithoutOwners.join(', ')}`);
      console.log(`    Status: ⚪ NO APPROVAL REQUIRED (no CODEOWNERS rule)`);
    }

    const totalGroupsNeedingApproval = minRequiredApprovals.filter(g => g.needsApproval).length;
    const totalFilesInGroups = minRequiredApprovals.reduce(
      (sum, group) => sum + group.files.length,
      0
    );
    const totalAccountedFiles = totalFilesInGroups + filesWithoutOwners.length;

    console.log(`\n📊 MINIMUM APPROVALS NEEDED: ${totalGroupsNeedingApproval} more people`);
    console.log(
      `📈 FILE ACCOUNTING: ${totalAccountedFiles}/${changedFiles.length} files accounted for`
    );
    if (totalAccountedFiles !== changedFiles.length) {
      console.log(`⚠️  MISMATCH: ${changedFiles.length - totalAccountedFiles} files unaccounted!`);
    }

    // Include current approvers and requested reviewers in the "all possible" set since they clearly have approval permissions
    const allPossibleApprovers = new Set([
      ...requiredApprovers,
      ...approvals,
      ...requestedReviewers,
    ]);

    console.log('\n🔍 DETAILED APPROVER ANALYSIS:');
    console.log('📋 Required approvers (from CODEOWNERS):', Array.from(requiredApprovers));
    console.log('✅ Current approvals:', approvals);
    console.log('📝 Requested reviewers:', requestedReviewers);
    console.log('🔧 Creating allPossibleApprovers set...');
    console.log('   - Adding required approvers:', Array.from(requiredApprovers));
    console.log('   - Adding current approvals:', approvals);
    console.log('   - Adding requested reviewers:', requestedReviewers);
    console.log(
      '👥 All possible approvers (required + current + requested):',
      Array.from(allPossibleApprovers)
    );

    // Debug: Check if the combination worked
    const missingFromRequired = approvals.filter(approval => !requiredApprovers.has(approval));
    if (missingFromRequired.length > 0) {
      console.log('⚠️  Current approvers NOT in CODEOWNERS:', missingFromRequired);
      console.log('✅ These will be added to allPossibleApprovers');
    }

    const requestedNotInRequired = requestedReviewers.filter(
      reviewer => !requiredApprovers.has(reviewer)
    );
    if (requestedNotInRequired.length > 0) {
      console.log('⚠️  Requested reviewers NOT in CODEOWNERS:', requestedNotInRequired);
      console.log('✅ These will be added to allPossibleApprovers');
    }

    console.log('========================');

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

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
