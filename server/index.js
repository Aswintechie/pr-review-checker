/**
 * PR Approval Finder v5.0 - Server
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

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
      const owners = parts.slice(1)
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
    return filePath.startsWith(pattern) || filePath.startsWith(pattern.slice(0, -1) + '/');
  }
  
  // Exact file match
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return filePath === pattern || filePath.endsWith('/' + pattern);
  }
  
  // Glob pattern matching
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')  // ** matches any number of directories
    .replace(/\*/g, '[^/]*') // * matches anything except directory separator
    .replace(/\?/g, '[^/]'); // ? matches single character except directory separator
  
  const regex = new RegExp('^' + regexPattern + '$');
  return regex.test(filePath);
}

// Get required approvers for a PR
app.post('/api/pr-approvers', async (req, res) => {
  try {
    const { prUrl, githubToken } = req.body;
    
    if (!prUrl) {
      return res.status(400).json({ error: 'PR URL is required' });
    }

    // Parse GitHub PR URL
    const urlMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid GitHub PR URL format' });
    }

    const [, owner, repo, prNumber] = urlMatch;
    const token = githubToken || GITHUB_TOKEN;

    // Create headers with optional authorization
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
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

    // Fetch PR files
    const filesResponse = await axios.get(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers }
    );

    const changedFiles = filesResponse.data.map(file => file.filename);

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

    let requiredApprovers = new Set();

    let fileApprovalDetails = [];
    
    if (codeownersContent) {
      // Parse CODEOWNERS and find required approvers
      const rules = parseCodeowners(codeownersContent);
      
      // For each changed file, find the most specific matching rule
      for (const file of changedFiles) {
        let matchedRules = [];
        
        for (const rule of rules) {
          if (matchPattern(rule.pattern, file)) {
            matchedRules.push({
              ...rule,
              specificity: rule.pattern.length + (rule.pattern.includes('*') ? 0 : 10)
            });
          }
        }
        
        // Sort by specificity (more specific patterns first, later rules override earlier ones)
        matchedRules.sort((a, b) => {
          // First sort by specificity, then by order in file (later rules win)
          if (a.specificity !== b.specificity) {
            return b.specificity - a.specificity;
          }
          return 0; // Keep original order for same specificity
        });
        
        // Take the most specific rule (CODEOWNERS typically uses the most specific match)
        const mostSpecificRule = matchedRules[0];
        
        if (mostSpecificRule) {
          fileApprovalDetails.push({
            file: file,
            pattern: mostSpecificRule.pattern,
            owners: mostSpecificRule.owners
          });
          
          // Add owners to the global set
          mostSpecificRule.owners.forEach(owner => requiredApprovers.add(owner));
        } else {
          fileApprovalDetails.push({
            file: file,
            pattern: 'No matching rule',
            owners: []
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
    
    for (const detail of fileApprovalDetails) {
      if (detail.owners && detail.owners.length > 0) {
        const groupKey = detail.owners.sort().join(',');
        
        if (!approverGroups.has(groupKey)) {
          approverGroups.set(groupKey, detail.owners);
          filesByApproverGroup.set(groupKey, []);
        }
        filesByApproverGroup.get(groupKey).push(detail.file);
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
          files: files,
          owners: owners,
          needsApproval: true,
          approvedBy: null
        });
        stillNeedApprovalGroups.push(owners);
      } else {
        // This group is satisfied
        const approver = owners.find(owner => approvedBy.has(owner));
        minRequiredApprovals.push({
          files: files,
          owners: owners,
          needsApproval: false,
          approvedBy: approver
        });
      }
    }
    
    // Fetch user details (full names) for all required approvers
    const userDetails = new Map();
    const allUsers = Array.from(requiredApprovers);
    
    // Fetch user info in parallel for better performance
    const userPromises = allUsers.map(async (username) => {
      try {
        // Skip team names (contain forward slash)
        if (username.includes('/')) {
          return { username, name: username, type: 'team' };
        }
        
        const userResponse = await axios.get(
          `${GITHUB_API_BASE}/users/${username}`,
          { headers }
        );
        
        return {
          username: username,
          name: userResponse.data.name || username,
          avatar_url: userResponse.data.avatar_url,
          type: 'user'
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
    const stillNeedApproval = Array.from(requiredApprovers).filter(approver => !approvedBy.has(approver));

    // Debug information
    console.log('=== PR Analysis Debug ===');
    console.log('Changed files:', changedFiles.length);
    console.log('\nFile-by-file analysis:');
    fileApprovalDetails.forEach(detail => {
      console.log(`  ${detail.file}`);
      console.log(`    Pattern: ${detail.pattern}`);
      console.log(`    Owners: ${detail.owners.join(', ') || 'None'}`);
    });
    console.log('\nMinimum Required Approvals:');
    minRequiredApprovals.forEach((group, index) => {
      console.log(`  Group ${index + 1}: ${group.files.length} files`);
      console.log(`    Files: ${group.files.join(', ')}`);
      console.log(`    Options: ${group.owners.join(', ')}`);
      console.log(`    Status: ${group.needsApproval ? '❌ NEEDS APPROVAL' : `✅ Approved by ${group.approvedBy}`}`);
         });
     
     const totalGroupsNeedingApproval = minRequiredApprovals.filter(g => g.needsApproval).length;
     console.log(`\n📊 MINIMUM APPROVALS NEEDED: ${totalGroupsNeedingApproval} more people`);
     
     console.log('\nSummary:');
     console.log('All possible approvers:', Array.from(requiredApprovers));
     console.log('Current approvals:', approvals);
     console.log('Requested reviewers:', requestedReviewers);
     console.log('========================');
    
    // Add user details to each approval group for the new UI
    const enhancedMinRequiredApprovals = minRequiredApprovals.map(group => ({
      ...group,
      ownerDetails: group.owners.map(owner => userDetails.get(owner) || { username: owner, name: owner, type: 'user' })
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
            timeZoneName: 'short'
          })
        };
      }
    }

    const result = {
      prInfo: {
        title: pr.title,
        number: pr.number,
        author: pr.user.login,
        state: pr.state,
        url: pr.html_url
      },
      changedFiles: changedFiles,
      fileApprovalDetails: fileApprovalDetails,
      minRequiredApprovals: enhancedMinRequiredApprovals,
      totalGroupsNeedingApproval: totalGroupsNeedingApproval,
      minApprovalsNeeded: totalGroupsNeedingApproval,
      requiredApprovers: Array.from(requiredApprovers),
      allUserDetails: userDetailsArray,
      userDetails: Object.fromEntries(userDetails),
      approvals: approvals,
      currentApprovals: approvals,
      stillNeedApproval: stillNeedApproval,
      requestedReviewers: requestedReviewers,
      requestedTeams: requestedTeams,
      isReadyToMerge: totalGroupsNeedingApproval === 0 && minRequiredApprovals.length > 0,
      rateLimitInfo: rateLimitInfo
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
      url: error.config?.url
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
            timeZoneName: 'short'
          })
        };
        
        if (minutesUntilReset > 0) {
          userFriendlyError = `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Rate limit resets in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''} at ${rateLimitInfo.resetTimeFormatted}. Try adding a GitHub token for higher limits.`;
        } else {
          userFriendlyError = 'GitHub API rate limit exceeded. Try adding a GitHub token for higher limits.';
        }
      } else {
        userFriendlyError = 'GitHub API rate limit exceeded or insufficient permissions. Try adding a GitHub token.';
      }
    } else if (error.response?.status === 404) {
      userFriendlyError = 'PR not found. Please check the URL and ensure the repository is accessible.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      userFriendlyError = 'Network error. Please check your internet connection.';
    }
    
    res.status(500).json({ 
      error: userFriendlyError,
      details: error.response?.data?.message || error.message,
      rateLimitInfo: rateLimitInfo,
      debug: errorDetails
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 