#!/usr/bin/env python3

"""
Debug ML Training Script
Tests the training pipeline with mock data to identify issues
"""

import json
import pickle
import sys
import os
from datetime import datetime
from collections import defaultdict
import numpy as np
import pandas as pd

def create_mock_codeowners():
    """Create mock CODEOWNERS content for testing"""
    return """
# Core team
/core/ @tt-aho @tt-rkim @tt-asaigal
/ttnn/ @tt-dma @tt-bojko @tt-soonjaec
/models/ @tt-rjordahl @tt-tenstorrent @tt-tlawrie

# Documentation
*.md @tt-yichiyang @tt-amyk
/docs/ @tt-yuntaoz @tt-jvasiljevic

# Build system
/cmake/ @tt-kmaley @tt-vmilosevic
*.cmake @tt-kmaley
CMakeLists.txt @tt-kmaley @tt-vmilosevic

# Tests
/tests/ @tt-aho @tt-rkim @blozano-tt
**/test_*.py @tt-aho @blozano-tt
"""

def create_mock_training_data():
    """Create realistic mock training data"""
    
    # Mock PR data that would come from GitHub API
    mock_prs = []
    
    # Use data from our training log to make it realistic
    try:
        with open('training_pr_log.json', 'r') as f:
            log_data = json.load(f)
            pr_numbers = log_data.get('pr_numbers', [])[:100]  # Last 100 PRs
    except:
        pr_numbers = list(range(24800, 24900))  # Fallback PR numbers
    
    # Define some realistic file patterns and approvers
    file_patterns = [
        ['core/ops.cpp', 'core/device.cpp'],
        ['ttnn/tensor.py', 'ttnn/operations.py'],
        ['models/resnet.py', 'models/bert.py'],
        ['docs/api.md', 'README.md'],
        ['tests/test_core.py', 'tests/test_ttnn.py'],
        ['cmake/build.cmake', 'CMakeLists.txt'],
        ['core/kernel.cpp', 'ttnn/graph.py', 'tests/test_integration.py']
    ]
    
    approver_patterns = {
        'core': ['tt-aho', 'tt-rkim', 'tt-asaigal'],
        'ttnn': ['tt-dma', 'tt-bojko', 'tt-soonjaec'],
        'models': ['tt-rjordahl', 'tt-tenstorrent', 'tt-tlawrie'],
        'docs': ['tt-yichiyang', 'tt-amyk'],
        'tests': ['tt-aho', 'tt-rkim', 'blozano-tt'],
        'cmake': ['tt-kmaley', 'tt-vmilosevic']
    }
    
    for i, pr_num in enumerate(pr_numbers):
        files = file_patterns[i % len(file_patterns)]
        
        # Determine likely approvers based on files
        likely_approvers = []
        for file_path in files:
            for pattern, approvers in approver_patterns.items():
                if pattern in file_path or pattern in file_path.split('/')[0]:
                    likely_approvers.extend(approvers)
        
        # Remove duplicates and randomly select 1-3 approvers
        import random
        unique_approvers = list(set(likely_approvers))
        selected_approvers = random.sample(unique_approvers, min(len(unique_approvers), random.randint(1, 3)))
        
        mock_pr = {
            'number': pr_num,
            'title': f'Fix issue #{pr_num} in {files[0].split("/")[0]}',
            'user': {'login': f'developer-{i%10}'},
            'created_at': f'2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}T10:30:00Z',
            'merged_at': f'2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}T11:30:00Z',
            'url': f'https://api.github.com/repos/tenstorrent/tt-metal/pulls/{pr_num}',
            'additions': random.randint(10, 500),
            'deletions': random.randint(5, 200),
            'state': 'closed'
        }
        
        # Create file data
        file_data = [{'filename': f} for f in files]
        
        # Create review data
        review_data = [
            {
                'user': {'login': approver},
                'state': 'APPROVED'
            }
            for approver in selected_approvers
        ]
        
        mock_prs.append({
            'pr': mock_pr,
            'files': file_data,
            'reviews': review_data
        })
    
    print(f"📊 Created {len(mock_prs)} mock PRs for testing")
    return mock_prs

def test_codeowners_parsing():
    """Test CODEOWNERS parsing functionality"""
    print("🧪 Testing CODEOWNERS parsing...")
    
    from codeowners_ml_system import CodeownersMLPredictor
    
    predictor = CodeownersMLPredictor()
    codeowners_content = create_mock_codeowners()
    
    rules = predictor.parse_codeowners(codeowners_content)
    print(f"✅ Parsed {len(rules)} rules")
    
    # Test file matching
    test_files = [
        'core/ops.cpp',
        'ttnn/tensor.py', 
        'models/resnet.py',
        'docs/readme.md',
        'tests/test_core.py',
        'cmake/build.cmake'
    ]
    
    file_groups = predictor.match_files_to_groups(test_files, rules)
    print(f"✅ Matched files to {len(file_groups)} groups:")
    
    for group_id, files in file_groups.items():
        print(f"  📁 {group_id}: {files}")
    
    return predictor, rules

