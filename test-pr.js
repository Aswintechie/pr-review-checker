#!/usr/bin/env node

const axios = require('axios');

// Test the PR analysis with a real GitHub PR
async function testPRAnalysis() {
  console.log('🧪 Testing PR Analysis API...\n');

  // Use our own PR as a test case
  const testPR = 'https://github.com/Aswin-coder/pr-review-checker/pull/1';
  
  try {
    console.log(`📋 Testing with PR: ${testPR}`);
    console.log('⏳ Sending request to API...\n');

    const response = await axios.post('http://localhost:3001/api/pr-approvers', {
      prUrl: testPR,
      // No GitHub token for this test to see public repo behavior
    });

    console.log('✅ API Response received!');
    console.log('📊 Results:');
    console.log(`   PR Title: ${response.data.prInfo.title}`);
    console.log(`   PR Number: #${response.data.prInfo.number}`);
    console.log(`   Author: @${response.data.prInfo.author}`);
    console.log(`   State: ${response.data.prInfo.state}`);
    console.log(`   Changed Files: ${response.data.changedFiles.length}`);
    console.log(`   Required Approval Groups: ${response.data.minRequiredApprovals.length}`);
    console.log(`   Groups Needing Approval: ${response.data.totalGroupsNeedingApproval}`);
    console.log(`   Ready to Merge: ${response.data.isReadyToMerge ? '✅' : '❌'}`);

    if (response.data.rateLimitInfo) {
      console.log(`\n⏱️ Rate Limit Info:`);
      console.log(`   Remaining: ${response.data.rateLimitInfo.remaining}/${response.data.rateLimitInfo.limit}`);
      console.log(`   Resets in: ${response.data.rateLimitInfo.minutesUntilReset} minutes`);
    }

    console.log('\n📁 File Analysis:');
    response.data.fileApprovalDetails.slice(0, 5).forEach(file => {
      console.log(`   ${file.file}`);
      console.log(`     Pattern: ${file.pattern}`);
      console.log(`     Owners: ${file.owners.join(', ') || 'None'}`);
    });

    if (response.data.fileApprovalDetails.length > 5) {
      console.log(`   ... and ${response.data.fileApprovalDetails.length - 5} more files`);
    }

    console.log('\n👥 Approval Groups:');
    response.data.minRequiredApprovals.forEach((group, index) => {
      console.log(`   Group ${index + 1}: ${group.files.length} files`);
      console.log(`     Needs approval: ${group.needsApproval ? '❌ Yes' : '✅ No'}`);
      console.log(`     Options: ${group.owners.join(', ')}`);
      if (group.approvedBy) {
        console.log(`     Approved by: @${group.approvedBy}`);
      }
    });

    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:');
    console.error(`   Status: ${error.response?.status || 'Unknown'}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.data?.rateLimitInfo) {
      console.error(`   Rate Limit: ${error.response.data.rateLimitInfo.remaining}/${error.response.data.rateLimitInfo.limit}`);
    }
  }
}

// Test health endpoint first
async function testHealth() {
  try {
    console.log('🏥 Testing health endpoint...');
    const response = await axios.get('http://localhost:3001/health');
    console.log(`✅ Health check passed: ${response.data.status}\n`);
    return true;
  } catch (error) {
    console.error('❌ Health check failed - server may not be running');
    console.error('   Make sure to run: npm run dev\n');
    return false;
  }
}

// Run the tests
async function runTests() {
  const healthOk = await testHealth();
  if (healthOk) {
    await testPRAnalysis();
  }
}

runTests().catch(console.error); 