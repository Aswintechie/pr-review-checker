/**
 * ML-based CODEOWNERS prediction system
 * Trains on actual CODEOWNERS group assignments and approval history
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class MLCodeownersTrainer {
  constructor() {
    this.trainingData = [];
    this.groupApprovalStats = new Map(); // group -> { approvers: Map(approver -> count), totalApprovals: number }
    this.approverStats = new Map(); // approver -> { groups: Set, totalApprovals: number }
    this.isModelTrained = false;
  }

  /**
   * Fetch recent merged PRs
   */
  async fetchRecentPRs(owner, repo, token, count = 50) {
    try {
      console.log(`🔍 Fetching last ${count} merged PRs from ${owner}/${repo}...`);
      
      const mergedPRs = [];
      let page = 1;
      const perPage = Math.min(100, count); // GitHub API max is 100 per page
      
      while (mergedPRs.length < count && page <= 10) { // Limit to 10 pages to avoid infinite loops
        console.log(`📄 Fetching page ${page} (${mergedPRs.length}/${count} merged PRs found so far)`);
        
        const response = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
            params: {
              state: 'closed',
              sort: 'updated',
              direction: 'desc',
              per_page: perPage,
              page: page,
            },
          }
        );
        
        if (response.data.length === 0) {
          console.log('📭 No more PRs found');
          break;
        }
        
        // Filter for merged PRs and add them
        const pageMergedPRs = response.data.filter(pr => pr.merged_at !== null);
        mergedPRs.push(...pageMergedPRs);
        
        console.log(`✅ Found ${pageMergedPRs.length} merged PRs on page ${page}`);
        
        // If we got fewer than perPage results, we've reached the end
        if (response.data.length < perPage) {
          console.log('📝 Reached end of available PRs');
          break;
        }
        
        page++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const finalPRs = mergedPRs.slice(0, count);
      console.log(`🎯 Returning ${finalPRs.length} merged PRs for training`);
      
      return finalPRs;
    } catch (error) {
      console.error('❌ Error fetching PRs:', error.message);
      throw error;
    }
  }

  /**
   * Get PR files and reviews for a specific PR
   */
  async getPRDetails(owner, repo, prNumber, token) {
    try {
      const [filesResponse, reviewsResponse] = await Promise.all([
        axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        ),
        axios.get(
          `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        ),
      ]);

      const files = filesResponse.data.map(file => file.filename);
      const approvers = reviewsResponse.data
        .filter(review => review.state === 'APPROVED')
        .map(review => review.user.login);

      return { files, approvers };
    } catch (error) {
      console.error(`❌ Error fetching PR #${prNumber} details:`, error.message);
      return { files: [], approvers: [] };
    }
  }

  /**
   * Analyze files using CODEOWNERS logic - simplified approach
   */
  async analyzeFilesWithCodeowners(owner, repo, files, token) {
    try {
      // Try multiple possible CODEOWNERS locations
      const possiblePaths = [
        '.github/CODEOWNERS',
        'CODEOWNERS',
        'docs/CODEOWNERS'
      ];

      let codeownersContent = null;
      
      for (const path of possiblePaths) {
        try {
          console.log(`🔍 Trying to fetch CODEOWNERS from: ${path}`);
          
          const headers = {
            Accept: 'application/vnd.github.v3+json',
          };
          
          // Only add authorization if token is provided
          if (token && token.trim()) {
            headers.Authorization = `token ${token}`;
          }

          const codeownersResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            { headers }
          );

          codeownersContent = Buffer.from(codeownersResponse.data.content, 'base64').toString('utf-8');
          console.log(`✅ Found CODEOWNERS at: ${path}`);
          break;
        } catch (pathError) {
          console.log(`⚠️ CODEOWNERS not found at: ${path} (${pathError.response?.status || pathError.message})`);
          continue;
        }
      }

      if (!codeownersContent) {
        console.log('❌ No CODEOWNERS file found in any standard location');
        return [];
      }
      
      // Parse CODEOWNERS and create groups based on files
      const groups = this.createGroupsFromFiles(files, codeownersContent);
      console.log(`📊 Created ${groups.length} approval groups from CODEOWNERS`);
      return groups;
    } catch (error) {
      console.error('❌ Error analyzing files with CODEOWNERS:', error.message);
      return [];
    }
  }

  /**
   * Create approval groups from files and CODEOWNERS content
   */
  createGroupsFromFiles(files, codeownersContent) {
    const groups = [];
    const fileGroups = new Map(); // pattern -> files
    
    // Parse CODEOWNERS
    const rules = [];
    const lines = codeownersContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;
      
      const pattern = parts[0];
      const owners = parts.slice(1).map(owner => owner.replace('@', ''));
      rules.push({ pattern, owners });
    }
    
    // Group files by their matching patterns
    files.forEach(file => {
      let matchedRule = null;
      
      // Find the last matching rule (CODEOWNERS uses last match wins)
      for (const rule of rules) {
        if (this.matchesPattern(rule.pattern, file)) {
          matchedRule = rule;
        }
      }
      
      if (matchedRule) {
        const groupKey = matchedRule.owners.sort().join('_');
        if (!fileGroups.has(groupKey)) {
          fileGroups.set(groupKey, {
            files: [],
            owners: matchedRule.owners,
            pattern: matchedRule.pattern
          });
        }
        fileGroups.get(groupKey).files.push(file);
      }
    });
    
    // Convert to groups format
    let groupIndex = 0;
    for (const [groupKey, groupData] of fileGroups) {
      groups.push({
        files: groupData.files,
        ownerDetails: groupData.owners.map(owner => ({
          username: owner,
          type: owner.includes('/') ? 'team' : 'user'
        })),
        pattern: groupData.pattern,
        groupIndex: groupIndex++
      });
    }
    
    return groups;
  }

  /**
   * Simple pattern matching for CODEOWNERS
   */
  matchesPattern(pattern, filePath) {
    // Convert CODEOWNERS pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^/]*')
      .replace(/\*\*/g, '.*');
    
    // Handle directory patterns
    if (pattern.endsWith('/')) {
      regexPattern = regexPattern + '.*';
    }
    
    // Anchor the pattern
    if (!pattern.startsWith('/')) {
      regexPattern = '(^|/)' + regexPattern;
    } else {
      regexPattern = '^' + regexPattern.slice(1);
    }
    
    if (!pattern.includes('.') && !pattern.endsWith('*')) {
      regexPattern = regexPattern + '(/|$)';
    }
    
    try {
      const regex = new RegExp(regexPattern);
      return regex.test(filePath);
    } catch (error) {
      console.error(`❌ Invalid pattern: ${pattern}`, error.message);
      return false;
    }
  }

  /**
   * Train the model with PR data using CODEOWNERS groups
   */
  async trainModel(owner, repo, token, prCount = 50) {
    console.log('🤖 Starting CODEOWNERS-based ML training...');
    
    try {
      // Fetch recent PRs
      const prs = await this.fetchRecentPRs(owner, repo, token, prCount);
      console.log(`📊 Found ${prs.length} merged PRs for training`);
      
      // Process each PR
      for (const pr of prs.slice(0, Math.min(prCount, prs.length))) {
        console.log(`🔄 Processing PR #${pr.number}: ${pr.title}`);
        
        const { files, approvers } = await this.getPRDetails(owner, repo, pr.number, token);
        
        if (files.length === 0 || approvers.length === 0) {
          console.log(`⚠️ Skipping PR #${pr.number} - no files or approvers`);
          continue;
        }

        // Analyze files using CODEOWNERS logic
        const codeownersGroups = await this.analyzeFilesWithCodeowners(owner, repo, files, token);
        
        if (codeownersGroups.length === 0) {
          console.log(`⚠️ Skipping PR #${pr.number} - no CODEOWNERS groups found`);
          continue;
        }

        // Store training data
        this.trainingData.push({
          prNumber: pr.number,
          title: pr.title,
          files,
          codeownersGroups,
          approvers,
          createdAt: pr.created_at,
          mergedAt: pr.merged_at,
        });

        // Update group approval statistics
        codeownersGroups.forEach((group, groupIndex) => {
          const groupKey = `group_${groupIndex}_${group.ownerDetails.map(o => o.username).sort().join('_')}`;
          
          if (!this.groupApprovalStats.has(groupKey)) {
            this.groupApprovalStats.set(groupKey, {
              approvers: new Map(),
              totalApprovals: 0,
              groupInfo: {
                files: group.files,
                owners: group.ownerDetails.map(o => o.username)
              }
            });
          }

          const groupStats = this.groupApprovalStats.get(groupKey);
          
          // Check which approvers from this group actually approved
          const groupOwners = group.ownerDetails.map(o => o.username);
          const groupApprovers = approvers.filter(approver => groupOwners.includes(approver));
          
          groupApprovers.forEach(approver => {
            const currentCount = groupStats.approvers.get(approver) || 0;
            groupStats.approvers.set(approver, currentCount + 1);
            groupStats.totalApprovals++;
          });
        });

        // Update approver statistics
        approvers.forEach(approver => {
          if (!this.approverStats.has(approver)) {
            this.approverStats.set(approver, {
              groups: new Set(),
              totalApprovals: 0
            });
          }
          
          const approverData = this.approverStats.get(approver);
          approverData.totalApprovals++;
          
          // Add groups this approver has worked on
          codeownersGroups.forEach((group, groupIndex) => {
            const groupKey = `group_${groupIndex}_${group.ownerDetails.map(o => o.username).sort().join('_')}`;
            const groupOwners = group.ownerDetails.map(o => o.username);
            if (groupOwners.includes(approver)) {
              approverData.groups.add(groupKey);
            }
          });
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      this.isModelTrained = true;
      console.log('✅ CODEOWNERS-based model training completed!');
      console.log(`📈 Training data: ${this.trainingData.length} PRs`);
      console.log(`🎯 CODEOWNERS groups: ${this.groupApprovalStats.size}`);
      console.log(`👥 Unique approvers: ${this.approverStats.size}`);
      
      return this.generateModelSummary();
    } catch (error) {
      console.error('❌ Training failed:', error.message);
      throw error;
    }
  }

  /**
   * Predict approvers for given files using CODEOWNERS groups
   */
  async predictApprovers(owner, repo, files, token, confidence = 0.3) {
    if (!this.isModelTrained) {
      throw new Error('Model not trained yet. Please train the model first.');
    }
    
    try {
      // Analyze files using CODEOWNERS logic
      const codeownersGroups = await this.analyzeFilesWithCodeowners(owner, repo, files, token);
      
      if (codeownersGroups.length === 0) {
        return { predictions: [], matchedGroups: [], totalGroups: 0 };
      }

      const approverScores = new Map();
      const matchedGroups = [];

      // Score each approver based on CODEOWNERS group history
      codeownersGroups.forEach((group, groupIndex) => {
        const groupKey = `group_${groupIndex}_${group.ownerDetails.map(o => o.username).sort().join('_')}`;
        const groupStats = this.groupApprovalStats.get(groupKey);
        
        if (groupStats) {
          matchedGroups.push({
            groupKey,
            files: group.files,
            owners: group.ownerDetails.map(o => o.username),
            totalApprovals: groupStats.totalApprovals
          });

          // Calculate approval likelihood for each owner in this group
          group.ownerDetails.forEach(owner => {
            const approverCount = groupStats.approvers.get(owner.username) || 0;
            const approvalRate = groupStats.totalApprovals > 0 ? approverCount / groupStats.totalApprovals : 0;
            
            const currentScore = approverScores.get(owner.username) || 0;
            approverScores.set(owner.username, currentScore + approvalRate);
          });
        }
      });

      // Normalize scores and filter by confidence threshold
      const maxScore = Math.max(...Array.from(approverScores.values()), 1);
      const predictions = Array.from(approverScores.entries())
        .map(([approver, score]) => ({
          approver,
          confidence: score / maxScore,
          rawScore: score,
        }))
        .filter(prediction => prediction.confidence >= confidence)
        .sort((a, b) => b.confidence - a.confidence);

      return {
        predictions,
        matchedGroups,
        totalGroups: codeownersGroups.length,
      };
    } catch (error) {
      console.error('❌ Prediction failed:', error.message);
      return { predictions: [], matchedGroups: [], totalGroups: 0 };
    }
  }

  /**
   * Generate model summary statistics
   */
  generateModelSummary() {
    const topGroups = Array.from(this.groupApprovalStats.entries())
      .sort((a, b) => b[1].totalApprovals - a[1].totalApprovals)
      .slice(0, 10)
      .map(([groupKey, stats]) => ({
        groupKey,
        totalApprovals: stats.totalApprovals,
        owners: stats.groupInfo.owners,
        topApprovers: Array.from(stats.approvers.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([approver, count]) => ({ approver, count }))
      }));

    const topApprovers = Array.from(this.approverStats.entries())
      .sort((a, b) => b[1].totalApprovals - a[1].totalApprovals)
      .slice(0, 10)
      .map(([approver, stats]) => ({
        approver,
        totalApprovals: stats.totalApprovals,
        groupsCount: stats.groups.size,
      }));

    return {
      trainingData: {
        totalPRs: this.trainingData.length,
        totalGroups: this.groupApprovalStats.size,
        totalApprovers: this.approverStats.size,
      },
      topGroups,
      topApprovers,
      lastTrained: new Date().toISOString(),
    };
  }

  /**
   * Export model data for persistence
   */
  exportModel() {
    return {
      trainingData: this.trainingData,
      groupApprovalStats: Array.from(this.groupApprovalStats.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          approvers: Array.from(value.approvers.entries())
        }
      ]),
      approverStats: Array.from(this.approverStats.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          groups: Array.from(value.groups)
        }
      ]),
      isModelTrained: this.isModelTrained,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import model data from persistence
   */
  importModel(modelData) {
    this.trainingData = modelData.trainingData || [];
    
    this.groupApprovalStats = new Map(
      (modelData.groupApprovalStats || []).map(([key, value]) => [
        key,
        {
          ...value,
          approvers: new Map(value.approvers)
        }
      ])
    );
    
    this.approverStats = new Map(
      (modelData.approverStats || []).map(([key, value]) => [
        key,
        {
          ...value,
          groups: new Set(value.groups)
        }
      ])
    );
    
    this.isModelTrained = modelData.isModelTrained || false;
    
    console.log('✅ ML model imported successfully');
    console.log(`📊 Loaded ${this.trainingData.length} training samples`);
    console.log(`🎯 Loaded ${this.groupApprovalStats.size} group patterns`);
  }
}

module.exports = MLCodeownersTrainer; 