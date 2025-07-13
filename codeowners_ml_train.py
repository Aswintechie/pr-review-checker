#!/usr/bin/env python3
"""
Training script for CODEOWNERS-aware ML system
Called by Node.js server with command line arguments
"""

import sys
import json
import os
from codeowners_ml_system import CodeownersMLPredictor

def main():
    """Train the CODEOWNERS-aware ML model"""
    
    if len(sys.argv) < 4:
        print("Usage: python codeowners_ml_train.py <owner> <repo> <token> [pr_count]", file=sys.stderr)
        sys.exit(1)
    
    owner = sys.argv[1]
    repo = sys.argv[2]
    token = sys.argv[3]
    pr_count = int(sys.argv[4]) if len(sys.argv) > 4 else 50
    
    # Initialize predictor
    predictor = CodeownersMLPredictor()
    
    try:
        # Train the model with the specified PR limit
        summary = predictor.train(owner, repo, token, months=1, pr_limit=pr_count)
        
        # Save the model
        model_path = "codeowners_ml_model.pkl"
        predictor.save_model(model_path)
        
        # Output summary as JSON for Node.js server
        output = {
            "success": True,
            "summary": {
                "trainingData": {
                    "totalPRs": summary.get('new_prs_processed', 0),
                    "totalApprovals": summary.get('total_samples', 0),
                    "totalApprovers": summary.get('trained_groups', 0) + summary.get('trained_teams', 0),
                    "totalFiles": summary.get('total_samples', 0) * 5,  # Estimate
                },
                "lastTrained": summary.get('training_date', ''),
                "topApprovers": [],
                "modelType": 'codeowners_random_forest',
                "features": ['group_file_count', 'group_file_ratio', 'dev_group_expertise', 'group_patterns', 'temporal_features'],
                "isModelLoaded": True,
                "version": '2.0',
                "confidence": 'High - trained on CODEOWNERS groups',
                "trained_groups": summary.get('trained_groups', 0),
                "trained_teams": summary.get('trained_teams', 0),
                "total_samples": summary.get('total_samples', 0),
                "team_samples": summary.get('team_samples', 0),
                "codeowners_rules": summary.get('codeowners_rules', 0),
                "pr_limit": summary.get('pr_limit', pr_count),
                "new_prs_processed": summary.get('new_prs_processed', 0),
                "model_path": model_path
            }
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "message": f"Training failed: {str(e)}"
        }
        print(json.dumps(error_output, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main() 