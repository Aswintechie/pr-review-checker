import React, { useState } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/api/pr-approvers', {
        prUrl,
        githubToken
      });
      setResult(response.data);
    } catch (err) {
      console.error('Frontend error:', err);
      const errorMessage = err.response?.data?.error || 'An error occurred while fetching PR information';
      const errorDetails = err.response?.data?.details || '';
      const debugInfo = err.response?.data?.debug || null;
      
      console.error('Error details:', { errorMessage, errorDetails, debugInfo });
      
      setError(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const renderApprovalStatus = () => {
    if (!result) return null;

    const { isReadyToMerge, requiredApprovers, currentApprovals } = result;

    return (
      <div className="info-section">
        <h3>Approval Status</h3>
        <div className={`status-indicator ${isReadyToMerge ? 'ready' : 'pending'}`}>
          <span>{isReadyToMerge ? '✅' : '⏳'}</span>
          {isReadyToMerge ? 'Ready to Merge' : 'Waiting for Approvals'}
        </div>
        
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666' }}>Required Approvers ({requiredApprovers.length})</h4>
          {requiredApprovers.map(approver => (
            <div key={approver} className={`approval-item ${currentApprovals.includes(approver) ? 'approved' : 'pending'}`}>
              <span>@{approver}</span>
              <span className={`badge ${currentApprovals.includes(approver) ? 'success' : 'warning'}`}>
                {currentApprovals.includes(approver) ? 'Approved' : 'Pending'}
              </span>
            </div>
          ))}
          
          {requiredApprovers.length === 0 && (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No CODEOWNERS rules found for changed files</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <h1>PR Approval Finder</h1>
        <p>Find minimum persons approval required for PR merging</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="prUrl">GitHub PR URL</label>
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
            <label htmlFor="githubToken">GitHub Token (Optional)</label>
            <input
              type="password"
              id="githubToken"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx (for private repos or higher rate limits)"
            />
            <small style={{ color: '#666', fontSize: '0.875rem' }}>
              Optional for public repos, required for private repos. Increases rate limits. Generate at: 
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', marginLeft: '0.25rem' }}>
                GitHub Settings
              </a>
            </small>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Analyzing PR...' : 'Find Required Approvers'}
          </button>
        </form>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <>
          <div className="pr-header">
            <h2>
              <a href={result.prInfo.url} target="_blank" rel="noopener noreferrer">
                #{result.prInfo.number}: {result.prInfo.title}
              </a>
            </h2>
            <p>by @{result.prInfo.author} • Status: {result.prInfo.state}</p>
          </div>

          <div className="pr-info">
            {/* Minimum Required Approvals - Most Important */}
            {result.minRequiredApprovals && result.minRequiredApprovals.length > 0 && (
              <div className="info-section" style={{ border: '2px solid #667eea', background: '#f8fafc' }}>
                <h3 style={{ color: '#667eea' }}>
                  🎯 Minimum Required Approvals 
                  <span style={{ fontSize: '1rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                    ({result.minApprovalsNeeded} more needed)
                  </span>
                </h3>
                {result.minRequiredApprovals.map((group, index) => (
                  <div key={index} style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: group.needsApproval ? '#fef3c7' : '#dcfce7',
                    borderRadius: '6px',
                    border: `1px solid ${group.needsApproval ? '#f59e0b' : '#16a34a'}`
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      {group.needsApproval ? '❌' : '✅'} Group {index + 1}: {group.files.length} files
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                      <strong>Files ({group.files.length}):</strong>
                      <div style={{ marginTop: '0.25rem', maxHeight: '80px', overflowY: 'auto' }}>
                        {group.files.slice(0, 3).map((file, idx) => {
                          // Extract just the filename for display
                          const fileName = file.split('/').pop();
                          const directory = file.substring(0, file.lastIndexOf('/') + 1);
                          
                          return (
                            <div key={idx} style={{ 
                              marginBottom: '0.15rem',
                              wordBreak: 'break-all',
                              fontSize: '0.75rem',
                              lineHeight: '1.2'
                            }}>
                              <span style={{ color: '#9ca3af' }}>{directory}</span>
                              <span style={{ fontWeight: '600', color: '#374151' }}>{fileName}</span>
                            </div>
                          );
                        })}
                        {group.files.length > 3 && (
                          <div style={{ 
                            fontSize: '0.7rem', 
                            fontStyle: 'italic', 
                            color: '#9ca3af',
                            marginTop: '0.25rem'
                          }}>
                            ... and {group.files.length - 3} more files
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <strong>Need approval from ANY ONE of:</strong>
                      <div style={{ marginTop: '0.5rem' }}>
                        {group.owners.map(owner => {
                          const userInfo = result.userDetails?.[owner];
                          
                          return (
                            <div 
                              key={owner}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                                padding: '0.5rem',
                                background: group.approvedBy === owner ? '#dcfce7' : '#f8fafc',
                                borderRadius: '6px',
                                border: `1px solid ${group.approvedBy === owner ? '#16a34a' : '#e2e8f0'}`
                              }}
                            >
                              {userInfo?.avatar_url && userInfo.type === 'user' && (
                                <img 
                                  src={userInfo.avatar_url} 
                                  alt={owner}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    marginRight: '0.5rem'
                                  }}
                                />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                  {userInfo?.name && userInfo.name !== owner ? userInfo.name : owner}
                                </div>
                                {userInfo?.name && userInfo.name !== owner && (
                                  <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                    @{owner}
                                  </div>
                                )}
                              </div>
                              {group.approvedBy === owner && (
                                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ Approved</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {renderApprovalStatus()}

            <div className="info-section">
              <h3>Current Approvals ({result.currentApprovals.length})</h3>
              {result.currentApprovals.length > 0 ? (
                result.currentApprovals.map(approver => (
                  <div key={approver} className="approval-item approved">
                    <span>@{approver}</span>
                    <span className="badge success">Approved</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No approvals yet</p>
              )}
            </div>

            <div className="info-section">
              <h3>Still Need Approval ({result.stillNeedApproval.length})</h3>
              {result.stillNeedApproval.length > 0 ? (
                result.stillNeedApproval.map(approver => (
                  <div key={approver} className="approval-item pending">
                    <span>@{approver}</span>
                    <span className="badge warning">Required</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#16a34a', fontWeight: '600' }}>All required approvals received! ✅</p>
              )}
            </div>

            <div className="info-section">
              <h3>File-by-File Analysis ({result.changedFiles.length} files)</h3>
              {result.fileApprovalDetails && result.fileApprovalDetails.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {result.fileApprovalDetails.slice(0, 15).map((detail, index) => (
                    <div key={index} style={{ 
                      marginBottom: '1rem', 
                      padding: '0.75rem', 
                      background: '#f8fafc', 
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>
                        📄 {detail.file}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Pattern: <code>{detail.pattern}</code>
                      </div>
                      <div style={{ marginTop: '0.5rem' }}>
                        {detail.owners && detail.owners.length > 0 ? (
                          detail.owners.map(owner => (
                            <span key={owner} className="badge" style={{ marginRight: '0.25rem' }}>
                              @{owner}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            No owners required
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {result.fileApprovalDetails.length > 15 && (
                    <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                      ... and {result.fileApprovalDetails.length - 15} more files
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  No CODEOWNERS analysis available
                </div>
              )}
            </div>

            {result.requestedReviewers.length > 0 && (
              <div className="info-section">
                <h3>Requested Reviewers</h3>
                {result.requestedReviewers.map(reviewer => (
                  <span key={reviewer} className="badge">@{reviewer}</span>
                ))}
              </div>
            )}

            {result.requestedTeams.length > 0 && (
              <div className="info-section">
                <h3>Requested Teams</h3>
                {result.requestedTeams.map(team => (
                  <span key={team} className="badge">@{team}</span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App; 