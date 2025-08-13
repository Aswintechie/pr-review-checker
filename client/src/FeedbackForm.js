/**
 * PR Approval Finder v5.0 - Feedback Form
 * Copyright (c) 2025 Aswin
 * Licensed under MIT License
 */

import React, { useState } from 'react';
import axios from 'axios';

const FeedbackForm = ({ onClose, prefillData = {} }) => {
  const [formData, setFormData] = useState({
    name: prefillData.name || '',
    email: prefillData.email || '',
    type: prefillData.type || 'feedback',
    subject: prefillData.subject || '',
    message: prefillData.message || '',
    rating: prefillData.rating || 5,
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const feedbackTypes = [
    { value: 'feedback', label: '💭 General Feedback', icon: '💭' },
    { value: 'bug', label: '🐛 Bug Report', icon: '🐛' },
    { value: 'feature', label: '✨ Feature Request', icon: '✨' },
    { value: 'improvement', label: '🚀 Improvement Suggestion', icon: '🚀' },
    { value: 'question', label: '❓ Question/Help', icon: '❓' },
  ];

  const ratings = [
    { value: 5, label: 'Excellent', emoji: '🤩' },
    { value: 4, label: 'Good', emoji: '😊' },
    { value: 3, label: 'Average', emoji: '😐' },
    { value: 2, label: 'Poor', emoji: '😕' },
    { value: 1, label: 'Terrible', emoji: '😤' },
  ];

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/feedback', formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className='feedback-overlay'>
        <div className='feedback-modal'>
          <div className='feedback-success'>
            <div className='success-icon'>🎉</div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted successfully.</p>
            <p>We appreciate your input and will review it carefully.</p>
            <button className='btn-primary' onClick={onClose} type='button'>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='feedback-overlay'>
      <div className='feedback-modal'>
        <div className='feedback-header'>
          <h2>📝 Share Your Feedback</h2>
          <p>Help us improve PR Approval Finder</p>
          <div className='contact-options'>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '8px 0' }}>
              💡 You can also email us directly at{' '}
              <a
                href='mailto:contact@aswincloud.com'
                style={{ color: 'var(--accent-color)', textDecoration: 'none' }}
              >
                contact@aswincloud.com
              </a>
            </p>
          </div>
          <button className='close-btn' onClick={onClose} type='button' aria-label='Close'>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className='feedback-form'>
          <div className='form-row'>
            <div className='form-group'>
              <label htmlFor='name'>Name (Optional)</label>
              <input
                type='text'
                id='name'
                name='name'
                value={formData.name}
                onChange={handleInputChange}
                placeholder='Your name'
              />
            </div>
            <div className='form-group'>
              <label htmlFor='email'>Email (Optional)</label>
              <input
                type='email'
                id='email'
                name='email'
                value={formData.email}
                onChange={handleInputChange}
                placeholder='your.email@example.com'
              />
            </div>
          </div>

          <div className='form-group'>
            <label htmlFor='type'>Feedback Type</label>
            <div className='feedback-types'>
              {feedbackTypes.map(type => (
                <label key={type.value} className='feedback-type-option'>
                  <input
                    type='radio'
                    name='type'
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={handleInputChange}
                  />
                  <span className='feedback-type-label'>
                    <span className='feedback-type-icon'>{type.icon}</span>
                    {type.label.replace(/^.+?\s/, '')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className='form-group'>
            <label htmlFor='rating'>Overall Rating</label>
            <div className='rating-container'>
              {ratings.map(rating => (
                <label key={rating.value} className='rating-option'>
                  <input
                    type='radio'
                    name='rating'
                    value={rating.value}
                    checked={formData.rating === rating.value}
                    onChange={handleInputChange}
                  />
                  <span className='rating-label'>
                    <span className='rating-emoji'>{rating.emoji}</span>
                    <span className='rating-text'>{rating.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className='form-group'>
            <label htmlFor='subject'>Subject</label>
            <input
              type='text'
              id='subject'
              name='subject'
              value={formData.subject}
              onChange={handleInputChange}
              placeholder='Brief summary of your feedback'
              required
            />
          </div>

          <div className='form-group'>
            <label htmlFor='message'>Message</label>
            <textarea
              id='message'
              name='message'
              value={formData.message}
              onChange={handleInputChange}
              placeholder='Share your thoughts, suggestions, or report an issue...'
              rows='6'
              required
            />
            <div className='character-count'>{formData.message.length}/2000</div>
          </div>

          {error && (
            <div className='error-message'>
              <div className='error-content'>
                <span className='error-icon'>⚠️</span>
                <span className='error-text'>{error}</span>
              </div>
            </div>
          )}

          <div className='form-actions'>
            <button type='button' className='btn-secondary' onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type='submit'
              className='btn-primary'
              disabled={loading || !formData.subject.trim() || !formData.message.trim()}
            >
              {loading && <span className='spinner' />}
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
