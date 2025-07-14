#!/usr/bin/env python3
"""
Test script to verify migration of existing models works correctly
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from codeowners_ml_system import CodeownersMLPredictor

def test_model_migration():
    """Test that existing models can be loaded with backward compatibility"""
    print("🧪 Testing model migration...")
    
    model_path = 'codeowners_ml_model.pkl'
    
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        return False
    
    try:
        predictor = CodeownersMLPredictor()
        predictor.load_model(model_path)
        
        print(f"✅ Successfully loaded model from {model_path}")
        print(f"📊 Model has {len(predictor.group_models)} group models")
        print(f"🏷️ Model has {len(predictor.group_labels)} group labels")
        print(f"📋 Model has {len(predictor.codeowners_patterns)} CODEOWNERS patterns")
        
        # Test that all patterns now have labels
        patterns_with_labels = sum(1 for p in predictor.codeowners_patterns if 'label' in p)
        print(f"📋 Patterns with labels: {patterns_with_labels}/{len(predictor.codeowners_patterns)}")
        
        # Test a simple prediction to ensure everything works
        test_files = [
            'client/src/App.js',
            'server/index.js',
            'README.md'
        ]
        
        print("\n🔮 Testing prediction with sample files...")
        predictions = predictor.predict_approvers(test_files, top_k=3)
        
        print(f"✅ Generated {len(predictions)} predictions")
        for i, pred in enumerate(predictions):
            print(f"  {i+1}. {pred['approver']}: {pred['confidence']:.1f}% confidence")
            if 'group_labels' in pred:
                print(f"     Groups: {pred['group_labels']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during migration test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Testing Model Migration")
    print("=" * 50)
    
    success = test_model_migration()
    
    if success:
        print("\n✅ Migration test completed successfully!")
    else:
        print("\n❌ Migration test failed!")
        sys.exit(1) 