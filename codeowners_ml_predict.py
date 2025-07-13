#!/usr/bin/env python3
"""
CODEOWNERS-aware ML Prediction Script
Called by Node.js API to make real-time predictions using CODEOWNERS group models
"""

import sys
import json
import os
from codeowners_ml_system import CodeownersMLPredictor

def load_model():
    """Load the trained CODEOWNERS-aware ML model"""
    try:
        predictor = CodeownersMLPredictor()
        model_path = os.path.join(os.path.dirname(__file__), 'codeowners_ml_model.pkl')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Trained CODEOWNERS ML model not found at {model_path}")
        
        # Load the model (suppress print statements)
        predictor.load_model(model_path)
        return predictor
    except Exception as e:
        print(f"Error loading CODEOWNERS ML model: {e}", file=sys.stderr)
        return None

def make_prediction(files, top_k=5):
    """Make CODEOWNERS-aware ML prediction for approvers"""
    try:
        predictor = load_model()
        if not predictor:
            return None
            
        # Make prediction using CODEOWNERS groups
        predictions = predictor.predict_approvers(files, top_k)
        
        # Format for API response
        formatted_predictions = []
        for pred in predictions:
            formatted_predictions.append({
                'approver': pred['approver'],
                'confidence': pred['confidence'],
                'probability': pred['probability'],
                'reasoning': pred['reasoning'],
                'group_scores': pred.get('group_scores', {})  # Include group-specific scores
            })
        
        return formatted_predictions
        
    except Exception as e:
        print(f"Error making CODEOWNERS ML prediction: {e}", file=sys.stderr)
        return None

def main():
    """Main function called by Node.js"""
    if len(sys.argv) < 2:
        print("Usage: python codeowners_ml_predict.py <files_json> [top_k]", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse arguments
        files_json = sys.argv[1]
        top_k = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        
        # Parse files
        files = json.loads(files_json)
        
        # Make prediction
        predictions = make_prediction(files, top_k)
        
        if predictions is None:
            print("Failed to make CODEOWNERS ML prediction", file=sys.stderr)
            sys.exit(1)
        
        # Output results as JSON
        print(json.dumps(predictions))
        
    except Exception as e:
        print(f"Error in CODEOWNERS ML prediction: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 