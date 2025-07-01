const request = require('supertest');
const { cleanup } = require('./index');
const app = require('./index');

// Mock axios to prevent actual GitHub API calls during tests
jest.mock('axios');
const axios = require('axios');

describe('PR Approval Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Clean up email transporter after all tests complete
  afterAll(async () => {
    await cleanup();
    // Give a small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 100));
  }, 10000);

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'OK', service: 'PR Approval Finder' });
    });
  });

  describe('CORS and Basic Setup', () => {
    test('should have CORS headers', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/pr-approvers', () => {
    test('should return 400 for missing PR URL', async () => {
      const response = await request(app).post('/api/pr-approvers').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('PR URL is required');
    });

    test('should return 400 for invalid PR URL format', async () => {
      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid GitHub PR URL format');
    });

    test('should return 400 for non-GitHub URL', async () => {
      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'https://gitlab.com/owner/repo/merge_requests/123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid GitHub PR URL format');
    });

    test('should accept valid GitHub PR URL format', async () => {
      // Mock successful GitHub API responses
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        user: { login: 'testuser' },
        state: 'open',
        draft: false,
        merged: false,
        mergeable: true,
        mergeable_state: 'clean',
        merged_at: null,
        closed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/123',
        base: { repo: { full_name: 'owner/repo' } },
        requested_reviewers: [],
        requested_teams: [],
      };

      const mockFilesData = [{ filename: 'src/test.js' }, { filename: 'README.md' }];

      const mockReviewsData = [
        {
          user: { login: 'reviewer1' },
          state: 'APPROVED',
        },
      ];

      const mockCodeownersData = {
        data: {
          content: Buffer.from('# CODEOWNERS\n* @owner1 @owner2\nsrc/ @dev-team\n').toString(
            'base64'
          ),
        },
      };

      const mockUserData = {
        name: 'Test User',
        avatar_url: 'https://github.com/avatar.jpg',
      };

      axios.get
        .mockResolvedValueOnce({
          data: mockPRData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-reset': '1640995200',
          },
        }) // PR info
        .mockResolvedValueOnce({
          data: mockFilesData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4998',
            'x-ratelimit-reset': '1640995200',
          },
        }) // Files
        .mockResolvedValueOnce(mockCodeownersData) // CODEOWNERS
        .mockResolvedValueOnce({
          data: mockReviewsData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4997',
            'x-ratelimit-reset': '1640995200',
          },
        }) // Reviews
        .mockResolvedValue({ data: mockUserData }); // User details

      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'https://github.com/owner/repo/pull/123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prInfo');
      expect(response.body).toHaveProperty('changedFiles');
      expect(response.body).toHaveProperty('minRequiredApprovals');
      expect(response.body.prInfo.title).toBe('Test PR');
      expect(response.body.prInfo.number).toBe(123);
    });

    test('should handle GitHub API errors gracefully', async () => {
      const error = new Error('Not Found');
      error.response = {
        status: 404,
        data: { message: 'Not Found' },
      };

      axios.get.mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'https://github.com/owner/repo/pull/999' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('PR not found');
    });

    test('should handle rate limiting', async () => {
      const error = new Error('API rate limit exceeded');
      error.response = {
        status: 403,
        data: { message: 'API rate limit exceeded' },
        headers: {
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1640995200',
        },
      };

      axios.get.mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'https://github.com/owner/repo/pull/123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('rate limit');
      expect(response.body).toHaveProperty('rateLimitInfo');
    });

    test('should include rate limit info in successful responses', async () => {
      const mockPRData = {
        number: 123,
        title: 'Test PR',
        user: { login: 'testuser' },
        state: 'open',
        draft: false,
        merged: false,
        mergeable: true,
        mergeable_state: 'clean',
        merged_at: null,
        closed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/123',
        base: { repo: { full_name: 'owner/repo' } },
        requested_reviewers: [],
        requested_teams: [],
      };

      const mockFilesData = [{ filename: 'test.js' }];
      const mockReviewsData = [];
      const mockCodeownersData = {
        data: {
          content: Buffer.from('* @owner1\n').toString('base64'),
        },
      };
      const mockUserData = { name: 'Owner 1', avatar_url: 'https://github.com/avatar.jpg' };

      // Mock with rate limit headers
      axios.get
        .mockResolvedValueOnce({
          data: mockPRData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-reset': '1640995200',
          },
        })
        .mockResolvedValueOnce({
          data: mockFilesData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4998',
            'x-ratelimit-reset': '1640995200',
          },
        })
        .mockResolvedValueOnce(mockCodeownersData)
        .mockResolvedValueOnce({
          data: mockReviewsData,
          headers: {
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4997',
            'x-ratelimit-reset': '1640995200',
          },
        })
        .mockResolvedValue({ data: mockUserData });

      const response = await request(app).post('/api/pr-approvers').send({
        prUrl: 'https://github.com/owner/repo/pull/123',
        githubToken: 'test-token',
      });

      expect(response.body).toHaveProperty('rateLimitInfo');
      expect(response.body.rateLimitInfo.limit).toBe(5000);
      expect(response.body.rateLimitInfo.remaining).toBe(4997);
    });

    test('should handle enhanced PR status states correctly', async () => {
      // Test draft PR
      const mockDraftPRData = {
        number: 456,
        title: 'Draft PR',
        user: { login: 'testuser' },
        state: 'open',
        draft: true,
        merged: false,
        mergeable: null,
        mergeable_state: 'unknown',
        merged_at: null,
        closed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/owner/repo/pull/456',
        base: { repo: { full_name: 'owner/repo' } },
        requested_reviewers: [],
        requested_teams: [],
      };

      const mockFilesData = [{ filename: 'test.js' }];
      const mockReviewsData = [];
      const mockCodeownersData = {
        data: {
          content: Buffer.from('* @owner1\n').toString('base64'),
        },
      };
      const mockUserData = { name: 'Owner 1', avatar_url: 'https://github.com/avatar.jpg' };

      axios.get
        .mockResolvedValueOnce({
          data: mockDraftPRData,
          headers: { 'x-ratelimit-limit': '5000', 'x-ratelimit-remaining': '4999' },
        })
        .mockResolvedValueOnce({
          data: mockFilesData,
          headers: { 'x-ratelimit-limit': '5000', 'x-ratelimit-remaining': '4998' },
        })
        .mockResolvedValueOnce(mockCodeownersData)
        .mockResolvedValueOnce({
          data: mockReviewsData,
          headers: { 'x-ratelimit-limit': '5000', 'x-ratelimit-remaining': '4997' },
        })
        .mockResolvedValue({ data: mockUserData });

      const response = await request(app)
        .post('/api/pr-approvers')
        .send({ prUrl: 'https://github.com/owner/repo/pull/456' });

      expect(response.status).toBe(200);
      expect(response.body.prInfo.state).toBe('draft');
      expect(response.body.prInfo.statusDetails).toBeDefined();
      expect(response.body.prInfo.statusDetails.isDraft).toBe(true);
      expect(response.body.prInfo.statusDetails.isMerged).toBe(false);
    });
  });

  describe('URL Parsing', () => {
    test('should correctly parse different GitHub PR URL formats', async () => {
      const urls = [
        'https://github.com/owner/repo/pull/123',
        'https://github.com/owner/repo/pull/123/',
        'https://github.com/owner/repo/pull/123#issuecomment-123',
        'https://github.com/owner/repo/pull/123/files',
      ];

      for (const url of urls) {
        const response = await request(app).post('/api/pr-approvers').send({ prUrl: url });

        // Should not return URL format error
        expect(response.body.error).not.toContain('Invalid GitHub PR URL format');
      }
    });
  });
});
