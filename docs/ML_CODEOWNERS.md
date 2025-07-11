# 🧠 ML CODEOWNERS - AI-Powered Approval Predictions

## Overview

The ML CODEOWNERS system uses machine learning to predict who is most likely to approve your Pull Request based on historical approval patterns. It analyzes past PRs to learn which reviewers typically approve which types of file changes.

## How It Works

### 1. Training Phase
- Fetches the last 50 merged PRs from your repository
- Analyzes which files were changed in each PR
- Records who actually approved each PR
- Extracts patterns from file paths (extensions, directories, special patterns)
- Builds a model correlating file patterns to approvers

### 2. Prediction Phase
- When you analyze a PR, the system extracts patterns from the changed files
- Matches these patterns against the trained model
- Calculates confidence scores for each potential approver
- Shows percentage likelihood inline with existing CODEOWNERS

## Features

### Smart Pattern Recognition
The ML system recognizes various file patterns:
- **Exact paths**: `src/components/App.js`
- **Directory patterns**: `src/components/**`
- **Extensions**: `*.js`, `*.md`, `*.json`
- **Special patterns**: `**/test/**`, `**/*.test.*`, `**/docs/**`

### Confidence Scoring
- **High (70%+)**: Very likely to approve based on strong historical patterns
- **Medium (50-69%)**: Moderately likely based on some matching patterns
- **Low (30-49%)**: Some likelihood based on weak patterns
- **Below 30%**: Not shown (filtered out for clarity)

### Seamless Integration
- No separate tabs or complex UI
- Approval percentages appear inline with usernames
- Only shows predictions for existing CODEOWNERS
- Automatic background fetching when analyzing PRs

## Setup & Configuration

### 1. Environment Variables
```bash
# Optional: GitHub token for better rate limits and private repos
export GITHUB_TOKEN=your_github_token_here
```

### 2. Training the Model
The model needs to be trained once on your repository's historical data:

```bash
# Using the demo script
python train_codeowners_ml.py

# Or via API
curl -X POST http://localhost:3001/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "your-org",
    "repo": "your-repo", 
    "token": "your-github-token",
    "prCount": 50
  }'
```

### 3. API Endpoints

#### Train Model
```http
POST /api/ml/train
Content-Type: application/json

{
  "owner": "facebook",
  "repo": "react",
  "token": "ghp_xxx...",
  "prCount": 50
}
```

#### Get Predictions
```http
POST /api/ml/predict
Content-Type: application/json

{
  "files": ["src/App.js", "src/components/Header.js"],
  "confidence": 0.3
}
```

#### Model Statistics
```http
GET /api/ml/stats
```

## Usage Examples

### Basic PR Analysis
1. Paste a GitHub PR URL into the main interface
2. Click "Analyze PR Requirements" 
3. See approval percentages next to each reviewer's name
4. Higher percentages indicate more likely approvers

### Understanding the Predictions
- **85% likely**: This person almost always approves PRs with similar files
- **65% likely**: This person often approves PRs with these types of changes
- **45% likely**: This person sometimes approves PRs with related patterns
- **No badge**: Either no prediction or confidence below 30%

### Model Retraining
Retrain the model periodically to incorporate new approval patterns:
- Weekly for active repositories
- Monthly for less active repositories
- After significant team changes

## Technical Details

### Data Storage
- Model data is stored in `server/ml-model.json`
- Includes training data, patterns, and approver statistics
- Automatically saved after training

### Pattern Extraction Algorithm
```javascript
// Example patterns extracted from "src/components/App.test.js"
[
  "src/components/App.test.js",    // Exact path
  "src/**",                       // Directory pattern
  "src/components/**",            // Subdirectory pattern
  "*.js",                         // Extension pattern
  "**/test/**",                   // Test pattern
  "**/*.test.*"                   // Test file pattern
]
```

### Confidence Calculation
```javascript
// Simplified confidence scoring
for each pattern in file_patterns:
  if pattern in trained_patterns:
    pattern_weight = pattern_frequency / total_prs
    for each approver in pattern_approvers:
      approver_score += pattern_weight

normalized_confidence = approver_score / max_score
```

## Best Practices

### 1. Training Data Quality
- Use at least 20-30 merged PRs for meaningful patterns
- Ensure PRs have diverse file changes
- Include PRs from different team members

### 2. Confidence Thresholds
- **Conservative (50%+)**: Only show high-confidence predictions
- **Balanced (30%+)**: Show moderate and high confidence (default)
- **Aggressive (20%+)**: Show more predictions, including lower confidence

### 3. Model Maintenance
- Retrain after major team changes
- Monitor prediction accuracy over time
- Adjust confidence thresholds based on team feedback

## Troubleshooting

### Common Issues

#### No Predictions Showing
- Check if model is trained: `GET /api/ml/stats`
- Verify GitHub token has repository access
- Ensure training data exists (merged PRs with approvals)

#### Low Prediction Accuracy
- Increase training data size (more PRs)
- Check if approval patterns are consistent
- Consider team structure changes

#### Rate Limiting
- Use GitHub token for higher rate limits
- Reduce training batch size
- Add delays between API calls

### Debugging

#### Check Model Status
```bash
curl http://localhost:3001/api/ml/stats
```

#### View Training Data
```javascript
// In browser console after training
fetch('/api/ml/stats').then(r => r.json()).then(console.log)
```

#### Monitor API Calls
```bash
# Server logs show ML prediction requests
npm run server
```

## Limitations

### Current Limitations
- Only considers file paths, not file content
- Requires historical approval data
- May not work well for brand new repositories
- Doesn't account for reviewer availability

### Future Enhancements
- Content-based analysis (code similarity)
- Time-based weighting (recent approvals matter more)
- Reviewer expertise scoring
- Integration with code ownership tools

## Privacy & Security

### Data Handling
- Only uses publicly available GitHub data
- No sensitive code content is analyzed
- Tokens are not stored permanently
- All data stays on your infrastructure

### Permissions Required
- Repository read access
- Pull request read access
- No write permissions needed

## Performance

### Training Performance
- ~2-5 seconds per PR analyzed
- ~50 PRs = 2-4 minutes training time
- Depends on repository size and API rate limits

### Prediction Performance
- Near-instantaneous (<100ms)
- Cached model data in memory
- No external API calls for predictions

## Contributing

To contribute to the ML CODEOWNERS system:

1. Review the algorithm in `codeowners_ml_system.py`
2. Test with different repository patterns
3. Suggest improvements for pattern recognition
4. Report accuracy issues with specific examples

## Support

For issues or questions:
- Check server logs for error messages
- Verify GitHub API connectivity
- Review training data quality
- Consider team-specific approval patterns

---

*The ML CODEOWNERS system learns from your team's actual approval behavior to provide intelligent suggestions, making code review assignments more efficient and accurate.* 