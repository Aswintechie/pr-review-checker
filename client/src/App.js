/**
 * PR Approval Finder v3.0
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.body.classList.toggle('dark-mode', savedDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    document.body.classList.toggle('dark-mode', newDarkMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/api/pr-approvers', {
        prUrl,
        githubToken: githubToken || undefined
      });

      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!result?.minRequiredApprovals) return { completed: 0, total: 0, percentage: 0 };
    
    const total = result.minRequiredApprovals.length;
    const completed = result.minRequiredApprovals.filter(group => !group.needsApproval).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const renderProgressRing = () => {
    const { completed, total, percentage } = calculateProgress();
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="progress-ring-container">
        <svg className="progress-ring" width="120" height="120">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#667eea" />
              <stop offset="100%" stopColor="#764ba2" />
            </linearGradient>
          </defs>
          <circle
            className="progress-ring-bg"
            cx="60"
            cy="60"
            r={radius}
            strokeWidth="8"
          />
          <circle
            className="progress-ring-fill"
            cx="60"
            cy="60"
            r={radius}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="progress-ring-text">
          <div className="progress-percentage">{percentage}%</div>
          <div className="progress-label">{completed}/{total}</div>
        </div>
      </div>
    );
  };

  const renderUserCard = (user, isApproved = false) => {
    if (user.type === 'team') {
      return (
        <div key={user.username} className={`user-card team-card ${isApproved ? 'approved' : ''}`}>
          <div className="user-avatar team-avatar">👥</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-username">@{user.username}</div>
          </div>
          {isApproved && <div className="approval-badge">✅</div>}
        </div>
      );
    }

    return (
      <div key={user.username} className={`user-card ${isApproved ? 'approved' : ''}`}>
        <div className="user-avatar">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} />
          ) : (
            <div className="avatar-placeholder">👤</div>
          )}
        </div>
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-username">@{user.username}</div>
        </div>
        {isApproved && <div className="approval-badge">✅</div>}
      </div>
    );
  };

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      <header className="App-header">
        <div className="header-content">
          <div>
            <h1>🔍 PR Approval Finder v3.0</h1>
            <p>Find minimum required approvals for your Pull Request</p>
          </div>
          <button className="theme-toggle" onClick={toggleDarkMode} title="Toggle theme">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="main-content">
        <form onSubmit={handleSubmit} className="pr-form">
          <div className="form-group">
            <label htmlFor="prUrl">GitHub PR URL:</label>
            <input
              type="url"
              id="prUrl"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="githubToken">
              GitHub Token (optional - for private repos & higher rate limits):
            </label>
            <input
              type="password"
              id="githubToken"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <button type="submit" disabled={loading} className="analyze-btn">
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className="btn-icon">🚀</span>
                Analyze PR
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="results">
            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'basic' ? 'active' : ''}`}
                onClick={() => setViewMode('basic')}
              >
                📊 Basic View
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setViewMode('advanced')}
              >
                🔬 Advanced View
              </button>
            </div>

            {/* Progress Overview */}
            <section className="progress-section">
              <div className="progress-overview">
                {renderProgressRing()}
                <div className="progress-info">
                  <h2>Approval Progress</h2>
                  <div className="progress-stats">
                    <div className="stat">
                      <span className="stat-number">{result.totalGroupsNeedingApproval}</span>
                      <span className="stat-label">more approval{result.totalGroupsNeedingApproval !== 1 ? 's' : ''} needed</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{calculateProgress().completed}</span>
                      <span className="stat-label">group{calculateProgress().completed !== 1 ? 's' : ''} satisfied</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Basic View */}
            {viewMode === 'basic' && (
              <>
                {/* Minimum Required Approvals */}
                <section className="approval-section">
                  <h2>🎯 Required Approvals</h2>
                  
                  {result.minRequiredApprovals.map((group, index) => (
                    <div key={index} className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}>
                      <div className="group-header">
                        <h3>
                          {group.needsApproval ? '❌' : '✅'} 
                          Group {index + 1} ({group.files.length} file{group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className="approved-by">Approved by @{group.approvedBy}</span>
                        )}
                      </div>
                      
                      <div className="group-options">
                        <p><strong>Need approval from ANY ONE of:</strong></p>
                        <div className="users-grid">
                          {group.ownerDetails.map(user => {
                            const isApproved = !group.needsApproval && user.username === group.approvedBy;
                            return renderUserCard(user, isApproved);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* All Reviewers */}
                <section className="reviewers-section">
                  <h2>👥 All Possible Reviewers</h2>
                  <div className="users-grid">
                    {result.allUserDetails.map(user => {
                      const isApproved = result.approvals.includes(user.username);
                      const isRequested = result.requestedReviewers.includes(user.username);
                      return (
                        <div key={user.username} className={`user-card ${isApproved ? 'approved' : ''} ${isRequested ? 'requested' : ''}`}>
                          <div className="user-avatar">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} />
                            ) : user.type === 'team' ? (
                              <div className="team-avatar">👥</div>
                            ) : (
                              <div className="avatar-placeholder">👤</div>
                            )}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-username">@{user.username}</div>
                            {isRequested && <div className="user-status">Requested</div>}
                          </div>
                          {isApproved && <div className="approval-badge">✅</div>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {/* Advanced View */}
            {viewMode === 'advanced' && (
              <>
                {/* Minimum Required Approvals */}
                <section className="approval-section">
                  <h2>🎯 Required Approvals</h2>
                  
                  {result.minRequiredApprovals.map((group, index) => (
                    <div key={index} className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}>
                      <div className="group-header">
                        <h3>
                          {group.needsApproval ? '❌' : '✅'} 
                          Group {index + 1} ({group.files.length} file{group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className="approved-by">Approved by @{group.approvedBy}</span>
                        )}
                      </div>
                      
                      <div className="group-files">
                        <details>
                          <summary>📁 View files ({group.files.length})</summary>
                          <ul className="file-list">
                            {group.files.map((file, fileIndex) => (
                              <li key={fileIndex} className="file-item">
                                <span className="file-path">{file}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                      
                      <div className="group-options">
                        <p><strong>Need approval from ANY ONE of:</strong></p>
                        <div className="users-grid">
                          {group.ownerDetails.map(user => {
                            const isApproved = !group.needsApproval && user.username === group.approvedBy;
                            return renderUserCard(user, isApproved);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* File-by-file Analysis */}
                <section className="file-analysis-section">
                  <h2>📄 File-by-File Analysis</h2>
                  <div className="file-analysis">
                    {result.fileApprovalDetails.map((detail, index) => (
                      <div key={index} className="file-detail">
                        <div className="file-path-container">
                          <span className="file-directory">{detail.file.split('/').slice(0, -1).join('/')}/</span>
                          <span className="file-name">{detail.file.split('/').pop()}</span>
                        </div>
                        <div className="file-pattern">
                          <strong>Pattern:</strong> {detail.pattern}
                        </div>
                        <div className="file-owners">
                          <strong>Owners:</strong> {detail.owners.join(', ') || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Current Status */}
                <section className="status-section">
                  <h2>📊 Current Status</h2>
                  <div className="status-grid">
                    <div className="status-item">
                      <h3>✅ Current Approvals</h3>
                      <div className="status-list">
                        {result.approvals.length > 0 ? (
                          result.approvals.map(approval => (
                            <span key={approval} className="status-badge approved">@{approval}</span>
                          ))
                        ) : (
                          <span className="no-items">No approvals yet</span>
                        )}
                      </div>
                    </div>

                    <div className="status-item">
                      <h3>👀 Requested Reviewers</h3>
                      <div className="status-list">
                        {result.requestedReviewers.length > 0 ? (
                          result.requestedReviewers.map(reviewer => (
                            <span key={reviewer} className="status-badge requested">@{reviewer}</span>
                          ))
                        ) : (
                          <span className="no-items">No reviewers requested</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>

      {/* Copyright Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="copyright" title="Assisted with Cursor AI">
            © 2025 <span className="author-name">Aswin</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 