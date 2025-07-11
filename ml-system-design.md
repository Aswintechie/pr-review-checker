# 🚀 Proper ML Implementation for PR Approval Prediction

## System Architecture

```
Data Collection → Feature Engineering → Model Training → Prediction API → Frontend
      ↓               ↓                    ↓              ↓            ↓
   GitHub API    Feature Store        ML Pipeline    REST API    React UI
```

## 1. Data Collection Layer

### GitHub Data Harvester
```python
class GitHubDataCollector:
    def collect_training_data(self, repo, months=12):
        """Collect comprehensive training data"""
        data = []
        
        for pr in get_merged_prs(repo, months):
            features = {
                # File features
                'files': pr.files,
                'file_types': extract_file_types(pr.files),
                'directories': extract_directories(pr.files),
                'lines_added': pr.additions,
                'lines_deleted': pr.deletions,
                'files_count': len(pr.files),
                
                # Code complexity (if possible to calculate)
                'avg_file_size': calculate_avg_file_size(pr.files),
                'has_tests': has_test_files(pr.files),
                'has_docs': has_documentation_files(pr.files),
                
                # PR metadata
                'pr_size': categorize_pr_size(pr.additions + pr.deletions),
                'description_length': len(pr.description),
                'has_breaking_changes': detect_breaking_changes(pr),
                
                # Temporal features
                'created_day_of_week': pr.created_at.weekday(),
                'created_hour': pr.created_at.hour,
                'time_to_merge': (pr.merged_at - pr.created_at).days,
                
                # Author features
                'author': pr.author,
                'author_seniority': calculate_seniority(pr.author, repo),
                'author_recent_activity': get_recent_activity(pr.author),
                
                # Target variables
                'approvers': pr.approvers,
                'time_to_approval': calculate_approval_times(pr)
            }
            data.append(features)
            
        return data
```

### Developer Expertise Calculator
```python
class DeveloperExpertise:
    def calculate_expertise_score(self, developer, files, repo_history):
        """Calculate developer expertise for specific files"""
        scores = {}
        
        for file in files:
            # Historical contributions to this file
            file_commits = get_file_commits(file, developer, months=12)
            
            # Directory expertise
            dir_expertise = get_directory_expertise(
                os.path.dirname(file), developer
            )
            
            # File type expertise
            ext = os.path.splitext(file)[1]
            type_expertise = get_filetype_expertise(ext, developer)
            
            # Recent activity weight
            recency_weight = calculate_recency_weight(file_commits)
            
            scores[file] = {
                'file_expertise': len(file_commits) * recency_weight,
                'directory_expertise': dir_expertise,
                'type_expertise': type_expertise,
                'combined_score': combine_scores(
                    len(file_commits), dir_expertise, type_expertise
                )
            }
            
        return scores
```

## 2. Feature Engineering

### Feature Transformer
```python
from sklearn.base import BaseEstimator, TransformerMixin
import pandas as pd

class PRFeatureTransformer(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.file_encoders = {}
        self.developer_encoders = {}
        
    def fit(self, X, y=None):
        # Learn encodings for categorical features
        self.fit_file_encodings(X)
        self.fit_developer_encodings(X)
        return self
        
    def transform(self, X):
        features = []
        
        for sample in X:
            # File-based features
            file_features = self.extract_file_features(sample['files'])
            
            # Developer expertise features (for each potential approver)
            dev_features = self.extract_developer_features(
                sample['potential_approvers'], sample['files']
            )
            
            # Interaction features
            interaction_features = self.extract_interactions(
                file_features, dev_features
            )
            
            # Combine all features
            combined = {
                **file_features,
                **dev_features, 
                **interaction_features
            }
            features.append(combined)
            
        return pd.DataFrame(features)
    
    def extract_file_features(self, files):
        """Extract features from changed files"""
        return {
            'total_files': len(files),
            'unique_extensions': len(set(get_extensions(files))),
            'max_directory_depth': max(get_depths(files)),
            'has_src_files': any('src/' in f for f in files),
            'has_test_files': any('test' in f for f in files),
            'has_config_files': any(is_config_file(f) for f in files),
            'js_files_count': sum(1 for f in files if f.endswith('.js')),
            'py_files_count': sum(1 for f in files if f.endswith('.py')),
            # Add more specific to your repo
        }
```

## 3. Model Architecture

### Multi-Label Ranking Model
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score
import xgboost as xgb

class ApprovalPredictor:
    def __init__(self):
        self.models = {
            'random_forest': Pipeline([
                ('features', PRFeatureTransformer()),
                ('classifier', MultiOutputClassifier(
                    RandomForestClassifier(
                        n_estimators=100,
                        max_depth=10,
                        random_state=42
                    )
                ))
            ]),
            
            'xgboost': Pipeline([
                ('features', PRFeatureTransformer()),
                ('classifier', MultiOutputClassifier(
                    xgb.XGBClassifier(
                        n_estimators=100,
                        max_depth=6,
                        learning_rate=0.1,
                        random_state=42
                    )
                ))
            ])
        }
        
        self.best_model = None
        
    def train(self, X, y):
        """Train and select best model"""
        best_score = 0
        
        for name, model in self.models.items():
            # Cross-validation
            scores = cross_val_score(
                model, X, y, 
                cv=5, 
                scoring='roc_auc_ovr'
            )
            
            avg_score = scores.mean()
            print(f"{name}: {avg_score:.3f} (+/- {scores.std() * 2:.3f})")
            
            if avg_score > best_score:
                best_score = avg_score
                self.best_model = model
                
        # Train best model on full dataset
        self.best_model.fit(X, y)
        
    def predict_approvers(self, pr_data, top_k=5):
        """Predict top-k most likely approvers"""
        if not self.best_model:
            raise ValueError("Model not trained yet")
            
        # Get probabilities for each developer
        probabilities = self.best_model.predict_proba([pr_data])[0]
        
        # Convert to developer rankings
        developer_scores = []
        for i, developer in enumerate(self.developers):
            score = probabilities[i][1]  # Probability of approval
            developer_scores.append({
                'developer': developer,
                'probability': score,
                'confidence': calculate_confidence(score)
            })
        
        # Sort by probability and return top-k
        developer_scores.sort(key=lambda x: x['probability'], reverse=True)
        return developer_scores[:top_k]
