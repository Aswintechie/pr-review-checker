# PR Approval Finder

A modern web application that helps find the minimum persons approval required to get a GitHub Pull Request merged by analyzing CODEOWNERS files and current PR status.

## Features

- 🔍 **Smart PR Analysis**: Automatically fetches PR information from GitHub
- 👥 **CODEOWNERS Support**: Parses CODEOWNERS files to determine required approvals
- ✅ **Approval Tracking**: Shows current approvals and pending requirements
- 🎨 **Modern UI**: Beautiful, responsive interface with real-time status updates
- 🔒 **Private Repo Support**: Works with private repositories using GitHub tokens
- 📊 **Detailed Insights**: Shows changed files, requested reviewers, and team assignments

## How It Works

1. **Input PR URL**: Enter any GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
2. **CODEOWNERS Analysis**: The app fetches and parses the repository's CODEOWNERS file
3. **File Matching**: Matches changed files in the PR against CODEOWNERS patterns
4. **Approval Status**: Shows who has approved, who still needs to approve, and overall merge readiness

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone and Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Set Up Environment (Optional)**
   ```bash
   cp server/env.example server/.env
   # Edit server/.env and add your GitHub token if needed
   ```

3. **Start the Application**
   ```bash
   npm run dev
   ```

4. **Open Your Browser**
   ```
   http://localhost:3000
   ```

## GitHub Token Setup

For private repositories or higher rate limits, you'll need a GitHub Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `public_repo` (for public repositories)
   - `repo` (for private repositories)
4. Copy the generated token
5. Either:
   - Add it to `server/.env` file as `GITHUB_TOKEN=your_token_here`
   - Or enter it in the web interface when analyzing PRs

## Usage Examples

### Public Repository
- Just enter the PR URL: `https://github.com/facebook/react/pull/12345`
- No token required for public repos (but recommended for higher rate limits)

### Private Repository
- Enter the PR URL: `https://github.com/yourorg/private-repo/pull/67`
- Provide your GitHub token either in the .env file or web interface

## API Endpoints

### POST `/api/pr-approvers`

Analyzes a PR and returns approval requirements.

**Request Body:**
```json
{
  "prUrl": "https://github.com/owner/repo/pull/123",
  "githubToken": "ghp_xxxxxxxxxxxx" // optional
}
```

**Response:**
```json
{
  "prInfo": {
    "title": "Add new feature",
    "number": 123,
    "author": "developer",
    "state": "open",
    "url": "https://github.com/owner/repo/pull/123"
  },
  "changedFiles": ["src/component.js", "docs/README.md"],
  "requiredApprovers": ["team-lead", "security-team"],
  "currentApprovals": ["team-lead"],
  "stillNeedApproval": ["security-team"],
  "requestedReviewers": ["reviewer1"],
  "requestedTeams": ["frontend-team"],
  "isReadyToMerge": false
}
```

## Project Structure

```
pr-review/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # React components and styles
├── server/                # Node.js backend
│   ├── index.js          # Express server
│   └── env.example       # Environment variables template
├── package.json          # Root package.json
└── README.md            # This file
```

## Development

### Running in Development Mode
```bash
npm run dev        # Starts both client and server
npm run client     # Frontend only (port 3000)
npm run server     # Backend only (port 5000)
```

### Building for Production
```bash
npm run build      # Builds the React frontend
```

## CODEOWNERS File Support

The application supports CODEOWNERS files in these locations:
- `.github/CODEOWNERS`
- `CODEOWNERS` (root)
- `docs/CODEOWNERS`

### Example CODEOWNERS Format
```
# Global owners
* @global-team

# Frontend files
src/components/ @frontend-team @ui-team

# Backend files
src/api/ @backend-team
src/database/ @backend-team @dba-team

# Documentation
docs/ @docs-team
*.md @docs-team

# Security-sensitive files
src/auth/ @security-team
src/crypto/ @security-team @crypto-team
```

## Troubleshooting

### Common Issues

1. **"GitHub token is required" error**
   - The repository is private or you've hit rate limits
   - Add a GitHub token with appropriate permissions

2. **"Invalid GitHub PR URL format" error**
   - Ensure the URL follows the format: `https://github.com/owner/repo/pull/number`

3. **"No CODEOWNERS rules found"**
   - The repository doesn't have a CODEOWNERS file
   - The PR doesn't modify files covered by CODEOWNERS rules

4. **Rate limit exceeded**
   - Add a GitHub token to increase rate limits
   - Wait for the rate limit to reset (usually 1 hour)

### Rate Limits

- **Without token**: 60 requests per hour per IP
- **With token**: 5,000 requests per hour per token

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Provide the PR URL and any error messages you're seeing

---

Built with ❤️ using React, Node.js, and the GitHub API 