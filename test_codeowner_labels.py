#!/usr/bin/env python3
"""
Test script for codeowner group labeling functionality
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from codeowners_ml_system import CodeownersMLPredictor

def test_label_extraction():
    """Test the extract_group_label function"""
    print("🧪 Testing label extraction...")
    
    predictor = CodeownersMLPredictor()
    
    # Test cases from the user's examples
    test_cases = [
        ('ttnn/cpp/ttnn/operations/eltwise/quantization/', 'quantization'),
        ('tests/ttnn/unit_tests/operations/eltwise/', 'eltwise'),
        ('ttnn/cpp/ttnn/operations/experimental/reduction/**/CMakeLists.txt', 'reduction'),
        ('*', 'global'),
        ('*.md', 'md_files'),
        ('*.js', 'js_files'),
        ('src/components/', 'components'),
        ('api/ml/', 'ml'),
        ('docs/', 'docs'),
        ('/client/src/components/', 'components'),
        ('server/index.js', 'index'),
        ('package.json', 'package'),
        ('README.md', 'README'),
        ('/.github/', 'github'),
    ]
    
    for pattern, expected_label in test_cases:
        actual_label = predictor.extract_group_label(pattern)
        status = "✅" if actual_label == expected_label else "❌"
        print(f"{status} {pattern:50} -> {actual_label:15} (expected: {expected_label})")

def test_codeowners_parsing():
    """Test parsing CODEOWNERS file with labels"""
    print("\n🧪 Testing CODEOWNERS parsing with labels...")
    
    predictor = CodeownersMLPredictor()
    
    # Sample CODEOWNERS content
    codeowners_content = """
# Global ownership
* @owner1 @owner2

# Frontend
/client/ @frontend-team @ui-designer
/src/components/ @frontend-team @component-expert

# Backend
/server/ @backend-team @api-expert
/api/ml/ @ml-team @data-scientist

# Documentation
*.md @docs-team @technical-writer
README.md @project-lead @docs-team

# Configuration
*.json @config-team @devops
package.json @frontend-team @build-expert

# Tests
tests/ @qa-team @test-expert
**/test/** @qa-team @test-expert
**/*.test.* @qa-team @test-expert
"""
    
    rules = predictor.parse_codeowners(codeowners_content)
    
    print(f"📋 Parsed {len(rules)} rules:")
    for rule in rules:
        print(f"  Pattern: {rule['pattern']:25} Label: {rule['label']:15} Owners: {rule['owners']}")

def test_file_matching():
    """Test matching files to groups with labels"""
    print("\n🧪 Testing file matching with labels...")
    
    predictor = CodeownersMLPredictor()
    
    # Sample CODEOWNERS content
    codeowners_content = """
* @owner1 @owner2
/client/ @frontend-team
/server/ @backend-team
/api/ml/ @ml-team
*.md @docs-team
tests/ @qa-team
"""
    
    rules = predictor.parse_codeowners(codeowners_content)
    
    test_files = [
        'client/src/App.js',
        'server/index.js',
        'api/ml/predict.py',
        'README.md',
        'tests/unit/test_api.py',
        'docs/setup.md',
        'package.json'
    ]
    
    file_groups = predictor.match_files_to_groups(test_files, rules)
    
    print(f"📁 Matched {len(test_files)} files to {len(file_groups)} groups:")
    for group_id, files in file_groups.items():
        group_info = predictor.get_group_info(group_id)
        print(f"  Group: {group_id}")
        print(f"    Label: {group_info['label']}")
        print(f"    Pattern: {group_info['pattern']}")
        print(f"    Owners: {group_info['owners']}")
        print(f"    Files: {files}")
        print()

if __name__ == "__main__":
    print("🚀 Testing Codeowner Group Labeling Functionality")
    print("=" * 60)
    
    test_label_extraction()
    test_codeowners_parsing()
    test_file_matching()
    
    print("\n✅ All tests completed!") 