/**
 * PR Approval Finder v5.0 - Server
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Helper function to parse CODEOWNERS file
function parseCodeowners(codeownersContent) {
  const lines = codeownersContent.split('\n');
  const rules = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle inline comments - split on # and take only the part before it
    const lineWithoutComments = trimmed.split('#')[0].trim();
    if (!lineWithoutComments) continue;

    const parts = lineWithoutComments.split(/\s+/);
    if (parts.length >= 2) {
      const pattern = parts[0];
      const owners = parts
        .slice(1)
        .map(owner => owner.replace('@', '').trim())
        .filter(owner => owner && !owner.startsWith('#')); // Filter out any remaining comments

      if (owners.length > 0) {
        rules.push({ pattern, owners });
      }
    }
  }

  return rules;
}

// Helper function to match file paths against CODEOWNERS patterns
function matchPattern(pattern, filePath) {
  // Handle different CODEOWNERS pattern types

  // Root-level pattern (starts with /)
  if (pattern.startsWith('/')) {
    pattern = pattern.substring(1);
  }

  // Directory pattern (ends with /)
  if (pattern.endsWith('/')) {
    return filePath.startsWith(pattern) || filePath.startsWith(`${pattern.slice(0, -1)}/`);
  }

  // Exact file match
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return filePath === pattern || filePath.endsWith(`/${pattern}`);
  }

  // Glob pattern matching
  // First escape dots, then handle ** and * carefully to avoid conflicts
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '__DOUBLE_STAR__') // Temporary placeholder
    .replace(/\*/g, '[^/]*') // * matches anything except directory separator
    .replace(/__DOUBLE_STAR__/g, '.*') // ** matches any number of directories
    .replace(/\?/g, '[^/]'); // ? matches single character except directory separator

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

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
    const token = githubToken || GITHUB_TOKEN;

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
      // Parse CODEOWNERS and find required approvers
      const rules = parseCodeowners(codeownersContent);

      // IMPORTANT: GitHub CODEOWNERS uses "last matching rule wins" behavior
      // This means if multiple patterns match a file, the pattern that appears
      // later in the CODEOWNERS file takes precedence (similar to .gitignore)

      // For each changed file, find the last matching rule (GitHub CODEOWNERS behavior)
      for (const file of changedFiles) {
        let lastMatchingRule = null;

        // Iterate through rules in order and keep track of the last one that matches
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          if (matchPattern(rule.pattern, file)) {
            lastMatchingRule = { ...rule, ruleIndex: i };
          }
        }

        // Use the last matching rule (this follows GitHub CODEOWNERS specification)
        const selectedRule = lastMatchingRule;

        if (selectedRule) {
          fileApprovalDetails.push({
            file,
            pattern: selectedRule.pattern,
            owners: selectedRule.owners,
            ruleIndex: selectedRule.ruleIndex,
          });

          // Add owners to the global set
          selectedRule.owners.forEach(owner => requiredApprovers.add(owner));
        } else {
          fileApprovalDetails.push({
            file,
            pattern: 'No matching rule',
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

    // Calculate minimum required approvals
    const minRequiredApprovals = [];
    const stillNeedApprovalGroups = [];

    for (const [groupKey, owners] of approverGroups) {
      const files = filesByApproverGroup.get(groupKey);
      const hasApproval = owners.some(owner => approvedBy.has(owner));

      if (!hasApproval) {
        // Need at least one approval from this group
        minRequiredApprovals.push({
          files,
          owners,
          needsApproval: true,
          approvedBy: null,
        });
        stillNeedApprovalGroups.push(owners);
      } else {
        // This group is satisfied
        const approver = owners.find(owner => approvedBy.has(owner));
        minRequiredApprovals.push({
          files,
          owners,
          needsApproval: false,
          approvedBy: approver,
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
      console.log(
        `    Status: ${group.needsApproval ? '❌ NEEDS APPROVAL' : `✅ Approved by ${group.approvedBy}`}`
      );
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

    // Fetch team details if we have a teams token
    if (GITHUB_TEAMS_TOKEN && teamsToFetch.size > 0) {
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

        const details = await fetchTeamDetails(org, teamSlug, GITHUB_TEAMS_TOKEN);
        return { teamName, details };
      });

      const teamResults = await Promise.all(teamPromises);
      teamResults.forEach(({ teamName, details }) => {
        teamDetails.set(teamName, details);
      });
    }

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
      const remaining = lastResponseHeaders['x-ratelimit-remaining'];
      const resetTimestamp = lastResponseHeaders['x-ratelimit-reset'];
      const limit = lastResponseHeaders['x-ratelimit-limit'];

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
        };
      }
    }

    const result = {
      prInfo: {
        title: pr.title,
        number: pr.number,
        author: pr.user.login,
        state: pr.state,
        url: pr.html_url,
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
      teamsConfigured: GITHUB_TEAMS_TOKEN ? true : false,
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
        };

        if (minutesUntilReset > 0) {
          userFriendlyError = `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Rate limit resets in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} at ${rateLimitInfo.resetTimeFormatted}. Try adding a GitHub token for higher limits.`;
        } else {
          userFriendlyError =
            'GitHub API rate limit exceeded. Try adding a GitHub token for higher limits.';
        }
      } else {
        userFriendlyError =
          'GitHub API rate limit exceeded or insufficient permissions. Try adding a GitHub token.';
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

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
