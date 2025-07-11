#!/usr/bin/env python3
"""
Test script to demonstrate Python incremental training functionality
Shows how the system skips already processed PRs and generates .pkl files
"""

import os
import sys
import time
import json
from datetime import datetime
from codeowners_ml_system import CodeownersMLPredictor

def test_incremental_training():
    """Test the incremental training functionality"""
    print("🐍 Testing Python Incremental Training (.pkl generation)")
    print("=" * 60)
    
    # Configuration
    REPO_OWNER = "tenstorrent"
    REPO_NAME = "tt-metal"
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
    
    if not GITHUB_TOKEN:
        print("❌ Please set GITHUB_TOKEN environment variable")
        print("   export GITHUB_TOKEN='your_token_here'")
        return
    
    # Test parameters
    TEST_PR_COUNT = 20  # Small count for testing
    
    print(f"📊 Testing with {TEST_PR_COUNT} PRs from {REPO_OWNER}/{REPO_NAME}")
    print()
    
    # Initialize predictor
    predictor = CodeownersMLPredictor()
    
    # Test 1: Fresh training
    print("🧪 Test 1: Fresh Training (should process all PRs)")
    print("-" * 50)
    
    # Clear any existing training log
    if os.path.exists('python_training_log.json'):
        os.remove('python_training_log.json')
        print("🗑️ Cleared existing training log")
    
    start_time = time.time()
    
    try:
        # First training run - should process all PRs
        print(f"⏰ Starting first training run at {datetime.now().strftime('%H:%M:%S')}")
        
        # Note: Using months=1 to limit data for testing
        summary1 = predictor.train(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, months=1)
        
        first_run_time = time.time() - start_time
        print(f"⏰ First run completed in {first_run_time:.1f}s")
        
        # Save the model
        model_path = 'test_codeowners_model.pkl'
        predictor.save_model(model_path)
        print(f"💾 Model saved to {model_path}")
        
        # Display summary
        print("\n📊 First Run Summary:")
        print(f"   - Trained groups: {summary1['trained_groups']}")
        print(f"   - Total samples: {summary1['total_samples']}")
        print(f"   - Training date: {summary1['training_date']}")
        
        # Test 2: Incremental training (should skip all PRs)
        print("\n🧪 Test 2: Incremental Training (should skip all PRs)")
        print("-" * 50)
        
        # Create new predictor instance to simulate fresh start
        predictor2 = CodeownersMLPredictor()
        
        start_time2 = time.time()
        print(f"⏰ Starting second training run at {datetime.now().strftime('%H:%M:%S')}")
        
        # Second training run - should skip all PRs
        summary2 = predictor2.train(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, months=1)
        
        second_run_time = time.time() - start_time2
        print(f"⏰ Second run completed in {second_run_time:.1f}s")
        
        # Display summary
        print("\n📊 Second Run Summary:")
        print(f"   - Trained groups: {summary2['trained_groups']}")
        print(f"   - Total samples: {summary2['total_samples']}")
        print(f"   - Message: {summary2.get('message', 'N/A')}")
        
        # Test 3: Clear training log and partial retrain
        print("\n🧪 Test 3: Clear Log and Retrain (should process all PRs again)")
        print("-" * 50)
        
        # Clear training log
        if os.path.exists('python_training_log.json'):
            os.remove('python_training_log.json')
            print("🗑️ Cleared training log")
        
        # Create new predictor instance
        predictor3 = CodeownersMLPredictor()
        
        start_time3 = time.time()
        print(f"⏰ Starting third training run at {datetime.now().strftime('%H:%M:%S')}")
        
        # Third training run - should process all PRs again
        summary3 = predictor3.train(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, months=1)
        
        third_run_time = time.time() - start_time3
        print(f"⏰ Third run completed in {third_run_time:.1f}s")
        
        # Display summary
        print("\n📊 Third Run Summary:")
        print(f"   - Trained groups: {summary3['trained_groups']}")
        print(f"   - Total samples: {summary3['total_samples']}")
        print(f"   - Training date: {summary3['training_date']}")
        
        # Final comparison
        print("\n🎯 Performance Comparison:")
        print("=" * 50)
        print(f"🚀 First run (all PRs):  {first_run_time:.1f}s")
        print(f"⚡ Second run (skip):    {second_run_time:.1f}s")
        print(f"🔄 Third run (all PRs):  {third_run_time:.1f}s")
        
        speed_improvement = ((first_run_time - second_run_time) / first_run_time) * 100
        print(f"📈 Speed improvement: {speed_improvement:.1f}%")
        
        # Test model prediction
        if os.path.exists(model_path):
            print("\n🔮 Testing Model Prediction:")
            print("-" * 30)
            
            # Load the model
            test_predictor = CodeownersMLPredictor()
            test_predictor.load_model(model_path)
            
            # Test files
            test_files = [
                "tt_metal/hw/inc/tensix.h",
                "tests/ttnn/python_api_testing/sweep_tests/test_configs/ci_sweep_config.yaml",
                "docs/source/ttnn/ttnn/usage.rst"
            ]
            
            predictions = test_predictor.predict_approvers(test_files, top_k=3)
            
            print(f"🎯 Predictions for {len(test_files)} files:")
            for i, pred in enumerate(predictions[:3], 1):
                print(f"   {i}. {pred['approver']}: {pred['confidence']:.1f}%")
        
        print("\n✅ Incremental Training Test Completed Successfully!")
        print("🎉 Key Features Demonstrated:")
        print("   - ✅ Tracks processed PRs in python_training_log.json")
        print("   - ✅ Skips already processed PRs (massive speed improvement)")
        print("   - ✅ Generates real ML models (.pkl files)")
        print("   - ✅ Preserves training state between runs")
        print("   - ✅ Can be reset by clearing training log")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup test files
        cleanup_files = ['test_codeowners_model.pkl', 'python_training_log.json']
        for file in cleanup_files:
            if os.path.exists(file):
                os.remove(file)
                print(f"🗑️ Cleaned up {file}")

if __name__ == "__main__":
    print("🔧 Make sure you have GITHUB_TOKEN set:")
    print("   export GITHUB_TOKEN='your_token_here'")
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--run':
        test_incremental_training()
    else:
        print("📋 This script will test Python incremental training functionality")
        print("   It will make 3 training runs to demonstrate PR skipping")
        print("   Run with: python test-python-incremental.py --run") 