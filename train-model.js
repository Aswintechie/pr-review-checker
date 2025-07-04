#!/usr/bin/env node

/**
 * Simple ML Model Training Script
 * Usage: node train-model.js <owner> <repo> <github-token> [pr-count]
 */

const axios = require('axios');

async function getModelStatus() {
  try {
    const response = await axios.get('http://localhost:3001/api/ml/status');
    return response.data.status;
  } catch (error) {
    return null;
  }
}

async function clearModel() {
  try {
    const response = await axios.post('http://localhost:3001/api/ml/clear');
    return response.data.success;
  } catch (error) {
    console.error('❌ Failed to clear model:', error.message);
    return false;
  }
}

async function trainModel(owner, repo, githubToken, prCount = 100, clearFirst = false) {
  const apiUrl = 'http://localhost:3001/api/ml/train';
  
  console.log(`🚀 Starting ML training for ${owner}/${repo}`);
  
  // Check current model status
  const status = await getModelStatus();
  if (status && status.hasData) {
    console.log(`📊 Current model status:`);
    console.log(`   📈 Training data: ${status.totalTrainingData} PRs`);
    console.log(`   🎯 Groups: ${status.uniqueGroups}`);
    console.log(`   👥 Approvers: ${status.uniqueApprovers}`);
    if (status.duplicatePRs > 0) {
      console.log(`   ⚠️  Duplicates: ${status.duplicatePRs} PRs`);
    }
    
    if (clearFirst) {
      console.log(`🧹 Clearing existing model data...`);
      const cleared = await clearModel();
      if (cleared) {
        console.log(`✅ Model cleared successfully`);
      }
    } else {
      console.log(`📝 Note: New training data will be APPENDED to existing data`);
      console.log(`💡 Use --clear flag to start fresh instead`);
    }
  }
  
  console.log(`📊 Analyzing last ${prCount} merged PRs...`);
  console.log('⏳ This may take several minutes...');
  console.log('');
  console.log('📋 What to expect:');
  console.log('   • The system fetches closed PRs and filters for merged ones');
  console.log('   • If merge rate is low, it may need to scan many pages');
  console.log('   • For large requests (>100), dual-method fetching is used');
  console.log('   • Progress will be shown for each PR processed');
  console.log('');

  try {
    const response = await axios.post(apiUrl, {
      owner,
      repo,
      token: githubToken,
      prCount: parseInt(prCount)
    });

    if (response.data.success) {
      console.log('🎉 Training completed successfully!\n');
      console.log('📋 Summary:');
      
      const summary = response.data.summary;
      if (summary && summary.trainingData) {
        console.log(`   Repository: ${owner}/${repo}`);
        console.log(`   PRs requested: ${prCount}`);
        console.log(`   PRs analyzed: ${summary.trainingData.totalPRs}`);
        console.log(`   CODEOWNERS groups: ${summary.trainingData.totalGroups}`);
        console.log(`   Unique approvers: ${summary.trainingData.totalApprovers}`);
        
        if (summary.trainingData.totalPRs < prCount * 0.9) {
          console.log('');
          console.log('💡 Note: Found fewer PRs than requested. This could be due to:');
          console.log('   • Repository has fewer merged PRs than requested');
          console.log('   • Low merge rate (many PRs closed without merging)');
          console.log('   • API rate limiting or access restrictions');
          console.log('   • Recent PRs with no files or approvers (automatically skipped)');
        }
        
        if (summary.topGroups && summary.topGroups.length > 0) {
          console.log('\n🏆 Top Active Groups:');
          summary.topGroups.slice(0, 3).forEach((group, index) => {
            console.log(`   ${index + 1}. [${group.owners.join(', ')}] - ${group.totalApprovals} approvals`);
          });
        }
        
        if (summary.topApprovers && summary.topApprovers.length > 0) {
          console.log('\n👥 Most Active Approvers:');
          summary.topApprovers.slice(0, 5).forEach((approver, index) => {
            console.log(`   ${index + 1}. @${approver.approver} - ${approver.totalApprovals} approvals`);
          });
        }
      }
      
      console.log('\n✅ Model is now ready for predictions!');
      console.log('🔮 You can now analyze PRs and see ML-powered approval likelihood percentages');
      
    } else {
      console.error('❌ Training failed:', response.data.message || 'Unknown error');
    }

  } catch (error) {
    console.error('\n❌ Training failed:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.error('💡 Make sure your GitHub token has the required permissions');
    } else if (error.response?.status === 404) {
      console.error('💡 Make sure the repository exists and is accessible');
    } else if (error.response?.status === 400) {
      console.error('💡 Check your parameters: owner, repo, and token are required');
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: node train-model.js <owner> <repo> <github-token> [pr-count] [--clear]');
  console.error('Example: node train-model.js microsoft vscode your-github-token 100');
  console.error('         node train-model.js microsoft vscode your-github-token 100 --clear');
  console.error('');
  console.error('Flags:');
  console.error('  --clear    Clear existing model data before training (fresh start)');
  process.exit(1);
}

// Extract flags
const clearFlag = args.includes('--clear');
const filteredArgs = args.filter(arg => !arg.startsWith('--'));

const [owner, repo, githubToken, prCount] = filteredArgs;

// Run training
trainModel(owner, repo, githubToken, prCount, clearFlag).catch(console.error); 