def test_model_training():
    """Test model training with mock data"""
    print("\n🧪 Testing model training...")
    
    predictor, rules = test_codeowners_parsing()
    predictor.codeowners_patterns = rules
    
    # Create training data in the format expected by the ML system
    mock_prs = create_mock_training_data()
    
    processed_data = []
    for mock_pr_data in mock_prs:
        pr = mock_pr_data['pr']
        files = [f['filename'] for f in mock_pr_data['files']]
        approvers = [r['user']['login'] for r in mock_pr_data['reviews']]
        
        # Match files to groups
        file_groups = predictor.match_files_to_groups(files, rules)
        
        if file_groups:  # Only include PRs with matching files
            processed_data.append({
                'pr_number': pr['number'],
                'files': files,
                'file_groups': file_groups,
                'approvers': approvers,
                'author': pr['user']['login'],
                'additions': pr.get('additions', 0),
                'deletions': pr.get('deletions', 0),
                'title': pr['title'],
                'created_at': pr['created_at'],
                'merged_at': pr['merged_at']
            })
    
    print(f"✅ Processed {len(processed_data)} PRs with CODEOWNERS matches")
    
    # Test group training data preparation
    group_data = predictor.prepare_group_training_data(processed_data)
    print(f"✅ Prepared training data for {len(group_data)} groups:")
    
    for group_id, (X, y) in group_data.items():
        positive_samples = sum(y)
        print(f"  📊 {group_id}: {len(X)} samples, {positive_samples} positive, {len(y)-positive_samples} negative")
    
    # Train models for each group
    predictor.group_models = {}
    predictor.group_features = {}
    predictor.group_encoders = {}
    predictor.group_scalers = {}
    
    for group_id, (X, y) in group_data.items():
        if len(set(y)) > 1:  # Need at least 2 classes
            print(f"🤖 Training model for group: {group_id}")
            
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.preprocessing import LabelEncoder, StandardScaler
            
            # Encode labels
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y)
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Train model
            model = RandomForestClassifier(n_estimators=50, random_state=42, max_depth=10)
            model.fit(X_scaled, y_encoded)
            
            # Store everything
            predictor.group_models[group_id] = model
            predictor.group_encoders[group_id] = label_encoder
            predictor.group_scalers[group_id] = scaler
            predictor.group_features[group_id] = [f'feature_{i}' for i in range(X.shape[1])]
            
            print(f"  ✅ Trained model for {group_id}: {len(set(y))} classes")
    
    predictor.is_trained = True
    predictor.training_date = datetime.now().isoformat()
    
    return predictor, processed_data

def test_model_saving():
    """Test model saving and loading"""
    print("\n🧪 Testing model saving...")
    
    predictor, training_data = test_model_training()
    
    # Test saving
    try:
        test_model_path = 'debug_test_model.pkl'
        
        # Create model data to save
        model_data = {
            'group_models': predictor.group_models,
            'group_features': predictor.group_features,
            'group_encoders': predictor.group_encoders,
            'group_scalers': predictor.group_scalers,
            'codeowners_patterns': predictor.codeowners_patterns,
            'group_developer_stats': predictor.group_developer_stats,
            'training_data': {
                'pr_numbers': [item['pr_number'] for item in training_data]
            },
            'metadata': {
                'training_date': predictor.training_date,
                'is_trained': predictor.is_trained,
                'total_prs': len(training_data),
                'version': '2.0'
            }
        }
        
        with open(test_model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"✅ Model saved successfully to {test_model_path}")
        
        # Test loading
        with open(test_model_path, 'rb') as f:
            loaded_data = pickle.load(f)
        
        print(f"✅ Model loaded successfully")
        print(f"  📊 Groups: {len(loaded_data['group_models'])}")
        print(f"  📈 Training PRs: {len(loaded_data['training_data']['pr_numbers'])}")
        print(f"  📅 Training date: {loaded_data['metadata']['training_date']}")
        
        # Test prediction
        test_files = ['core/ops.cpp', 'tests/test_core.py']
        
        # Restore predictor state
        predictor.group_models = loaded_data['group_models']
        predictor.group_features = loaded_data['group_features']
        predictor.group_encoders = loaded_data['group_encoders']
        predictor.group_scalers = loaded_data['group_scalers']
        predictor.codeowners_patterns = loaded_data['codeowners_patterns']
        
        predictions = predictor.predict_approvers(test_files, top_k=5)
        print(f"✅ Test prediction successful: {len(predictions)} approvers predicted")
        
        for pred in predictions[:3]:
            print(f"  👤 {pred['approver']}: {pred['confidence']:.1%}")
        
        # Clean up
        os.remove(test_model_path)
        print(f"✅ Cleanup completed")
        
        return True
        
    except Exception as e:
        print(f"❌ Model saving/loading failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all debug tests"""
    print("🔧 Starting ML Training Debug Session")
    print("=" * 50)
    
    try:
        # Test CODEOWNERS parsing
        test_codeowners_parsing()
        
        # Test model training
        test_model_training()
        
        # Test model saving/loading
        success = test_model_saving()
        
        if success:
            print("\n" + "=" * 50)
            print("✅ All tests passed! ML training pipeline is working.")
            print("🎯 Ready to train with real GitHub data.")
            
            # Suggest next steps
            print("\n💡 Next steps:")
            print("1. Use a real GitHub token")
            print("2. Train with actual repository data")
            print("3. Add blozano-tt to fallback statistics")
            
        else:
            print("\n" + "=" * 50)
            print("❌ Some tests failed. Check the errors above.")
            
    except Exception as e:
        print(f"\n❌ Debug session failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 