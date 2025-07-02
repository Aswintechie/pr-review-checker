#!/usr/bin/env node

/**
 * ML Model Management Utilities
 * Usage: node model-utils.js <command>
 */

const axios = require('axios');

async function getModelStatus() {
  try {
    const response = await axios.get('http://localhost:3001/api/ml/status');
    const status = response.data.status;
    
    console.log('📊 Current ML Model Status:');
    console.log('==========================================');
    console.log(`🎯 Model Trained: ${status.isModelTrained ? '✅ Yes' : '❌ No'}`);
    console.log(`📈 Training Data: ${status.totalTrainingData} PRs`);
    console.log(`🎯 CODEOWNERS Groups: ${status.uniqueGroups}`);
    console.log(`👥 Unique Approvers: ${status.uniqueApprovers}`);
    
    if (status.duplicatePRs > 0) {
      console.log(`⚠️  Duplicate PRs: ${status.duplicatePRs}`);
      console.log(`💡 Fix duplicates: node model-utils.js remove-duplicates`);
      console.log(`📝 Or clear and retrain: node model-utils.js clear`);
    } else {
      console.log(`✅ No duplicate PRs found`);
    }
    
    if (status.hasData) {
      console.log(`\n💾 Model has training data - predictions available`);
    } else {
      console.log(`\n📭 Model is empty - train first to enable predictions`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get model status:', error.message);
    console.error('💡 Make sure the server is running on http://localhost:3001');
  }
}

async function clearModel() {
  try {
    console.log('🧹 Clearing ML model data...');
    const response = await axios.post('http://localhost:3001/api/ml/clear');
    
    if (response.data.success) {
      console.log('✅ Model cleared successfully!');
      console.log('📭 Model is now empty - ready for fresh training');
    } else {
      console.error('❌ Failed to clear model');
    }
    
  } catch (error) {
    console.error('❌ Failed to clear model:', error.message);
    console.error('💡 Make sure the server is running on http://localhost:3001');
  }
}

async function getModelStats() {
  try {
    const response = await axios.get('http://localhost:3001/api/ml/stats');
    const stats = response.data.stats;
    
    console.log('📈 Detailed ML Model Statistics:');
    console.log('==========================================');
    
    if (stats.trainingData) {
      console.log(`📊 Training Overview:`);
      console.log(`   📈 Total PRs: ${stats.trainingData.totalPRs}`);
      console.log(`   🎯 Total Groups: ${stats.trainingData.totalGroups}`);
      console.log(`   👥 Total Approvers: ${stats.trainingData.totalApprovers}`);
    }
    
    if (stats.topGroups && stats.topGroups.length > 0) {
      console.log(`\n🏆 Top 5 Most Active Groups:`);
      stats.topGroups.slice(0, 5).forEach((group, index) => {
        console.log(`   ${index + 1}. [${group.owners.join(', ')}]`);
        console.log(`      📊 ${group.totalApprovals} approvals`);
      });
    }
    
    if (stats.topApprovers && stats.topApprovers.length > 0) {
      console.log(`\n👥 Top 10 Most Active Approvers:`);
      stats.topApprovers.slice(0, 10).forEach((approver, index) => {
        console.log(`   ${index + 1}. @${approver.approver} - ${approver.totalApprovals} approvals`);
      });
    }
    
    if (stats.lastTrained) {
      console.log(`\n⏰ Last Trained: ${new Date(stats.lastTrained).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get model stats:', error.message);
    console.error('💡 Make sure the server is running and model is trained');
  }
}

async function removeDuplicates() {
  try {
    console.log('🔍 Checking for duplicate PRs in training data...');
    
    const response = await axios.post('http://localhost:3001/api/ml/remove-duplicates');
    
    if (response.data.success) {
      const removedCount = response.data.removedCount;
      
      if (removedCount > 0) {
        console.log(`✅ Successfully removed ${removedCount} duplicate PRs`);
        console.log('📊 Model statistics have been recalculated');
        console.log('💾 Model has been saved to disk');
        console.log('');
        console.log('💡 Consider reviewing the model stats to see the updated data:');
        console.log('   node model-utils.js stats');
      } else {
        console.log('✅ No duplicates found - model is already clean');
      }
    } else {
      console.error('❌ Failed to remove duplicates');
    }
  } catch (error) {
    console.error('❌ Error removing duplicates:', error.response?.data?.message || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the server is running: cd server && npm start');
    }
  }
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'status':
    getModelStatus();
    break;
  case 'clear':
    clearModel();
    break;
  case 'stats':
    getModelStats();
    break;
  case 'remove-duplicates':
    removeDuplicates();
    break;
  default:
    console.log('🛠️  ML Model Management Utilities');
    console.log('==========================================');
    console.log('Usage: node model-utils.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  status           Show current model status and health');
    console.log('  clear            Clear all model data (fresh start)');
    console.log('  stats            Show detailed model statistics');
    console.log('  remove-duplicates Remove duplicate PRs from training data');
    console.log('');
    console.log('Examples:');
    console.log('  node model-utils.js status');
    console.log('  node model-utils.js clear');
    console.log('  node model-utils.js stats');
    console.log('  node model-utils.js remove-duplicates');
    process.exit(1);
} 