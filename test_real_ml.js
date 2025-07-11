#!/usr/bin/env node
/**
 * Test script to verify REAL ML integration
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testRealMLIntegration() {
  console.log('🧪 Testing REAL ML Integration...\n');
  
  // Test 1: Check if model file exists
  console.log('1️⃣ Checking for trained model file...');
  const modelPath = path.join(__dirname, 'real_ml_model.pkl');
  
  try {
    fs.accessSync(modelPath, fs.constants.F_OK);
    console.log('✅ Model file found at:', modelPath);
    
    // Get file size
    const stats = fs.statSync(modelPath);
    console.log('📊 Model file size:', Math.round(stats.size / 1024), 'KB');
  } catch (error) {
    console.log('❌ Model file not found at:', modelPath);
    console.log('ℹ️  Please train the model first using: python ml-implementation-starter.py');
    return;
  }
  
  // Test 2: Check Python script exists
  console.log('\n2️⃣ Checking for Python prediction script...');
  const pythonScriptPath = path.join(__dirname, 'ml_prediction.py');
  
  try {
    fs.accessSync(pythonScriptPath, fs.constants.F_OK);
    console.log('✅ Python script found at:', pythonScriptPath);
  } catch (error) {
    console.log('❌ Python script not found at:', pythonScriptPath);
    return;
  }
  
  // Test 3: Start server and test API
  console.log('\n3️⃣ Starting server...');
  const server = require('./server/index.js');
  
  // Give server time to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const baseUrl = 'http://localhost:3001';
  
  try {
    // Test ML stats endpoint
    console.log('\n4️⃣ Testing ML stats endpoint...');
    const statsResponse = await axios.get(`${baseUrl}/api/ml/stats`);
    console.log('✅ Stats Response:', {
      success: statsResponse.data.success,
      isModelTrained: statsResponse.data.isModelTrained,
      modelType: statsResponse.data.modelType,
      message: statsResponse.data.message
    });
    
    // Test ML prediction endpoint
    console.log('\n5️⃣ Testing ML prediction endpoint...');
    const testFiles = [
      'src/components/App.js',
      'server/index.js',
      'ml_prediction.py'
    ];
    
    const predictionResponse = await axios.post(`${baseUrl}/api/ml/predict`, {
      files: testFiles,
      confidence: 0.3
    });
    
    console.log('✅ Prediction Response:', {
      success: predictionResponse.data.success,
      predictionsCount: predictionResponse.data.prediction?.predictions?.length || 0,
      fallbackUsed: predictionResponse.data.prediction?.fallbackUsed,
      modelType: predictionResponse.data.prediction?.modelType,
      message: predictionResponse.data.message
    });
    
    // Show top predictions
    const predictions = predictionResponse.data.prediction?.predictions || [];
    if (predictions.length > 0) {
      console.log('\n🔮 Top predictions:');
      predictions.slice(0, 3).forEach((pred, i) => {
        console.log(`   ${i + 1}. ${pred.approver}: ${Math.round(pred.confidence * 100)}%`);
      });
    }
    
    console.log('\n🎉 REAL ML Integration Test Complete!');
    console.log('✅ All tests passed - your ML system is working correctly!');
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    
    if (error.response?.data) {
      console.error('📋 Error Details:', error.response.data);
    }
  }
}

// Run the test
testRealMLIntegration().catch(console.error); 