import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'

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
    <div className="App">
      <header className="App-header">
        <h1>🔍 PR Approval Finder v2.0</h1>
        <p>Find minimum required approvals for your Pull Request</p>
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

          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze PR'}
          </button>
        </form>

        {error && (
          <div className="error-message">
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

            {/* Basic View */}
            {viewMode === 'basic' && (
              <>
                {/* Minimum Required Approvals */}
                <section className="approval-section">
                  <h2>🎯 Minimum Required Approvals</h2>
                  <div className="approval-summary">
                    <div className="approval-count">
                      <span className="count-number">{result.totalGroupsNeedingApproval}</span>
                      <span className="count-label">more approval{result.totalGroupsNeedingApproval !== 1 ? 's' : ''} needed</span>
                    </div>
                  </div>
                  
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
                          {group.ownerDetails.map(user => renderUserCard(user, !group.needsApproval && user.username === group.approvedBy))}
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
                      return renderUserCard(user, isApproved);
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
                  <h2>🎯 Minimum Required Approvals</h2>
                  <div className="approval-summary">
                    <div className="approval-count">
                      <span className="count-number">{result.totalGroupsNeedingApproval}</span>
                      <span className="count-label">more approval{result.totalGroupsNeedingApproval !== 1 ? 's' : ''} needed</span>
                    </div>
                  </div>
                  
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
                          {group.ownerDetails.map(user => renderUserCard(user, !group.needsApproval && user.username === group.approvedBy))}
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
    </div>
  );
}

export default App; 