```

## 4. Evaluation Framework

### Model Evaluation
```python
class ModelEvaluator:
    def __init__(self):
        self.metrics = {}
        
    def evaluate(self, model, X_test, y_test):
        """Comprehensive model evaluation"""
        predictions = model.predict(X_test)
        probabilities = model.predict_proba(X_test)
        
        self.metrics = {
            'precision_at_k': self.precision_at_k(y_test, probabilities),
            'recall_at_k': self.recall_at_k(y_test, probabilities),
            'map_score': self.mean_average_precision(y_test, probabilities),
            'ndcg_score': self.ndcg_score(y_test, probabilities),
            'coverage': self.coverage_score(y_test, probabilities)
        }
        
        return self.metrics
    
    def precision_at_k(self, y_true, y_prob, k=5):
        """Precision@K - how many of top-k predictions are correct"""
        precision_scores = []
        
        for i in range(len(y_true)):
            # Get top-k predictions
            top_k_indices = np.argsort(y_prob[i])[-k:]
            
            # Calculate precision
            true_positives = sum(y_true[i][idx] for idx in top_k_indices)
            precision = true_positives / k
            precision_scores.append(precision)
            
        return np.mean(precision_scores)
```

## 5. Production API

### FastAPI Prediction Service
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib

app = FastAPI()

# Load trained model
model = joblib.load('trained_approval_model.pkl')

class PredictionRequest(BaseModel):
    files: List[str]
    repository: str
    author: str
    pr_metadata: dict

class PredictionResponse(BaseModel):
    predictions: List[Dict[str, Union[str, float]]]
    confidence: float
    model_version: str
    fallback_used: bool

@app.post("/predict", response_model=PredictionResponse)
async def predict_approvers(request: PredictionRequest):
    try:
        # Extract features
        features = extract_prediction_features(request)
        
        # Get predictions
        predictions = model.predict_approvers(features, top_k=10)
        
        # Calculate overall confidence
        confidence = calculate_overall_confidence(predictions)
        
        return PredictionResponse(
            predictions=predictions,
            confidence=confidence,
            model_version="v1.0",
            fallback_used=False
        )
        
    except Exception as e:
        # Fallback to rule-based system
        fallback_predictions = rule_based_fallback(request.files)
        
        return PredictionResponse(
            predictions=fallback_predictions,
            confidence=0.3,
            model_version="fallback",
            fallback_used=True
        )
```

## 6. Continuous Learning

### Model Retraining Pipeline
```python
class ContinuousLearning:
    def __init__(self):
        self.feedback_buffer = []
        
    def collect_feedback(self, prediction_id, actual_approvers, user_feedback):
        """Collect feedback for model improvement"""
        self.feedback_buffer.append({
            'prediction_id': prediction_id,
            'actual_approvers': actual_approvers,
            'user_feedback': user_feedback,
            'timestamp': datetime.now()
        })
        
    def retrain_if_needed(self):
        """Retrain model if performance degrades"""
        if len(self.feedback_buffer) > 100:  # Minimum feedback threshold
            recent_accuracy = self.calculate_recent_accuracy()
            
            if recent_accuracy < 0.7:  # Performance threshold
                print("Performance degraded, retraining model...")
                self.retrain_model()
                self.feedback_buffer = []  # Clear buffer
                
    def retrain_model(self):
        """Retrain with new data"""
        # Collect new training data
        new_data = collect_recent_pr_data(days=30)
        
        # Combine with existing data
        combined_data = combine_training_data(existing_data, new_data)
        
        # Retrain model
        model.train(combined_data)
        
        # Validate performance
        validation_score = validate_model(model, validation_data)
        
        if validation_score > current_model_score:
            deploy_new_model(model)
        else:
            print("New model performance worse, keeping current model")
```

## 7. Implementation Steps

### Phase 1: Data Foundation (Week 1-2)
1. Implement GitHub data collector
2. Create feature extraction pipeline
3. Build evaluation framework

### Phase 2: Model Development (Week 3-4)
1. Train baseline models
2. Implement cross-validation
3. Feature importance analysis

### Phase 3: Production Deployment (Week 5-6)
1. Build prediction API
2. Integrate with existing frontend
3. A/B testing framework

### Phase 4: Continuous Improvement (Ongoing)
1. Feedback collection
2. Model monitoring
3. Automated retraining

## Key Success Metrics

1. **Precision@5**: >70% of top-5 predictions should be actual approvers
2. **Time to First Approval**: Reduce by 20% through better targeting
3. **User Satisfaction**: >80% find predictions helpful
4. **Model Confidence**: Clear confidence intervals for predictions

This approach provides real ML with proper validation, continuous learning, and measurable business impact. 