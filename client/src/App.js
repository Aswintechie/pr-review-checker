/**
 * PR Approval Finder v5.0
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'advanced'
  const [showHistory, setShowHistory] = useState(false);
  const [recentPRs, setRecentPRs] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const themes = [
    { id: 'light', name: '☀️ Light', description: 'Clean and bright' },
    { id: 'dark', name: '🌙 Dark', description: 'Easy on the eyes' },
    { id: 'ocean', name: '🌊 Ocean', description: 'Deep blue vibes' },
    { id: 'forest', name: '🌲 Forest', description: 'Natural green tones' },
    { id: 'sunset', name: '🌅 Sunset', description: 'Warm orange hues' },
    { id: 'midnight', name: '🌌 Midnight', description: 'Deep purple night' },
    { id: 'arctic', name: '❄️ Arctic', description: 'Cool blue-white' },
    { id: 'cherry', name: '🌸 Cherry', description: 'Soft pink accents' },
  ];

  // Load theme preference and recent PRs from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('currentTheme') || 'light';
    setCurrentTheme(savedTheme);
    document.body.className = `theme-${savedTheme}`;

    // Load recent PRs from localStorage
    const savedPRs = localStorage.getItem('recentPRs');
    if (savedPRs) {
      try {
        setRecentPRs(JSON.parse(savedPRs));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse recent PRs from localStorage');
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = event => {
      if (showHistory && !event.target.closest('.history-container')) {
        setShowHistory(false);
      }
      if (showThemeDropdown && !event.target.closest('.theme-container')) {
        setShowThemeDropdown(false);
      }
    };

    if (showHistory || showThemeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHistory, showThemeDropdown]);

  const changeTheme = themeId => {
    setCurrentTheme(themeId);
    localStorage.setItem('currentTheme', themeId);
    document.body.className = `theme-${themeId}`;
    setShowThemeDropdown(false);
  };

  const toggleThemeDropdown = () => {
    setShowThemeDropdown(!showThemeDropdown);
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const addToRecentPRs = prData => {
    const newPR = {
      url: prData.prInfo.url,
      title: prData.prInfo.title,
      number: prData.prInfo.number,
      author: prData.prInfo.author,
      analyzedAt: new Date().toISOString(),
      totalGroups: prData.minRequiredApprovals.length,
      needsApproval: prData.totalGroupsNeedingApproval,
    };

    setRecentPRs(prev => {
      // Remove if already exists (to avoid duplicates)
      const filtered = prev.filter(pr => pr.url !== newPR.url);
      // Add to beginning and keep only last 10
      const updated = [newPR, ...filtered].slice(0, 10);
      localStorage.setItem('recentPRs', JSON.stringify(updated));
      return updated;
    });
  };

  const loadFromHistory = prUrl => {
    setPrUrl(prUrl);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setRecentPRs([]);
    localStorage.removeItem('recentPRs');
    setShowHistory(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRateLimitInfo(null);
    setResult(null);

    try {
      const response = await axios.post('/api/pr-approvers', {
        prUrl,
        githubToken: githubToken || undefined,
      });

      setResult(response.data);
      setRateLimitInfo(response.data.rateLimitInfo || null);
      addToRecentPRs(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
      setRateLimitInfo(err.response?.data?.rateLimitInfo || null);
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
      <div className='progress-ring-container'>
        <svg className='progress-ring' width='120' height='120'>
          <defs>
            <linearGradient id='progressGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#667eea' />
              <stop offset='100%' stopColor='#764ba2' />
            </linearGradient>
          </defs>
          <circle className='progress-ring-bg' cx='60' cy='60' r={radius} strokeWidth='8' />
          <circle
            className='progress-ring-fill'
            cx='60'
            cy='60'
            r={radius}
            strokeWidth='8'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform='rotate(-90 60 60)'
          />
        </svg>
        <div className='progress-ring-text'>
          <div className='progress-percentage'>{percentage}%</div>
          <div className='progress-label'>
            {completed}/{total}
          </div>
        </div>
      </div>
    );
  };

  const renderHistoryDropdown = () => {
    if (!showHistory) return null;

    return (
      <div className='history-dropdown'>
        <div className='history-header'>
          <h3>Recent PRs</h3>
          {recentPRs.length > 0 && (
            <button
              className='clear-history-btn'
              onClick={clearHistory}
              title='Clear history'
              type='button'
              data-1p-ignore
              autoComplete='off'
            >
              🗑️
            </button>
          )}
        </div>
        <div className='history-content'>
          {recentPRs.length === 0 ? (
            <div className='no-history'>
              <span className='no-history-icon'>📋</span>
              <p>No recent PRs analyzed</p>
            </div>
          ) : (
            <div className='history-list'>
              {recentPRs.map((pr, index) => (
                <div key={index} className='history-item' onClick={() => loadFromHistory(pr.url)}>
                  <div className='history-item-main'>
                    <div className='history-title'>{pr.title}</div>
                    <div className='history-meta'>
                      <span className='history-number'>#{pr.number}</span>
                      <span className='history-author'>by @{pr.author}</span>
                    </div>
                  </div>
                  <div className='history-status'>
                    {pr.needsApproval === 0 ? (
                      <span className='history-badge approved'>✅ Ready</span>
                    ) : (
                      <span className='history-badge pending'>{pr.needsApproval} needed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSkeletonLoader = () => {
    return (
      <div className='skeleton-container'>
        {/* View Toggle Skeleton */}
        <div className='skeleton-view-toggle'>
          <div className='skeleton-toggle-btn'></div>
          <div className='skeleton-toggle-btn'></div>
        </div>

        {/* Progress Section Skeleton */}
        <div className='skeleton-progress-section'>
          <div className='skeleton-progress-overview'>
            <div className='skeleton-progress-ring'></div>
            <div className='skeleton-progress-info'>
              <div className='skeleton-title'></div>
              <div className='skeleton-stats'>
                <div className='skeleton-stat'>
                  <div className='skeleton-stat-number'></div>
                  <div className='skeleton-stat-label'></div>
                </div>
                <div className='skeleton-stat'>
                  <div className='skeleton-stat-number'></div>
                  <div className='skeleton-stat-label'></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Groups Skeleton */}
        <div className='skeleton-approval-section'>
          <div className='skeleton-section-title'></div>
          {[1, 2, 3].map(i => (
            <div key={i} className='skeleton-approval-group'>
              <div className='skeleton-group-header'>
                <div className='skeleton-group-title'></div>
                <div className='skeleton-approved-by'></div>
              </div>
              <div className='skeleton-group-content'>
                <div className='skeleton-group-text'></div>
                <div className='skeleton-users-grid'>
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className='skeleton-user-card'>
                      <div className='skeleton-user-avatar'></div>
                      <div className='skeleton-user-info'>
                        <div className='skeleton-user-name'></div>
                        <div className='skeleton-user-username'></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reviewers Section Skeleton */}
        <div className='skeleton-reviewers-section'>
          <div className='skeleton-section-title'></div>
          <div className='skeleton-users-grid'>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className='skeleton-user-card'>
                <div className='skeleton-user-avatar'></div>
                <div className='skeleton-user-info'>
                  <div className='skeleton-user-name'></div>
                  <div className='skeleton-user-username'></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const [expandedTeams, setExpandedTeams] = useState(new Set());

  const toggleTeamExpansion = teamKey => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamKey)) {
        newSet.delete(teamKey);
      } else {
        newSet.add(teamKey);
      }
      return newSet;
    });
  };

  const renderTeamCard = (team, isApproved = false) => {
    const teamKey = team.slug || team.username;
    const isExpanded = expandedTeams.has(teamKey);
    const memberCount = team.members ? team.members.length : team.memberCount || 0;

    return (
      <div
        key={teamKey}
        className={`user-card team-card ${isApproved ? 'approved' : ''} ${isExpanded ? 'expanded' : ''}`}
      >
        <div
          className='team-header'
          onClick={() => toggleTeamExpansion(teamKey)}
          role='button'
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleTeamExpansion(teamKey);
            }
          }}
        >
          <div className='user-avatar team-avatar'>👥</div>
          <div className='user-info'>
            <div className='user-name'>{team.name}</div>
            <div className='user-username'>
              @{team.username || team.slug}
              {memberCount > 0 && (
                <span className='member-count'>
                  {' '}
                  • {memberCount} member{memberCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {team.description && <div className='team-description'>{team.description}</div>}
          </div>
          <div className='team-expand-indicator'>{isExpanded ? '▼' : '▶'}</div>
          {isApproved && <div className='approval-badge'>✅</div>}
        </div>

        {isExpanded && team.members && team.members.length > 0 && (
          <div className='team-members'>
            <div className='team-members-title'>Team Members:</div>
            <div className='team-members-grid'>
              {team.members.map(member => (
                <div key={member.username} className='team-member'>
                  <div className='member-avatar'>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.username} />
                    ) : (
                      <div className='avatar-placeholder'>👤</div>
                    )}
                  </div>
                  <div className='member-info'>
                    <div className='member-name'>{member.name}</div>
                    <div className='member-username'>@{member.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpanded && (!team.members || team.members.length === 0) && (
          <div className='team-members'>
            <div className='team-members-empty'>
              {result?.teamsConfigured
                ? 'No members found or insufficient permissions to view team members.'
                : 'Team member details unavailable. Configure GITHUB_TEAMS_TOKEN to view team members.'}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUserCard = (user, isApproved = false) => {
    if (user.type === 'team') {
      return renderTeamCard(user, isApproved);
    }

    return (
      <div key={user.username} className={`user-card ${isApproved ? 'approved' : ''}`}>
        <div className='user-avatar'>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} />
          ) : (
            <div className='avatar-placeholder'>👤</div>
          )}
        </div>
        <div className='user-info'>
          <div className='user-name'>{user.name}</div>
          <div className='user-username'>@{user.username}</div>
        </div>
        {isApproved && <div className='approval-badge'>✅</div>}
      </div>
    );
  };

  const renderThemeDropdown = () => {
    if (!showThemeDropdown) return null;

    return (
      <div className='theme-dropdown'>
        <div className='theme-header'>
          <h3>🎨 Choose Theme</h3>
        </div>
        <div className='theme-content'>
          <div className='theme-grid'>
            {themes.map(theme => (
              <div
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => changeTheme(theme.id)}
              >
                <div className={`theme-preview theme-${theme.id}`}></div>
                <div className='theme-info'>
                  <div className='theme-name'>{theme.name}</div>
                  <div className='theme-description'>{theme.description}</div>
                </div>
                {currentTheme === theme.id && <div className='theme-check'>✓</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`App theme-${currentTheme}`}>
      <header className='App-header'>
        <div className='header-content'>
          <div>
            <h1>🔍 PR Approval Finder v5.0</h1>
            <p>Find minimum required approvals for your Pull Request</p>
          </div>
          <div className='header-controls'>
            <div className='history-container'>
              <button
                className='history-btn'
                onClick={toggleHistory}
                title='Recent PRs'
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                📋
                {recentPRs.length > 0 && <span className='history-count'>{recentPRs.length}</span>}
              </button>
              {renderHistoryDropdown()}
            </div>
            <div className='theme-container'>
              <button
                className='theme-toggle'
                onClick={toggleThemeDropdown}
                title='Choose theme'
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                🎨
              </button>
              {renderThemeDropdown()}
            </div>
          </div>
        </div>
      </header>

      <main className='main-content'>
        <form onSubmit={handleSubmit} className='pr-form'>
          <div className='form-group'>
            <label htmlFor='prUrl'>GitHub PR URL:</label>
            <input
              type='url'
              id='prUrl'
              value={prUrl}
              onChange={e => setPrUrl(e.target.value)}
              placeholder='https://github.com/owner/repo/pull/123'
              required
            />
          </div>

          <div className='form-group'>
            <label htmlFor='githubToken'>
              GitHub Token (optional - for private repos & higher rate limits):
            </label>
            <input
              type='password'
              id='githubToken'
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder='ghp_xxxxxxxxxxxxxxxxxxxx'
            />
          </div>

          <button type='submit' disabled={loading} className='analyze-btn'>
            {loading ? (
              <>
                <span className='spinner'></span>
                Analyzing...
              </>
            ) : (
              <>
                <span className='btn-icon'>🚀</span>
                Analyze PR
              </>
            )}
          </button>
        </form>

        {error && (
          <div className='error-message'>
            <div className='error-content'>
              <span className='error-icon'>⚠️</span>
              <div className='error-text'>
                <strong>Error:</strong> {error}
              </div>
            </div>
            {rateLimitInfo && (
              <div className='rate-limit-info'>
                <div className='rate-limit-header'>
                  <span className='rate-limit-icon'>⏱️</span>
                  <strong>Rate Limit Details:</strong>
                </div>
                <div className='rate-limit-details'>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Remaining:</span>
                    <span className='rate-limit-value'>
                      {rateLimitInfo.remaining}/{rateLimitInfo.limit}
                    </span>
                  </div>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Resets in:</span>
                    <span className='rate-limit-value'>
                      {rateLimitInfo.minutesUntilReset} minute
                      {rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className='rate-limit-item'>
                    <span className='rate-limit-label'>Reset time:</span>
                    <span className='rate-limit-value'>{rateLimitInfo.resetTimeFormatted}</span>
                  </div>
                </div>
                <div className='rate-limit-tip'>
                  💡 <strong>Tip:</strong> Add a GitHub token above for 5,000 requests/hour instead
                  of 60/hour
                </div>
              </div>
            )}
          </div>
        )}

        {loading && renderSkeletonLoader()}

        {result && !loading && (
          <div className='results'>
            {/* PR Title Section */}
            <div className='pr-title-section'>
              <div className='pr-title-container'>
                <div className='pr-title-main'>
                  <h2 className='pr-title'>{result.prInfo.title}</h2>
                  <div className='pr-meta'>
                    <span className='pr-number'>#{result.prInfo.number}</span>
                    <span className='pr-author'>by @{result.prInfo.author}</span>
                    <span className='pr-state' data-state={result.prInfo.state.toLowerCase()}>
                      {result.prInfo.state}
                    </span>
                  </div>
                </div>
                <a
                  href={result.prInfo.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='pr-link-btn'
                  title='Open PR in GitHub'
                >
                  🔗 View PR
                </a>
              </div>
            </div>

            {/* Rate Limit Warning for successful requests */}
            {rateLimitInfo && rateLimitInfo.remaining <= (githubToken ? 100 : 20) && (
              <div className='rate-limit-warning-standalone'>
                <div className='rate-limit-warning'>
                  ⚠️ <strong>Low Rate Limit Warning:</strong> You have {rateLimitInfo.remaining}{' '}
                  requests remaining.
                  {githubToken
                    ? `Wait ${rateLimitInfo.minutesUntilReset} minute${rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''} for reset or consider using a fresh token.`
                    : `Consider using a GitHub token for higher limits or wait ${rateLimitInfo.minutesUntilReset} minute${rateLimitInfo.minutesUntilReset !== 1 ? 's' : ''} for reset.`}
                </div>
              </div>
            )}

            {/* View Toggle */}
            <div className='view-toggle'>
              <button
                className={`toggle-btn ${viewMode === 'basic' ? 'active' : ''}`}
                onClick={() => setViewMode('basic')}
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                📊 Basic View
              </button>
              <button
                className={`toggle-btn ${viewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setViewMode('advanced')}
                type='button'
                data-1p-ignore
                autoComplete='off'
              >
                🔬 Advanced View
              </button>
            </div>

            {/* Progress Overview */}
            <section className='progress-section'>
              <div className='progress-overview'>
                {renderProgressRing()}
                <div className='progress-info'>
                  <h2>Approval Progress</h2>
                  <div className='progress-stats'>
                    <div className='stat'>
                      <span className='stat-number'>{result.totalGroupsNeedingApproval}</span>
                      <span className='stat-label'>
                        more approval{result.totalGroupsNeedingApproval !== 1 ? 's' : ''} needed
                      </span>
                    </div>
                    <div className='stat'>
                      <span className='stat-number'>{calculateProgress().completed}</span>
                      <span className='stat-label'>
                        group{calculateProgress().completed !== 1 ? 's' : ''} satisfied
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Basic View */}
            {viewMode === 'basic' && (
              <>
                {/* Minimum Required Approvals */}
                <section className='approval-section'>
                  <h2>🎯 Required Approvals</h2>

                  {result.minRequiredApprovals.map((group, index) => (
                    <div
                      key={index}
                      className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}
                    >
                      <div className='group-header'>
                        <h3>
                          {group.needsApproval ? '❌' : '✅'}
                          Group {index + 1} ({group.files.length} file
                          {group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className='approved-by'>Approved by @{group.approvedBy}</span>
                        )}
                      </div>

                      <div className='group-options'>
                        <p>
                          <strong>Need approval from ANY ONE of:</strong>
                        </p>
                        <div className='users-grid'>
                          {group.ownerDetails.map(user => {
                            const isApproved =
                              !group.needsApproval && user.username === group.approvedBy;
                            return renderUserCard(user, isApproved);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* All Reviewers */}
                <section className='reviewers-section'>
                  <h2>👥 All Possible Reviewers</h2>
                  <div className='users-grid'>
                    {result.allUserDetails.map(user => {
                      const isApproved = result.approvals.includes(user.username);
                      const isRequested = result.requestedReviewers.includes(user.username);
                      return (
                        <div
                          key={user.username}
                          className={`user-card ${isApproved ? 'approved' : ''} ${isRequested ? 'requested' : ''}`}
                        >
                          <div className='user-avatar'>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.username} />
                            ) : user.type === 'team' ? (
                              <div className='team-avatar'>👥</div>
                            ) : (
                              <div className='avatar-placeholder'>👤</div>
                            )}
                          </div>
                          <div className='user-info'>
                            <div className='user-name'>{user.name}</div>
                            <div className='user-username'>@{user.username}</div>
                            {isRequested && <div className='user-status'>Requested</div>}
                          </div>
                          {isApproved && <div className='approval-badge'>✅</div>}
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
                <section className='approval-section'>
                  <h2>🎯 Required Approvals</h2>

                  {result.minRequiredApprovals.map((group, index) => (
                    <div
                      key={index}
                      className={`approval-group ${group.needsApproval ? 'needs-approval' : 'approved'}`}
                    >
                      <div className='group-header'>
                        <h3>
                          {group.needsApproval ? '❌' : '✅'}
                          Group {index + 1} ({group.files.length} file
                          {group.files.length !== 1 ? 's' : ''})
                        </h3>
                        {!group.needsApproval && (
                          <span className='approved-by'>Approved by @{group.approvedBy}</span>
                        )}
                      </div>

                      <div className='group-files'>
                        <details>
                          <summary>📁 View files ({group.files.length})</summary>
                          <ul className='file-list'>
                            {group.files.map((file, fileIndex) => (
                              <li key={fileIndex} className='file-item'>
                                <span className='file-path'>{file}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>

                      <div className='group-options'>
                        <p>
                          <strong>Need approval from ANY ONE of:</strong>
                        </p>
                        <div className='users-grid'>
                          {group.ownerDetails.map(user => {
                            const isApproved =
                              !group.needsApproval && user.username === group.approvedBy;
                            return renderUserCard(user, isApproved);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                {/* File-by-file Analysis */}
                <section className='file-analysis-section'>
                  <h2>📄 File-by-File Analysis</h2>
                  <div className='file-analysis'>
                    {result.fileApprovalDetails.map((detail, index) => (
                      <div key={index} className='file-detail'>
                        <div className='file-path-container'>
                          <span className='file-directory'>
                            {detail.file.split('/').slice(0, -1).join('/')}/
                          </span>
                          <span className='file-name'>{detail.file.split('/').pop()}</span>
                        </div>
                        <div className='file-pattern'>
                          <strong>Pattern:</strong> {detail.pattern}
                        </div>
                        <div className='file-owners'>
                          <strong>Owners:</strong> {detail.owners.join(', ') || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Current Status */}
                <section className='status-section'>
                  <h2>📊 Current Status</h2>
                  <div className='status-grid'>
                    <div className='status-item'>
                      <h3>✅ Current Approvals</h3>
                      <div className='status-list'>
                        {result.approvals.length > 0 ? (
                          result.approvals.map(approval => (
                            <span key={approval} className='status-badge approved'>
                              @{approval}
                            </span>
                          ))
                        ) : (
                          <span className='no-items'>No approvals yet</span>
                        )}
                      </div>
                    </div>

                    <div className='status-item'>
                      <h3>👀 Requested Reviewers</h3>
                      <div className='status-list'>
                        {result.requestedReviewers.length > 0 ? (
                          result.requestedReviewers.map(reviewer => (
                            <span key={reviewer} className='status-badge requested'>
                              @{reviewer}
                            </span>
                          ))
                        ) : (
                          <span className='no-items'>No reviewers requested</span>
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
      <footer className='app-footer'>
        <div className='footer-content'>
          <div className='footer-left'>
            <div className='copyright' title='Assisted with Cursor AI'>
              © 2025 Aswin
            </div>
          </div>
          <div className='footer-right'>
            <div className='cloudflare-badge' title='Secured and accelerated by Cloudflare'>
              🛡️ Protected by Cloudflare
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
