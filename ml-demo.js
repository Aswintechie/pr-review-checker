#!/usr/bin/env node

/**
 * ML CODEOWNERS Demo Script
 * Demonstrates the machine learning based code ownership prediction system
 */

const axios = require('axios');
const readline = require('readline');

// Configuration
const API_BASE = 'http://localhost:3001';
const DEMO_REPO = {
  owner: 'facebook',
  repo: 'react',
  token: process.env.GITHUB_TOKEN || '',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function header(text) {
  console.log('\n' + '='.repeat(60));
  console.log(colorize(text, 'bright'));
  console.log('='.repeat(60));
}

function section(text) {
  console.log('\n' + colorize(text, 'cyan'));
  console.log('-'.repeat(text.length));
}

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colorize(prompt, 'yellow'), resolve);
  });
}

async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

async function trainModel() {
  header('🎯 TRAINING ML MODEL');
  
  log('This will train the ML model on recent PR data from a GitHub repository.', 'blue');
  log('The model learns patterns from who approved which files in past PRs.', 'blue');
  
  const useDefault = await question('\nUse default demo repository (facebook/react)? (y/n): ');
  
  let config = { ...DEMO_REPO };
  
  if (useDefault.toLowerCase() !== 'y') {
    config.owner = await question('Repository owner: ');
    config.repo = await question('Repository name: ');
  }
  
  if (!config.token) {
    config.token = await question('GitHub token (required): ');
  }
  
  const prCount = await question('Number of PRs to analyze (default 20): ');
  config.prCount = parseInt(prCount) || 20;
  
  log('\n🔄 Training model... This may take a few minutes.', 'yellow');
  
  try {
    const result = await apiCall('POST', '/api/ml/train', config);
    
    log('\n✅ Model trained successfully!', 'green');
    
    section('📊 Training Results');
    log(`• Total PRs analyzed: ${result.summary.trainingData.totalPRs}`, 'blue');
    log(`• Patterns learned: ${result.summary.trainingData.totalPatterns}`, 'blue');
    log(`• Unique approvers: ${result.summary.trainingData.totalApprovers}`, 'blue');
    
    if (result.summary.topPatterns?.length > 0) {
      section('🎯 Top Patterns Learned');
      result.summary.topPatterns.slice(0, 5).forEach(pattern => {
        log(`• ${pattern.pattern} (${pattern.count} PRs)`, 'magenta');
      });
    }
    
    if (result.summary.topApprovers?.length > 0) {
      section('👥 Most Active Approvers');
      result.summary.topApprovers.slice(0, 5).forEach(approver => {
        log(`• @${approver.approver} (${approver.count} approvals)`, 'magenta');
      });
    }
    
  } catch (error) {
    log(`\n❌ Training failed: ${error.message}`, 'red');
  }
}

async function predictApprovers() {
  header('🔮 PREDICTING APPROVERS');
  
  log('Enter file paths to predict who might approve your PR.', 'blue');
  
  const files = [];
  while (true) {
    const file = await question(`File path ${files.length + 1} (empty to finish): `);
    if (!file.trim()) break;
    files.push(file.trim());
  }
  
  if (files.length === 0) {
    log('No files provided!', 'red');
    return;
  }
  
  const confidenceInput = await question('Confidence threshold (0.1-1.0, default 0.3): ');
  const confidence = parseFloat(confidenceInput) || 0.3;
  
  log('\n🔄 Making predictions...', 'yellow');
  
  try {
    const result = await apiCall('POST', '/api/ml/predict', { files, confidence });
    
    section('🎯 Prediction Results');
    
    if (result.prediction.predictions.length === 0) {
      log('No predictions above confidence threshold.', 'red');
      log('Try lowering the confidence threshold or training on more data.', 'yellow');
      return;
    }
    
    result.prediction.predictions.forEach((pred, index) => {
      const percentage = (pred.confidence * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(pred.confidence * 20));
      log(`${index + 1}. @${pred.approver} - ${percentage}% ${colorize(bar, 'green')}`, 'bright');
    });
    
    section('📋 Pattern Analysis');
    log(`• Matched patterns: ${result.prediction.matchedPatterns.length}/${result.prediction.totalPatterns}`, 'blue');
    
    if (result.prediction.matchedPatterns.length > 0) {
      log('• Matched patterns:', 'blue');
      result.prediction.matchedPatterns.slice(0, 5).forEach(pattern => {
        log(`  - ${pattern}`, 'magenta');
      });
    }
    
  } catch (error) {
    log(`\n❌ Prediction failed: ${error.message}`, 'red');
  }
}

