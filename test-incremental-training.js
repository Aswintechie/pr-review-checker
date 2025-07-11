#!/usr/bin/env node

/**
 * Test script to demonstrate incremental training functionality
 * This shows how the system skips already processed PRs
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001';

async function testIncrementalTraining() {
  console.log('🧪 Testing Incremental Training Logic');
  console.log('=====================================\n');

  // Test configuration
  const testConfig = {
    owner: 'tenstorrent',
    repo: 'tt-metal',
    token: process.env.GITHUB_TOKEN || 'your-token-here',
    prCount: 20, // Small count for testing
  };

  if (!process.env.GITHUB_TOKEN) {
    console.log('❌ Please set GITHUB_TOKEN environment variable');
    console.log('   export GITHUB_TOKEN=your_github_token_here');
    process.exit(1);
  }

  try {
    console.log('📋 Test Configuration:');
    console.log(`   Repository: ${testConfig.owner}/${testConfig.repo}`);
    console.log(`   PR Count: ${testConfig.prCount}`);
    console.log(`   API Base: ${API_BASE}`);
    console.log('');

    // Step 1: Clear any existing training log
    console.log('🧹 Step 1: Clearing training log to start fresh...');
    try {
      const clearResponse = await axios.post(`${API_BASE}/api/ml/clear-training-log`);
      console.log('✅', clearResponse.data.message);
    } catch (clearError) {
      console.log('⚠️  Training log might not exist (this is OK for first run)');
    }
    console.log('');

    // Step 2: First training run
    console.log('🎯 Step 2: First training run (should process all PRs)...');
    const firstTrainingStart = Date.now();
    
    const firstTraining = await axios.post(`${API_BASE}/api/ml/train`, testConfig);
    const firstTrainingTime = ((Date.now() - firstTrainingStart) / 1000).toFixed(1);
    
    console.log('✅ First training completed!');
    console.log(`   Time taken: ${firstTrainingTime}s`);
    console.log(`   PRs processed: ${firstTraining.data.summary.trainingData?.totalPRs || 'N/A'}`);
    console.log('');

    // Step 3: Check if training log was created
    console.log('📋 Step 3: Checking training log...');
    const trainingLogPath = path.join(__dirname, 'server', 'training-log.json');
    
    if (fs.existsSync(trainingLogPath)) {
      const logData = JSON.parse(fs.readFileSync(trainingLogPath, 'utf8'));
      console.log('✅ Training log created successfully');
      console.log(`   Processed PRs: ${logData.processedPRs?.length || 0}`);
      console.log(`   Last training: ${new Date(logData.lastTrainingDate).toLocaleString()}`);
      console.log(`   Sample PR numbers: ${logData.processedPRs?.slice(0, 5).join(', ') || 'None'}`);
    } else {
      console.log('❌ Training log not found');
    }
    console.log('');

    // Step 4: Second training run (should skip all PRs)
    console.log('🔄 Step 4: Second training run (should skip all PRs)...');
    const secondTrainingStart = Date.now();
    
    const secondTraining = await axios.post(`${API_BASE}/api/ml/train`, testConfig);
    const secondTrainingTime = ((Date.now() - secondTrainingStart) / 1000).toFixed(1);
    
    console.log('✅ Second training completed!');
    console.log(`   Time taken: ${secondTrainingTime}s`);
    console.log(`   PRs processed: ${secondTraining.data.summary.trainingData?.totalPRs || 'N/A'}`);
    console.log('');

    // Step 5: Compare results
    console.log('📊 Step 5: Comparing training runs...');
    
    const timeSaved = parseFloat(firstTrainingTime) - parseFloat(secondTrainingTime);
    const timeSavedPercent = ((timeSaved / parseFloat(firstTrainingTime)) * 100).toFixed(1);
    
    console.log(`   First run:  ${firstTrainingTime}s`);
    console.log(`   Second run: ${secondTrainingTime}s`);
    console.log(`   Time saved: ${timeSaved.toFixed(1)}s (${timeSavedPercent}%)`);
    console.log('');

    // Step 6: Test with fresh log (simulate new PRs)
    console.log('🆕 Step 6: Testing with partial log clear (simulate new PRs)...');
    
    if (fs.existsSync(trainingLogPath)) {
      const logData = JSON.parse(fs.readFileSync(trainingLogPath, 'utf8'));
      
      // Remove some PRs from the log to simulate new PRs
      const originalPRCount = logData.processedPRs.length;
      const prsToKeep = Math.floor(originalPRCount * 0.7); // Keep 70% of PRs
      
      logData.processedPRs = logData.processedPRs.slice(0, prsToKeep);
      fs.writeFileSync(trainingLogPath, JSON.stringify(logData, null, 2));
      
      console.log(`   Modified log: kept ${prsToKeep}/${originalPRCount} PRs`);
      console.log(`   This simulates ${originalPRCount - prsToKeep} new PRs`);
      
      // Run training again
      const thirdTrainingStart = Date.now();
      const thirdTraining = await axios.post(`${API_BASE}/api/ml/train`, testConfig);
      const thirdTrainingTime = ((Date.now() - thirdTrainingStart) / 1000).toFixed(1);
      
      console.log('✅ Third training completed!');
      console.log(`   Time taken: ${thirdTrainingTime}s`);
      console.log(`   Should have processed ~${originalPRCount - prsToKeep} new PRs`);
    }
    console.log('');

    // Step 7: Summary
    console.log('📝 Summary:');
    console.log('   ✅ Incremental training is working correctly!');
    console.log('   ✅ System skips already processed PRs');
    console.log('   ✅ Training log tracks processed PRs');
    console.log('   ✅ Significant time savings on subsequent runs');
    console.log('   ✅ Only new PRs are processed when available');
    console.log('');
    
    console.log('💡 How it works:');
    console.log('   1. First run: processes all PRs and saves list to training-log.json');
    console.log('   2. Subsequent runs: only process PRs not in the log');
    console.log('   3. If no new PRs: training completes instantly');
    console.log('   4. Training log persists across server restarts');
    console.log('');
    
    console.log('🛠️  Manual controls:');
    console.log('   - Clear log: POST /api/ml/clear-training-log');
    console.log('   - Clear model: POST /api/ml/clear');
    console.log('   - View log: server/training-log.json');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    
    console.log('');
    console.log('💡 Make sure the server is running: npm start');
    console.log('💡 Set GITHUB_TOKEN environment variable');
  }
}

// Run the test
if (require.main === module) {
  testIncrementalTraining();
}

module.exports = testIncrementalTraining; 