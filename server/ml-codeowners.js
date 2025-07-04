/**
 * ML-based CODEOWNERS prediction system
 * Trains on actual CODEOWNERS group assignments and approval history
 */

const axios = require('axios');

class MLCodeownersTrainer {
  constructor() {
    this.trainingData = [];
    this.groupApprovalStats = new Map(); // group -> { approvers: Map(approver -> count), totalApprovals: number }
    this.approverStats = new Map(); // approver -> { groups: Set, totalApprovals: number }
    this.isModelTrained = false;
    this.codeownersCache = new Map(); // repo -> { content: string | null, timestamp: number }
  }

  /**
   * Fetch recent merged PRs
   */
  async fetchRecentPRs(owner, repo, token, count = 50) {
    try {
      console.log(`🔍 Fetching last ${count} merged PRs from ${owner}/${repo}...`);

      // Try primary method first
      let mergedPRs = await this.fetchPRsPrimaryMethod(owner, repo, token, count);

      // If we got significantly fewer PRs than requested, try the search API method
      if (mergedPRs.length < count * 0.8 && count > 100) {
        console.log(
          `🔄 Primary method yielded ${mergedPRs.length}/${count} PRs. Trying search API method...`
        );
        const searchPRs = await this.fetchPRsSearchMethod(owner, repo, token, count);

        // Merge and deduplicate results
        const allPRs = [...mergedPRs, ...searchPRs];
        const uniquePRs = allPRs.filter(
          (pr, index, self) => index === self.findIndex(p => p.number === pr.number)
        );

        // Sort by merge date and take the most recent
        uniquePRs.sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));
        mergedPRs = uniquePRs.slice(0, count);

        console.log(`🔄 Combined results: ${mergedPRs.length} unique merged PRs`);
      }