async function compareWithCodeowners() {
  header('⚖️ COMPARING WITH CODEOWNERS');
  
  log('Compare ML predictions with traditional CODEOWNERS patterns.', 'blue');
  
  const files = [];
  while (true) {
    const file = await question(`File path ${files.length + 1} (empty to finish): `);
    if (!file.trim()) break;
    files.push(file.trim());
  }
  
  if (files.length === 0) {
    log('No files provided!', 'red');
    return;
  }
  
  const hasCodeowners = await question('Do you have a CODEOWNERS file to compare? (y/n): ');
  let codeownersContent = '';
  
  if (hasCodeowners.toLowerCase() === 'y') {
    log('\nPaste your CODEOWNERS content (press Enter twice to finish):');
    const lines = [];
    while (true) {
      const line = await question('');
      if (line === '' && lines[lines.length - 1] === '') break;
      lines.push(line);
    }
    codeownersContent = lines.slice(0, -1).join('\n');
  }
  
  const confidenceInput = await question('Confidence threshold (0.1-1.0, default 0.3): ');
  const confidence = parseFloat(confidenceInput) || 0.3;
  
  log('\n🔄 Comparing predictions...', 'yellow');
  
  try {
    const result = await apiCall('POST', '/api/ml/compare', { 
      files, 
      codeownersContent, 
      confidence 
    });
    
    section('🤖 ML Predictions');
    if (result.comparison.mlPredictions.length === 0) {
      log('No ML predictions above confidence threshold.', 'red');
    } else {
      result.comparison.mlPredictions.forEach((pred, index) => {
        const percentage = (pred.confidence * 100).toFixed(1);
        log(`${index + 1}. @${pred.approver} (${percentage}% confidence)`, 'green');
      });
    }
    
    section('📋 CODEOWNERS Matches');
    if (result.comparison.traditionalOwners.length === 0) {
      log('No CODEOWNERS matches found.', 'red');
    } else {
      result.comparison.traditionalOwners.forEach((owner, index) => {
        log(`${index + 1}. ${owner}`, 'blue');
      });
    }
    
    section('📊 Analysis Summary');
    log(`• Files analyzed: ${result.comparison.totalFiles}`, 'blue');
    log(`• Pattern matches: ${result.comparison.matchedPatterns}`, 'blue');
    log(`• Confidence threshold: ${(confidence * 100).toFixed(0)}%`, 'blue');
    
  } catch (error) {
    log(`\n❌ Comparison failed: ${error.message}`, 'red');
  }
}

async function viewModelStats() {
  header('📊 MODEL STATISTICS');
  
  try {
    const result = await apiCall('GET', '/api/ml/stats');
    
    if (!result.isModelTrained) {
      log('❌ Model is not trained yet. Please train the model first.', 'red');
      return;
    }
    
    section('🧠 Model Overview');
    log(`• Training PRs: ${result.stats.trainingData.totalPRs}`, 'blue');
    log(`• Patterns learned: ${result.stats.trainingData.totalPatterns}`, 'blue');
    log(`• Unique approvers: ${result.stats.trainingData.totalApprovers}`, 'blue');
    log(`• Last trained: ${new Date(result.stats.lastTrained).toLocaleString()}`, 'blue');
    
    if (result.stats.topPatterns?.length > 0) {
      section('🎯 Most Common Patterns');
      result.stats.topPatterns.forEach((pattern, index) => {
        log(`${index + 1}. ${pattern.pattern} (${pattern.count} PRs)`, 'magenta');
        log(`   Approvers: ${pattern.approvers.slice(0, 3).map(a => `@${a}`).join(', ')}`, 'cyan');
      });
    }
    
    if (result.stats.topApprovers?.length > 0) {
      section('👥 Most Active Approvers');
      result.stats.topApprovers.forEach((approver, index) => {
        log(`${index + 1}. @${approver.approver} (${approver.count} approvals, ${approver.patterns} patterns)`, 'green');
      });
    }
    
  } catch (error) {
    log(`\n❌ Failed to get stats: ${error.message}`, 'red');
  }
}

async function main() {
  header('🧠 ML CODEOWNERS DEMO');
  log('Welcome to the ML-based CODEOWNERS prediction system!', 'bright');
  log('This demo will show you how to train and use the ML model.', 'blue');
  
  if (!process.env.GITHUB_TOKEN) {
    log('\n⚠️  For best results, set your GITHUB_TOKEN environment variable.', 'yellow');
    log('export GITHUB_TOKEN=your_github_token_here', 'cyan');
  }
  
  while (true) {
    console.log('\n' + '='.repeat(40));
    log('Choose an option:', 'bright');
    log('1. Train ML Model', 'blue');
    log('2. Predict Approvers', 'blue');
    log('3. Compare with CODEOWNERS', 'blue');
    log('4. View Model Statistics', 'blue');
    log('5. Exit', 'red');
    
    const choice = await question('\nEnter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        await trainModel();
        break;
      case '2':
        await predictApprovers();
        break;
      case '3':
        await compareWithCodeowners();
        break;
      case '4':
        await viewModelStats();
        break;
      case '5':
        log('\n👋 Thanks for trying ML CODEOWNERS!', 'green');
        rl.close();
        return;
      default:
        log('\n❌ Invalid choice. Please enter 1-5.', 'red');
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n\n👋 Demo interrupted. Goodbye!', 'yellow');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Demo error: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
  });
}

module.exports = { main }; 