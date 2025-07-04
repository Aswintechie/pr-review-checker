/**
 * ML CODEOWNERS Component
 * Machine Learning based code ownership prediction
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MLCodeowners() {
  const [activeTab, setActiveTab] = useState('predict');
  const [modelStats, setModelStats] = useState(null);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Training form state
  const [trainForm, setTrainForm] = useState({
    owner: '',
    repo: '',
    token: '',
    prCount: 50,
  });

  // Prediction form state
  const [predictForm, setPredictForm] = useState({
    files: [''],
    confidence: 0.3,
  });

  // Prediction results
  const [predictions, setPredictions] = useState(null);

  // Comparison state
  const [compareForm, setCompareForm] = useState({
    files: [''],
    codeownersContent: '',
    confidence: 0.3,
  });
  const [comparison, setComparison] = useState(null);

  // Load model stats on component mount
  useEffect(() => {
    loadModelStats();
  }, []);

  const loadModelStats = async () => {
    try {
      const response = await axios.get('/api/ml/stats');
      setModelStats(response.data.stats);
      setIsModelTrained(response.data.isModelTrained);
    } catch (err) {
      // Error loading model stats
    }
  };

  const handleTrainModel = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ml/train', trainForm);
      setModelStats(response.data.summary);
      setIsModelTrained(true);
      setError('');
      alert('Model trained successfully! ✅');
      await loadModelStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Training failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const files = predictForm.files.filter(file => file.trim() !== '');
      const response = await axios.post('/api/ml/predict', {
        files,
        confidence: predictForm.confidence,
      });
      setPredictions(response.data.prediction);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const files = compareForm.files.filter(file => file.trim() !== '');
      const response = await axios.post('/api/ml/compare', {
        files,
        codeownersContent: compareForm.codeownersContent,
        confidence: compareForm.confidence,
      });
      setComparison(response.data.comparison);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const addFileInput = formType => {
    if (formType === 'predict') {
      setPredictForm(prev => ({
        ...prev,
        files: [...prev.files, ''],
      }));
    } else if (formType === 'compare') {
      setCompareForm(prev => ({
        ...prev,
        files: [...prev.files, ''],
      }));
    }
  };

  const removeFileInput = (formType, index) => {
    if (formType === 'predict') {
      setPredictForm(prev => ({
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
      }));
    } else if (formType === 'compare') {
      setCompareForm(prev => ({
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
      }));
    }
  };

  const updateFileInput = (formType, index, value) => {
    if (formType === 'predict') {
      setPredictForm(prev => ({
        ...prev,
        files: prev.files.map((file, i) => (i === index ? value : file)),
      }));
    } else if (formType === 'compare') {
      setCompareForm(prev => ({
        ...prev,
        files: prev.files.map((file, i) => (i === index ? value : file)),
      }));
    }
  };

  const renderModelStats = () => {
    if (!modelStats) return null;

    return (
      <div className='ml-stats-card'>
        <h3>🧠 Model Statistics</h3>
        <div className='stats-grid'>
          <div className='stat-item'>
            <span className='stat-label'>Training PRs</span>
            <span className='stat-value'>{modelStats.trainingData.totalPRs}</span>
          </div>
          <div className='stat-item'>
            <span className='stat-label'>Patterns Learned</span>
            <span className='stat-value'>{modelStats.trainingData.totalPatterns}</span>
          </div>
          <div className='stat-item'>
            <span className='stat-label'>Unique Approvers</span>
            <span className='stat-value'>{modelStats.trainingData.totalApprovers}</span>
          </div>
          <div className='stat-item'>
            <span className='stat-label'>Last Trained</span>
            <span className='stat-value'>
              {new Date(modelStats.lastTrained).toLocaleDateString()}
            </span>
          </div>
        </div>

        {modelStats.topPatterns && modelStats.topPatterns.length > 0 && (
          <div className='top-patterns'>
            <h4>Top Patterns</h4>
            <div className='pattern-list'>
              {modelStats.topPatterns.slice(0, 5).map((pattern, index) => (
                <div key={index} className='pattern-item'>
                  <code>{pattern.pattern}</code>
                  <span className='pattern-count'>{pattern.count} PRs</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modelStats.topApprovers && modelStats.topApprovers.length > 0 && (
          <div className='top-approvers'>
            <h4>Top Approvers</h4>
            <div className='approver-list'>
              {modelStats.topApprovers.slice(0, 5).map((approver, index) => (
                <div key={index} className='approver-item'>
                  <span className='approver-name'>@{approver.approver}</span>
                  <span className='approver-count'>{approver.count} approvals</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTrainingTab = () => (
    <div className='ml-tab-content'>
      <div className='ml-section'>
        <h3>🎯 Train ML Model</h3>
        <p>Train the ML model on historical PR data to learn approval patterns.</p>

        <form onSubmit={handleTrainModel} className='ml-form'>
          <div className='form-group'>
            <label>Repository Owner</label>
            <input
              type='text'
              placeholder='e.g., facebook'
              value={trainForm.owner}
              onChange={e => setTrainForm(prev => ({ ...prev, owner: e.target.value }))}
              required
            />
          </div>

          <div className='form-group'>
            <label>Repository Name</label>
            <input
              type='text'
              placeholder='e.g., react'
              value={trainForm.repo}
              onChange={e => setTrainForm(prev => ({ ...prev, repo: e.target.value }))}
              required
            />
          </div>

          <div className='form-group'>
            <label>GitHub Token</label>
            <input
              type='password'
              placeholder='GitHub personal access token'
              value={trainForm.token}
              onChange={e => setTrainForm(prev => ({ ...prev, token: e.target.value }))}
              required
            />
          </div>

          <div className='form-group'>
            <label>Number of PRs to Analyze</label>
            <input
              type='number'
              min='10'
              max='100'
              value={trainForm.prCount}
              onChange={e => setTrainForm(prev => ({ ...prev, prCount: parseInt(e.target.value) }))}
            />
          </div>

          <button type='submit' disabled={loading} className='ml-button primary'>
            {loading ? '🔄 Training...' : '🎯 Train Model'}
          </button>
        </form>
      </div>

      {renderModelStats()}
    </div>
  );

  const renderPredictTab = () => (
    <div className='ml-tab-content'>
      <div className='ml-section'>
        <h3>🔮 Predict Approvers</h3>
        <p>Get ML predictions for who might approve your PR based on the files changed.</p>

        <form onSubmit={handlePredict} className='ml-form'>
          <div className='form-group'>
            <label>Files Changed</label>
            {predictForm.files.map((file, index) => (
              <div key={index} className='file-input-group'>
                <input
                  type='text'
                  placeholder='e.g., src/components/App.js'
                  value={file}
                  onChange={e => updateFileInput('predict', index, e.target.value)}
                />
                {predictForm.files.length > 1 && (
                  <button
                    type='button'
                    onClick={() => removeFileInput('predict', index)}
                    className='remove-file-btn'
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button type='button' onClick={() => addFileInput('predict')} className='add-file-btn'>
              + Add File
            </button>
          </div>

          <div className='form-group'>
            <label>Confidence Threshold</label>
            <input
              type='range'
              min='0.1'
              max='1'
              step='0.1'
              value={predictForm.confidence}
              onChange={e =>
                setPredictForm(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))
              }
            />
            <span className='confidence-value'>{(predictForm.confidence * 100).toFixed(0)}%</span>
          </div>

          <button type='submit' disabled={loading || !isModelTrained} className='ml-button primary'>
            {loading ? '🔄 Predicting...' : '🔮 Predict Approvers'}
          </button>
        </form>

        {!isModelTrained && (
          <div className='warning'>⚠️ Please train the model first before making predictions.</div>
        )}
      </div>

      {predictions && (
        <div className='ml-results'>
          <h3>🎯 Prediction Results</h3>
          <div className='predictions-list'>
            {predictions.predictions.map((prediction, index) => (
              <div key={index} className='prediction-item'>
                <div className='prediction-approver'>@{prediction.approver}</div>
                <div className='prediction-confidence'>
                  {(prediction.confidence * 100).toFixed(1)}% confidence
                </div>
                <div className='prediction-bar'>
                  <div
                    className='prediction-fill'
                    style={{ width: `${prediction.confidence * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className='prediction-meta'>
            <p>
              Matched {predictions.matchedPatterns.length} of {predictions.totalPatterns} patterns
            </p>
            {predictions.matchedPatterns.length > 0 && (
              <details>
                <summary>View Matched Patterns</summary>
                <div className='matched-patterns'>
                  {predictions.matchedPatterns.map((pattern, index) => (
                    <code key={index} className='pattern-tag'>
                      {pattern}
                    </code>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderCompareTab = () => (
    <div className='ml-tab-content'>
      <div className='ml-section'>
        <h3>⚖️ Compare with CODEOWNERS</h3>
        <p>Compare ML predictions with traditional CODEOWNERS file patterns.</p>

        <form onSubmit={handleCompare} className='ml-form'>
          <div className='form-group'>
            <label>Files Changed</label>
            {compareForm.files.map((file, index) => (
              <div key={index} className='file-input-group'>
                <input
                  type='text'
                  placeholder='e.g., src/components/App.js'
                  value={file}
                  onChange={e => updateFileInput('compare', index, e.target.value)}
                />
                {compareForm.files.length > 1 && (
                  <button
                    type='button'
                    onClick={() => removeFileInput('compare', index)}
                    className='remove-file-btn'
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button type='button' onClick={() => addFileInput('compare')} className='add-file-btn'>
              + Add File
            </button>
          </div>

          <div className='form-group'>
            <label>CODEOWNERS Content (Optional)</label>
            <textarea
              placeholder='Paste your CODEOWNERS file content here...'
              value={compareForm.codeownersContent}
              onChange={e =>
                setCompareForm(prev => ({ ...prev, codeownersContent: e.target.value }))
              }
              rows='6'
            />
          </div>

          <div className='form-group'>
            <label>Confidence Threshold</label>
            <input
              type='range'
              min='0.1'
              max='1'
              step='0.1'
              value={compareForm.confidence}
              onChange={e =>
                setCompareForm(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))
              }
            />
            <span className='confidence-value'>{(compareForm.confidence * 100).toFixed(0)}%</span>
          </div>

          <button type='submit' disabled={loading || !isModelTrained} className='ml-button primary'>
            {loading ? '🔄 Comparing...' : '⚖️ Compare'}
          </button>
        </form>

        {!isModelTrained && (
          <div className='warning'>⚠️ Please train the model first before making comparisons.</div>
        )}
      </div>

      {comparison && (
        <div className='ml-results'>
          <h3>⚖️ Comparison Results</h3>

          <div className='comparison-grid'>
            <div className='comparison-section'>
              <h4>🤖 ML Predictions</h4>
              <div className='predictions-list'>
                {comparison.mlPredictions.map((prediction, index) => (
                  <div key={index} className='prediction-item'>
                    <span className='prediction-approver'>@{prediction.approver}</span>
                    <span className='prediction-confidence'>
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
                {comparison.mlPredictions.length === 0 && (
                  <p className='no-results'>No predictions above confidence threshold</p>
                )}
              </div>
            </div>

            <div className='comparison-section'>
              <h4>📋 CODEOWNERS</h4>
              <div className='traditional-owners'>
                {comparison.traditionalOwners.map((owner, index) => (
                  <div key={index} className='owner-item'>
                    <span className='owner-name'>{owner}</span>
                  </div>
                ))}
                {comparison.traditionalOwners.length === 0 && (
                  <p className='no-results'>No CODEOWNERS matches found</p>
                )}
              </div>
            </div>
          </div>

          <div className='comparison-meta'>
            <p>
              Analyzed {comparison.totalFiles} files with {comparison.matchedPatterns.length}{' '}
              pattern matches
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className='ml-codeowners'>
      <div className='ml-header'>
        <h2>🧠 ML CODEOWNERS</h2>
        <p>Machine Learning based code ownership prediction system</p>
      </div>

      <div className='ml-tabs'>
        <button
          className={`ml-tab ${activeTab === 'predict' ? 'active' : ''}`}
          onClick={() => setActiveTab('predict')}
        >
          🔮 Predict
        </button>
        <button
          className={`ml-tab ${activeTab === 'train' ? 'active' : ''}`}
          onClick={() => setActiveTab('train')}
        >
          🎯 Train
        </button>
        <button
          className={`ml-tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          ⚖️ Compare
        </button>
      </div>

      {error && <div className='ml-error'>❌ {error}</div>}

      {activeTab === 'train' && renderTrainingTab()}
      {activeTab === 'predict' && renderPredictTab()}
      {activeTab === 'compare' && renderCompareTab()}
    </div>
  );
}

export default MLCodeowners;