      return mergedPRs;
    } catch (error) {
      console.error('❌ Error fetching PRs:', error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Message: ${error.response.data?.message || 'Unknown error'}`);
      }
      throw error;
    }
  }

  async fetchPRsPrimaryMethod(owner, repo, token, count) {
    const mergedPRs = [];
    let page = 1;
    const perPage = 100; // GitHub API max is 100 per page
    let consecutiveEmptyPages = 0;
    const maxConsecutiveEmptyPages = 3; // Stop after 3 consecutive empty pages
    const maxPages = Math.ceil(count * 2.5); // Allow up to 2.5x pages to account for filtering

    while (
      mergedPRs.length < count &&
      consecutiveEmptyPages < maxConsecutiveEmptyPages &&
      page <= maxPages
    ) {
      console.log(
        `📄 Primary method: Page ${page} (${mergedPRs.length}/${count} merged PRs found so far)`
      );

      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
        params: {
          state: 'closed',
          sort: 'updated', // Sort by most recently updated
          direction: 'desc',
          per_page: perPage,
          page,
        },
      });

      if (response.data.length === 0) {
        consecutiveEmptyPages++;
        console.log(`📭 Empty page ${page} (${consecutiveEmptyPages}/${maxConsecutiveEmptyPages})`);
        page++;
        continue;
      }

      // Reset consecutive empty pages counter
      consecutiveEmptyPages = 0;

      // Filter for merged PRs and add them
      const pageMergedPRs = response.data.filter(pr => pr.merged_at !== null);
      mergedPRs.push(...pageMergedPRs);

      const mergeRate = (pageMergedPRs.length / response.data.length) * 100;
      console.log(
        `✅ Found ${pageMergedPRs.length}/${response.data.length} merged PRs on page ${page} (${mergeRate.toFixed(1)}% merge rate)`
      );

      // If we got fewer than perPage results, we've reached the end
      if (response.data.length < perPage) {
        console.log('📝 Reached end of available PRs');
        break;
      }

      page++;

      // Small delay to avoid rate limiting (reduced since we might need many pages)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Sort merged PRs by merge date (most recent first) to ensure we get the latest ones
    mergedPRs.sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));

    const finalPRs = mergedPRs.slice(0, count);
    const actualMergeRate = (mergedPRs.length / (page * perPage)) * 100;

    console.log(`🎯 Primary Method Results:`);
    console.log(`   📊 Requested: ${count} merged PRs`);
    console.log(`   ✅ Found: ${finalPRs.length} merged PRs`);
    console.log(`   📄 Pages searched: ${page - 1}`);
    console.log(`   🔄 Overall merge rate: ${actualMergeRate.toFixed(1)}%`);

    if (finalPRs.length < count) {
      console.log(`⚠️  Primary method found ${finalPRs.length}/${count} requested PRs`);
    }

    return finalPRs;
  }

  async fetchPRsSearchMethod(owner, repo, token, count) {
    try {
      console.log(`🔍 Using GitHub Search API to find merged PRs...`);

      const mergedPRs = [];
      let page = 1;
      const perPage = 100; // GitHub Search API max is 100 per page
      const maxPages = Math.ceil(count / perPage) + 2; // Add buffer for duplicates

      while (mergedPRs.length < count && page <= maxPages) {
        console.log(
          `📄 Search method: Page ${page} (${mergedPRs.length}/${count} merged PRs found so far)`
        );

        // Use GitHub Search API to find merged PRs
        const searchQuery = `repo:${owner}/${repo} type:pr is:merged`;
        const response = await axios.get(`https://api.github.com/search/issues`, {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            q: searchQuery,
            sort: 'updated',
            order: 'desc',
            per_page: perPage,
            page,
          },
        });

        if (response.data.items.length === 0) {
          console.log('📭 No more PRs found via search');
          break;
        }

        // Convert search results to PR format
        const searchPRs = response.data.items.map(item => ({
          number: item.number,
          title: item.title,
          merged_at: item.closed_at, // Search API doesn't have merged_at, use closed_at
          user: { login: item.user.login },
          html_url: item.html_url,
        }));

        mergedPRs.push(...searchPRs);
        console.log(`✅ Found ${searchPRs.length} merged PRs via search on page ${page}`);

        page++;

        // Search API has stricter rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`🎯 Search Method Results: Found ${mergedPRs.length} merged PRs`);
      return mergedPRs.slice(0, count);
    } catch (error) {
      console.warn('⚠️ Search API method failed, falling back to primary method only');
      console.warn('Error:', error.message);
      return [];
    }
  }

  /**
   * Get PR files and reviews for a specific PR
   */
  async getPRDetails(owner, repo, prNumber, token) {
    try {
      const [filesResponse, reviewsResponse] = await Promise.all([
        axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
        axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }),
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
   * Analyze files using CODEOWNERS logic - with caching to avoid repeated API calls
   */
  async analyzeFilesWithCodeowners(owner, repo, files, token) {
    try {
      const repoKey = `${owner}/${repo}`;

      // Check if we have cached CODEOWNERS content for this repository
      let codeownersContent = null;

      if (this.codeownersCache.has(repoKey)) {
        // Use cached content (could be null if CODEOWNERS wasn't found)
        codeownersContent = this.codeownersCache.get(repoKey).content;
      } else {
        // First time fetching CODEOWNERS for this repository
        console.log(`🔍 Fetching CODEOWNERS for ${repoKey} (first time)...`);

        // Try multiple possible CODEOWNERS locations
        const possiblePaths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'];

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

            codeownersContent = Buffer.from(codeownersResponse.data.content, 'base64').toString(
              'utf-8'
            );
            console.log(`✅ Found CODEOWNERS at: ${path}`);
            break;
          } catch (pathError) {
            console.log(
              `⚠️ CODEOWNERS not found at: ${path} (${pathError.response?.status || pathError.message})`
            );
            continue;
          }
        }

        if (!codeownersContent) {
          console.log('❌ No CODEOWNERS file found in any standard location');
        }

        // Cache the result (including null if not found)
        this.codeownersCache.set(repoKey, {
          content: codeownersContent,
          timestamp: Date.now(),
        });

        console.log(
          `💾 Cached CODEOWNERS result for ${repoKey} - subsequent PR processing will be silent`
        );
      }

      if (!codeownersContent) {
        return [];
      }

      // Parse CODEOWNERS and create groups based on files
      const groups = this.createGroupsFromFiles(files, codeownersContent);
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
            pattern: matchedRule.pattern,
          });
        }
        fileGroups.get(groupKey).files.push(file);
      }
    });

    // Convert to groups format
    let groupIndex = 0;
    for (const [, groupData] of fileGroups) {
      groups.push({
        files: groupData.files,
        ownerDetails: groupData.owners.map(owner => ({
          username: owner,
          type: owner.includes('/') ? 'team' : 'user',
        })),
        pattern: groupData.pattern,
        groupIndex: groupIndex++,
      });
    }

    return groups;
  }

  /**
   * Simple pattern matching for CODEOWNERS
   */
  matchesPattern(pattern, filePath) {
    // Convert CODEOWNERS pattern to regex
    let regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*').replace(/\*\*/g, '.*');

    // Handle directory patterns
    if (pattern.endsWith('/')) {
      regexPattern = `${regexPattern}.*`;
    }

    // Anchor the pattern
    if (!pattern.startsWith('/')) {
      regexPattern = `(^|/)${regexPattern}`;
    } else {
      regexPattern = `^${regexPattern.slice(1)}`;
    }

    if (!pattern.includes('.') && !pattern.endsWith('*')) {
      regexPattern = `${regexPattern}(/|$)`;
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

      // Process each PR with detailed progress
      const prsToProcess = prs.slice(0, Math.min(prCount, prs.length));
      const totalPRs = prsToProcess.length;
      let processedCount = 0;
      let skippedCount = 0;
      const startTime = Date.now();

      for (const pr of prsToProcess) {
        processedCount++;
        const progress = Math.round((processedCount / totalPRs) * 100);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(
          `🔄 [${processedCount}/${totalPRs}] (${progress}%) Processing PR #${pr.number}`
        );
        console.log(`   📝 "${pr.title.substring(0, 80)}${pr.title.length > 80 ? '...' : ''}"`);
        console.log(
          `   ⏱️  Elapsed: ${elapsed}s | ETA: ${processedCount > 1 ? ((elapsed / processedCount) * (totalPRs - processedCount)).toFixed(1) : '?'}s`
        );

        const { files, approvers } = await this.getPRDetails(owner, repo, pr.number, token);

        if (files.length === 0 || approvers.length === 0) {
          skippedCount++;
          console.log(`   ⚠️  Skipped (${files.length} files, ${approvers.length} approvers)`);
          continue;
        }

        console.log(`   📁 ${files.length} files, 👥 ${approvers.length} approvers`);

        // Check for duplicates before processing
        const isDuplicate = this.trainingData.some(
          existingData => existingData.prNumber === pr.number
        );
        if (isDuplicate) {
          skippedCount++;
          console.log(`   ⚠️  Skipped - PR #${pr.number} already in training data`);
          continue;
        }

        // Analyze files using CODEOWNERS logic
        const codeownersGroups = await this.analyzeFilesWithCodeowners(owner, repo, files, token);

        if (codeownersGroups.length === 0) {
          skippedCount++;
          console.log(`   ⚠️  Skipped - no CODEOWNERS groups found`);
          continue;
        }

        console.log(`   🎯 Found ${codeownersGroups.length} CODEOWNERS groups`);

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
          const groupKey = `group_${groupIndex}_${group.ownerDetails
            .map(o => o.username)
            .sort()
            .join('_')}`;

          if (!this.groupApprovalStats.has(groupKey)) {
            this.groupApprovalStats.set(groupKey, {
              approvers: new Map(),
              totalApprovals: 0,
              groupInfo: {
                files: group.files,
                owners: group.ownerDetails.map(o => o.username),
              },
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
              totalApprovals: 0,
            });
          }

          const approverData = this.approverStats.get(approver);
          approverData.totalApprovals++;

          // Add groups this approver has worked on
          codeownersGroups.forEach((group, groupIndex) => {
            const groupKey = `group_${groupIndex}_${group.ownerDetails
              .map(o => o.username)
              .sort()
              .join('_')}`;
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
      this.exportedAt = new Date().toISOString(); // Set training completion time
      const finalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const successfullyProcessed = processedCount - skippedCount;

      console.log('\n✅ CODEOWNERS-based model training completed!');
      console.log(`📊 Summary:`);
      console.log(`   📄 Total PRs processed: ${totalPRs}`);
      console.log(
        `   ✅ Successfully trained on: ${this.trainingData.length - (this.trainingData.length - prsToProcess.length + skippedCount)} PRs`
      );
      console.log(
        `   ⚠️  Skipped PRs: ${skippedCount} (duplicates, no files, no approvers, or no groups)`
      );
      console.log(`   📈 Total training data: ${this.trainingData.length} PRs`);
      console.log(`⏱️  Total time: ${finalElapsed}s`);
      console.log(`📊 Processed: ${processedCount}/${totalPRs} PRs`);
      console.log(`✅ Successfully trained on: ${successfullyProcessed} PRs`);
      console.log(`⚠️  Skipped: ${skippedCount} PRs`);
      console.log(`📈 Training data stored: ${this.trainingData.length} PRs`);
      console.log(`🎯 CODEOWNERS groups learned: ${this.groupApprovalStats.size}`);
      console.log(`👥 Unique approvers discovered: ${this.approverStats.size}`);

      return this.generateModelSummary();
    } catch (error) {
      console.error('❌ Training failed:', error.message);
      throw error;
    }
  }

  /**
   * Predict approvers for given files using CODEOWNERS groups or file pattern fallback
   */
  async predictApprovers(owner, repo, files, token, confidence = 0.3) {
    console.log(`🤖 Predicting approvers for ${files.length} files with confidence ${confidence}`);

    if (!this.isModelTrained) {
      throw new Error('Model not trained yet. Please train the model first.');
    }

    try {
      // Analyze files using CODEOWNERS logic
      const codeownersGroups = await this.analyzeFilesWithCodeowners(owner, repo, files, token);
      console.log(`📊 CODEOWNERS analysis found ${codeownersGroups.length} groups`);

      if (codeownersGroups.length === 0) {
        console.log('⚠️ No CODEOWNERS groups found, trying file pattern fallback...');
        return this.predictWithFilePatterns(files, confidence);
      }

      const approverScores = new Map();
      const matchedGroups = [];

      // Score each approver based on CODEOWNERS group history
      codeownersGroups.forEach((group, groupIndex) => {
        const groupKey = `group_${groupIndex}_${group.ownerDetails
          .map(o => o.username)
          .sort()
          .join('_')}`;
        const groupStats = this.groupApprovalStats.get(groupKey);

        if (groupStats) {
          matchedGroups.push({
            groupKey,
            files: group.files,
            owners: group.ownerDetails.map(o => o.username),
            totalApprovals: groupStats.totalApprovals,
          });

          // Calculate approval likelihood for each owner in this group
          group.ownerDetails.forEach(owner => {
            const approverCount = groupStats.approvers.get(owner.username) || 0;
            const approvalRate =
              groupStats.totalApprovals > 0 ? approverCount / groupStats.totalApprovals : 0;

            const currentScore = approverScores.get(owner.username) || 0;
            approverScores.set(owner.username, currentScore + approvalRate);
          });
        }
      });

      // Normalize scores and filter by confidence threshold
      const maxScore = Math.max(...Array.from(approverScores.values()), 1);
      console.log(`📊 Raw scores before normalization:`, Array.from(approverScores.entries()));
      console.log(`📊 Max score found: ${maxScore}`);

      const allPredictions = Array.from(approverScores.entries())
        .map(([approver, score]) => ({
          approver,
          confidence: score / maxScore,
          rawScore: score,
        }))
        .sort((a, b) => {
          // First sort by confidence (descending)
          if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
          }
          // If confidence is equal, sort alphabetically for consistency
          return a.approver.localeCompare(b.approver);
        });

      console.log(
        `📊 All predictions before filtering:`,
        allPredictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
      );
      console.log(`📊 Confidence threshold: ${confidence}`);

      const filteredPredictions = allPredictions.filter(
        prediction => prediction.confidence >= confidence
      );
      console.log(
        `📊 After confidence filter (>=${confidence}):`,
        filteredPredictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
      );

      const predictions = filteredPredictions.slice(0, 5); // Limit to top 5 most confident predictions
      console.log(
        `📊 Final predictions (top 5):`,
        predictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
      );
      console.log(
        `🔍 Checking supplementation: ${predictions.length} predictions, ${codeownersGroups.length} groups, threshold: 5`
      );

      // If CODEOWNERS gives us fewer than 5 predictions, supplement with file pattern predictions
      if (predictions.length < 5 && codeownersGroups.length > 0) {
        console.log(
          `🔄 CODEOWNERS only gave ${predictions.length} predictions, supplementing with file patterns...`
        );

        try {
          const fallbackResult = this.predictWithFilePatterns(files, confidence);
          console.log(
            `📊 File pattern fallback found ${fallbackResult.predictions.length} additional predictions`
          );

          // Merge predictions, avoiding duplicates
          const existingApprovers = new Set(predictions.map(p => p.approver));
          const supplementalPredictions = fallbackResult.predictions
            .filter(p => !existingApprovers.has(p.approver))
            .map(p => ({
              ...p,
              isFallback: true, // Mark as fallback prediction
            }));

          const combinedPredictions = [...predictions, ...supplementalPredictions].slice(0, 5); // Increase limit to 5 for better coverage
          console.log(
            `✅ Combined predictions: ${combinedPredictions.length} approvers (${predictions.length} CODEOWNERS + ${supplementalPredictions.length} patterns)`
          );

          return {
            predictions: combinedPredictions,
            matchedGroups,
            totalGroups: codeownersGroups.length,
            supplementedWithPatterns: supplementalPredictions.length > 0,
          };
        } catch (fallbackError) {
          console.log(`❌ File pattern supplement failed: ${fallbackError.message}`);
        }
      }

      console.log(`✅ CODEOWNERS-based predictions: ${predictions.length} approvers (top 5)`);
      return {
        predictions,
        matchedGroups,
        totalGroups: codeownersGroups.length,
      };
    } catch (error) {
      console.error('❌ Prediction failed:', error.message);
      console.log('🔄 Falling back to file pattern predictions...');
      return this.predictWithFilePatterns(files, confidence);
    }
  }

  /**
   * Fallback prediction method using file patterns when CODEOWNERS is not available
   * This tries to approximate CODEOWNERS behavior using historical file patterns
   */
  predictWithFilePatterns(files, confidence = 0.3) {
    console.log(`🔄 Using file pattern fallback for ${files.length} files`);

    if (this.trainingData.length === 0) {
      console.log('❌ No training data available for file pattern predictions');
      return { predictions: [], matchedGroups: [], totalGroups: 0 };
    }

    const approverScores = new Map();
    const fileExtensions = new Set();
    const deepPaths = new Set(); // More specific paths
    const shallowPaths = new Set(); // Broader paths

    // Extract patterns from the requested files with different specificity levels
    files.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) fileExtensions.add(ext);

      // Extract directory patterns with different depths
      const pathParts = file.split('/');
      pathParts.forEach((part, index) => {
        if (index < pathParts.length - 1) {
          // Exclude filename
          const pathDepth = index + 1;
          const currentPath = pathParts.slice(0, pathDepth).join('/');

          // Categorize by depth for better matching
          if (pathDepth >= 3) {
            deepPaths.add(currentPath); // Deep paths like "tt_metal/hw/ckernels"
          } else if (pathDepth >= 1) {
            shallowPaths.add(currentPath); // Shallow paths like "tt_metal"
          }
        }
      });
    });

    console.log(`📁 File patterns - Extensions: [${Array.from(fileExtensions).join(', ')}]`);
    console.log(`📂 Deep paths: [${Array.from(deepPaths).slice(0, 3).join(', ')}...]`);
    console.log(`📂 Shallow paths: [${Array.from(shallowPaths).slice(0, 3).join(', ')}...]`);

    // Score approvers with weighted matching (more specific = higher weight)
    this.trainingData.forEach(trainingItem => {
      trainingItem.files.forEach(historicalFile => {
        const historicalExt = historicalFile.split('.').pop()?.toLowerCase();
        let matchScore = 0;
        const matchReasons = [];

        // Deep path matches (highest weight - approximates CODEOWNERS specificity)
        for (const deepPath of deepPaths) {
          if (historicalFile.startsWith(`${deepPath}/`)) {
            matchScore += 3; // High weight for specific directory matches
            matchReasons.push(`deep-path:${deepPath}`);
            break;
          }
        }

        // Extension matches (medium weight - indicates file type expertise)
        if (historicalExt && fileExtensions.has(historicalExt)) {
          matchScore += 2;
          matchReasons.push(`ext:${historicalExt}`);
        }

        // Shallow path matches (lower weight - broader category)
        if (matchScore === 0) {
          // Only if no specific matches found
          for (const shallowPath of shallowPaths) {
            if (historicalFile.startsWith(`${shallowPath}/`)) {
              matchScore += 1;
              matchReasons.push(`shallow-path:${shallowPath}`);
              break;
            }
          }
        }

        // Even broader matches for more coverage (very low weight)
        if (matchScore === 0) {
          // Match any file with same extension anywhere
          if (historicalExt && fileExtensions.has(historicalExt)) {
            matchScore += 0.5;
            matchReasons.push(`broad-ext:${historicalExt}`);
          }

          // Match similar directory names at any level
          for (const shallowPath of shallowPaths) {
            if (historicalFile.includes(shallowPath)) {
              matchScore += 0.3;
              matchReasons.push(`broad-path:${shallowPath}`);
              break;
            }
          }
        }

        if (matchScore > 0) {
          // Score the approvers who worked on this similar file
          trainingItem.approvers.forEach(approver => {
            const currentScore = approverScores.get(approver) || 0;
            approverScores.set(approver, currentScore + matchScore);

            // Debug logging for all matches (not just high ones)
            if (matchScore >= 2) {
              console.log(
                `🎯 Strong match: ${approver} worked on ${historicalFile} (${matchReasons.join(', ')})`
              );
            } else if (matchScore >= 1) {
              console.log(
                `👍 Good match: ${approver} worked on ${historicalFile} (${matchReasons.join(', ')})`
              );
            }
          });
        }
      });
    });

    if (approverScores.size === 0) {
      console.log('❌ No pattern matches found in training data');
      return { predictions: [], matchedGroups: [], totalGroups: 0 };
    }

    // Normalize scores and filter by confidence threshold
    const maxScore = Math.max(...Array.from(approverScores.values()), 1);
    console.log(`📊 Raw scores before normalization:`, Array.from(approverScores.entries()));
    console.log(`📊 Max score found: ${maxScore}`);

    const allPredictions = Array.from(approverScores.entries())
      .map(([approver, score]) => ({
        approver,
        confidence: score / maxScore,
        rawScore: score,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    console.log(
      `📊 All predictions before filtering:`,
      allPredictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
    );
    console.log(`📊 Confidence threshold: ${confidence}`);

    const filteredPredictions = allPredictions.filter(
      prediction => prediction.confidence >= confidence
    );
    console.log(
      `📊 After confidence filter (>=${confidence}):`,
      filteredPredictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
    );

    const predictions = filteredPredictions.slice(0, 3); // Limit to top 3 most confident predictions
    console.log(
      `📊 Final predictions (top 3):`,
      predictions.map(p => `${p.approver}: ${Math.round(p.confidence * 100)}%`)
    );

    console.log(`✅ File pattern predictions: ${predictions.length} approvers (top 3)`);
    console.log(
      `👥 Top predictions: ${predictions
        .slice(0, 3)
        .map(p => `${p.approver} (${Math.round(p.confidence * 100)}%)`)
        .join(', ')}`
    );
    console.log(`⚠️ Note: Using file pattern fallback - results may differ from CODEOWNERS`);

    return {
      predictions,
      matchedGroups: [],
      totalGroups: 0,
      fallbackMethod: 'file-patterns',
      matchingStrategy: 'weighted-path-depth',
    };
  }

  /**
   * Clear all training data and start fresh
   */
  clearModel() {
    this.trainingData = [];
    this.groupApprovalStats = new Map();
    this.approverStats = new Map();
    this.isModelTrained = false;
    this.codeownersCache.clear(); // Clear CODEOWNERS cache
    console.log('🧹 Model cleared - ready for fresh training');
  }

  /**
   * Check for duplicate PRs in training data
   */
  checkForDuplicates() {
    const prNumbers = this.trainingData.map(data => data.prNumber);
    const uniquePRs = new Set(prNumbers);
    const duplicateCount = prNumbers.length - uniquePRs.size;

    if (duplicateCount > 0) {
      // Find which PRs are duplicated
      const prCounts = new Map();
      prNumbers.forEach(prNumber => {
        prCounts.set(prNumber, (prCounts.get(prNumber) || 0) + 1);
      });

      const duplicatedPRs = Array.from(prCounts.entries())
        .filter(([_, count]) => count > 1)
        .map(([prNumber, count]) => ({ prNumber, count }));

      console.log(`⚠️  Found ${duplicateCount} duplicate PRs in training data:`);
      duplicatedPRs.slice(0, 5).forEach(({ prNumber, count }) => {
        console.log(`   PR #${prNumber}: ${count} times`);
      });

      if (duplicatedPRs.length > 5) {
        console.log(`   ... and ${duplicatedPRs.length - 5} more duplicated PRs`);
      }

      return duplicateCount;
    } else {
      console.log('✅ No duplicate PRs found in training data');
      return 0;
    }
  }

  /**
   * Remove duplicate PRs from training data (keep only the first occurrence)
   */
  removeDuplicates() {
    const seenPRs = new Set();
    const originalLength = this.trainingData.length;

    this.trainingData = this.trainingData.filter(data => {
      if (seenPRs.has(data.prNumber)) {
        return false; // Remove duplicate
      }
      seenPRs.add(data.prNumber);
      return true; // Keep first occurrence
    });

    const removedCount = originalLength - this.trainingData.length;

    if (removedCount > 0) {
      console.log(`🧹 Removed ${removedCount} duplicate PRs from training data`);
      console.log(
        `📊 Training data reduced from ${originalLength} to ${this.trainingData.length} PRs`
      );

      // Recalculate statistics after removing duplicates
      this.recalculateStatistics();

      return removedCount;
    } else {
      console.log('✅ No duplicates found to remove');
      return 0;
    }
  }

  /**
   * Recalculate approval statistics after removing duplicates
   */
  recalculateStatistics() {
    // Clear existing statistics
    this.groupApprovalStats.clear();
    this.approverStats.clear();

    console.log('🔄 Recalculating approval statistics...');

    // Rebuild statistics from clean training data
    this.trainingData.forEach(data => {
      const { codeownersGroups, approvers } = data;

      // Update group approval statistics
      codeownersGroups.forEach((group, groupIndex) => {
        const groupKey = `group_${groupIndex}_${group.ownerDetails
          .map(o => o.username)
          .sort()
          .join('_')}`;

        if (!this.groupApprovalStats.has(groupKey)) {
          this.groupApprovalStats.set(groupKey, {
            approvers: new Map(),
            totalApprovals: 0,
            groupInfo: {
              files: group.files,
              owners: group.ownerDetails.map(o => o.username),
            },
          });
        }

        const groupStats = this.groupApprovalStats.get(groupKey);
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
            totalApprovals: 0,
            groups: new Set(),
          });
        }

        const approverStats = this.approverStats.get(approver);
        approverStats.totalApprovals++;

        codeownersGroups.forEach((group, groupIndex) => {
          const groupKey = `group_${groupIndex}_${group.ownerDetails
            .map(o => o.username)
            .sort()
            .join('_')}`;
          approverStats.groups.add(groupKey);
        });
      });
    });

    console.log('✅ Statistics recalculated successfully');
  }

  /**
   * Get detailed model status
   */
  getModelStatus() {
    const duplicates = this.checkForDuplicates();
    return {
      isModelTrained: this.isModelTrained,
      totalTrainingData: this.trainingData.length,
      uniqueGroups: this.groupApprovalStats.size,
      uniqueApprovers: this.approverStats.size,
      duplicatePRs: duplicates,
      hasData: this.trainingData.length > 0,
    };
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
          .map(([approver, count]) => ({ approver, count })),
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
      lastTrained: this.exportedAt || new Date().toISOString(),
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
          approvers: Array.from(value.approvers.entries()),
        },
      ]),
      approverStats: Array.from(this.approverStats.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          groups: Array.from(value.groups),
        },
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
          approvers: new Map(value.approvers),
        },
      ])
    );

    this.approverStats = new Map(
      (modelData.approverStats || []).map(([key, value]) => [
        key,
        {
          ...value,
          groups: new Set(value.groups),
        },
      ])
    );

    this.isModelTrained = modelData.isModelTrained || false;
    this.exportedAt = modelData.exportedAt;

    console.log('✅ ML model imported successfully');
    console.log(`📊 Loaded ${this.trainingData.length} training samples`);
    console.log(`🎯 Loaded ${this.groupApprovalStats.size} group patterns`);
    if (this.exportedAt) {
      console.log(`📅 Model last trained: ${new Date(this.exportedAt).toLocaleString()}`);
    }
  }
}

module.exports = MLCodeownersTrainer;
