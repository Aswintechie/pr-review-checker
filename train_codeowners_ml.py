#!/usr/bin/env python3
"""
Training script for CODEOWNERS-aware ML system
"""

import os
import sys
from codeowners_ml_system import CodeownersMLPredictor

def main():
    """Train the CODEOWNERS-aware ML model"""
    
    # Configuration
    REPO_OWNER = "tenstorrent"
    REPO_NAME = "tt-metal"
    GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
    
    if not GITHUB_TOKEN:
        print("❌ Please set GITHUB_TOKEN environment variable")
        sys.exit(1)
    
    print("🚀 Starting CODEOWNERS-aware ML training...")
    print(f"📊 Repository: {REPO_OWNER}/{REPO_NAME}")
    
    # Initialize predictor
    predictor = CodeownersMLPredictor()
    
    try:
        # Train the model
        print("\n🧠 Training models for each CODEOWNERS group...")
        summary = predictor.train(REPO_OWNER, REPO_NAME, GITHUB_TOKEN, months=1)
        
        # Save the model
        model_path = "codeowners_ml_model.pkl"
        predictor.save_model(model_path)
        
        print(f"\n✅ Training completed successfully!")
        print(f"📊 Summary:")
        print(f"   - Trained groups: {summary['trained_groups']}")
        print(f"   - Total samples: {summary['total_samples']}")
        print(f"   - CODEOWNERS rules: {summary['codeowners_rules']}")
        print(f"   - Model saved to: {model_path}")
        print(f"   - Training date: {summary['training_date']}")
        
        # Test the model
        print(f"\n🧪 Testing model with sample files...")
        test_files = [
            "tt_metal/hw/inc/tensix.h",
            "tests/test_basic.py", 
            "docs/README.md",
            "tt_metal/programming_examples/matmul_common/bmm_op.hpp"
        ]
        
        predictions = predictor.predict_approvers(test_files, top_k=5)
        
        print(f"📋 Test predictions for files: {test_files}")
        for i, pred in enumerate(predictions):
            print(f"   {i+1}. {pred['approver']}: {pred['confidence']:.1f}% - {pred['reasoning']}")
        
    except Exception as e:
        print(f"❌ Training failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 