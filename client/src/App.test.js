import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock axios to prevent actual API calls during tests
jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    jest.clearAllMocks();
  });

  test('renders main heading', () => {
    render(<App />);
    const heading = screen.getByText(/PR Approval Finder/i);
    expect(heading).toBeInTheDocument();
  });

  test('renders form elements', () => {
    render(<App />);

    // Check for form inputs
    const urlInput = screen.getByLabelText(/GitHub PR URL/i);
    const tokenInput = screen.getByLabelText(/GitHub Token/i);
    const submitButton = screen.getByRole('button', { name: /Analyze PR/i });

    expect(urlInput).toBeInTheDocument();
    expect(tokenInput).toBeInTheDocument();
    expect(submitButton).toBeInTheDocument();
  });

  test('form validation requires URL input', () => {
    render(<App />);

    const urlInput = screen.getByLabelText(/GitHub PR URL/i);
    expect(urlInput).toHaveAttribute('required');
    expect(urlInput).toHaveAttribute('type', 'url');
  });

  test('theme toggle button is present', () => {
    render(<App />);

    const themeButton = screen.getByTitle(/Choose theme/i);
    expect(themeButton).toBeInTheDocument();
  });

  test('history button is present', () => {
    render(<App />);

    const historyButton = screen.getByTitle(/Recent PRs/i);
    expect(historyButton).toBeInTheDocument();
  });

  test('can type in URL input', () => {
    render(<App />);

    const urlInput = screen.getByLabelText(/GitHub PR URL/i);
    fireEvent.change(urlInput, {
      target: { value: 'https://github.com/owner/repo/pull/123' },
    });

    expect(urlInput.value).toBe('https://github.com/owner/repo/pull/123');
  });

  test('can type in token input', () => {
    render(<App />);

    const tokenInput = screen.getByLabelText(/GitHub Token/i);
    fireEvent.change(tokenInput, {
      target: { value: 'ghp_test_token' },
    });

    expect(tokenInput.value).toBe('ghp_test_token');
  });

  test('submit button shows loading state when clicked', async () => {
    const axios = require('axios');
    // Mock axios to return a promise that doesn't resolve immediately
    axios.post.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    const urlInput = screen.getByLabelText(/GitHub PR URL/i);
    const submitButton = screen.getByRole('button', { name: /Analyze PR/i });

    // Fill in required URL
    fireEvent.change(urlInput, {
      target: { value: 'https://github.com/owner/repo/pull/123' },
    });

    // Click submit
    fireEvent.click(submitButton);

    // Check loading state - should show one of the loading messages
    await waitFor(() => {
      const loadingMessages = [
        /Fetching PR data from GitHub API.../i,
        /Parsing CODEOWNERS file/i,
        /Processing team memberships/i,
        /Running ML analysis/i,
        /Analyzing team approval patterns/i,
        /Finalizing recommendations/i,
      ];

      const hasLoadingMessage = loadingMessages.some(message => screen.queryByText(message));

      expect(hasLoadingMessage).toBeTruthy();
    });

    expect(submitButton).toBeDisabled();
  });

  test('theme persistence works', () => {
    // Set a theme in localStorage
    localStorage.setItem('currentTheme', 'dark');

    render(<App />);

    // Check if body has the theme class
    expect(document.body.className).toContain('theme-dark');
  });

  test('recent PRs are loaded from localStorage', () => {
    const mockPRs = [
      {
        url: 'https://github.com/test/repo/pull/1',
        title: 'Test PR',
        number: 1,
        author: 'testuser',
        analyzedAt: new Date().toISOString(),
        totalGroups: 2,
        needsApproval: 1,
      },
    ];

    localStorage.setItem('recentPRs', JSON.stringify(mockPRs));

    render(<App />);

    const historyButton = screen.getByTitle(/Recent PRs/i);
    expect(historyButton).toBeInTheDocument();

    // Check if history count is shown
    const historyCount = screen.getByText('1');
    expect(historyCount).toBeInTheDocument();
  });
});
