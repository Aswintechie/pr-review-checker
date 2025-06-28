# 🚀 PR Preview Deployment Setup Guide

This guide will help you set up automatic PR preview deployments using a self-hosted GitHub Actions runner.

## 📋 Overview

When a Pull Request is opened, the system will:
1. **Build** the application automatically
2. **Deploy** it to a unique URL on your server
3. **Comment** on the PR with the preview link
4. **Update** the deployment when new commits are pushed
5. **Cleanup** when the PR is closed

## 🏗️ Architecture

```
GitHub PR → GitHub Actions → Self-Hosted Runner → Your Server
                                                      ↓
                                               PM2 + Nginx
                                                      ↓
                                            pr-1.yourdomain.com
                                            pr-2.yourdomain.com
                                            pr-3.yourdomain.com
```

## 🛠️ Prerequisites

- **Ubuntu Server** (20.04 LTS or later)
- **Domain name** (optional, but recommended)
- **GitHub repository** with admin access
- **Basic Linux knowledge**

## 📦 Installation

### Step 1: Run the Setup Script

```bash
# Clone your repository
git clone https://github.com/your-username/pr-review-checker.git
cd pr-review-checker

# Make setup script executable
chmod +x scripts/setup-runner.sh

# Run the setup script
./scripts/setup-runner.sh
```

### Step 2: Configure GitHub Actions Runner

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **"New self-hosted runner"**
4. Choose **Linux** and **x64**
5. Follow the download and configuration instructions:

```bash
# Download (replace with the actual URL from GitHub)
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure (replace with your actual token)
./config.sh --url https://github.com/your-username/pr-review-checker --token YOUR_TOKEN

# Start the runner
./run.sh
```

### Step 3: Update Workflow Configuration

Edit `.github/workflows/pr-preview.yml` and replace:
- `your-server-domain` with your actual domain or IP address

Example:
```yaml
# Replace this line:
PREVIEW_URL="http://your-server-domain:$CLIENT_PORT"

# With your actual domain:
PREVIEW_URL="http://preview.yourdomain.com:$CLIENT_PORT"
# Or IP address:
PREVIEW_URL="http://123.456.789.123:$CLIENT_PORT"
```

### Step 4: Configure Nginx (Optional but Recommended)

For better URLs and SSL support:

```bash
# Copy the nginx configuration
sudo cp ~/nginx-pr-preview.conf /etc/nginx/sites-available/pr-preview
sudo ln -s /etc/nginx/sites-available/pr-preview /etc/nginx/sites-enabled/

# Edit the configuration
sudo nano /etc/nginx/sites-available/pr-preview

# Replace 'your-domain.com' with your actual domain
# Test the configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 5: Set up SSL (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d *.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Configuration Options

### Port Management

The system automatically assigns ports based on PR numbers:
- **PR #1**: Client on port 3001, Server on port 3002
- **PR #2**: Client on port 3002, Server on port 3003
- **PR #n**: Client on port 3000+n, Server on port 3001+n

### Environment Variables

You can customize the deployment by setting these in your repository secrets:

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub API token | Auto-provided |
| `DEPLOYMENT_DOMAIN` | Your server domain | `your-server-domain` |
| `BASE_PORT` | Starting port number | `3000` |

### Workflow Customization

Edit `.github/workflows/pr-preview.yml` to:
- Change build commands
- Add deployment steps
- Modify comment templates
- Add notifications

## 🚀 Usage

### Automatic Deployment

1. **Open a PR** - Deployment starts automatically
2. **Wait for build** - Usually takes 2-5 minutes
3. **Get preview link** - Posted as a comment on the PR
4. **Test your changes** - Visit the preview URL
5. **Push updates** - Deployment updates automatically

### Manual Management

```bash
# Check runner status
./runner-status.sh

# Start runner manually
./start-runner.sh

# Stop runner
./stop-runner.sh

# Clean up old deployments
./cleanup-deployments.sh
```

### PM2 Commands

```bash
# List all deployments
pm2 status

# View logs for a specific PR
pm2 logs pr-1-server
pm2 logs pr-1-client

# Restart a deployment
pm2 restart pr-1-server

# Stop a specific deployment
pm2 stop pr-1-server pr-1-client
pm2 delete pr-1-server pr-1-client
```

## 📊 Monitoring

### View Active Deployments

```bash
# List all active deployments
ls -la ~/deployments/

# Check port usage
netstat -tlnp | grep -E ":(300[0-9]|400[0-9])"

# View deployment logs
tail -f ~/deployments/pr-1/logs/server.log
```

### Health Checks

The workflow includes automatic health checks:
- **Server health**: `http://your-domain:port/health`
- **Client health**: `http://your-domain:port/`

## 🔒 Security Considerations

### Access Control

- **Forks**: Only PRs from the same repository are deployed (security measure)
- **Tokens**: GitHub tokens are automatically provided and scoped
- **Firewall**: Configure UFW to restrict access if needed

### Best Practices

1. **Use HTTPS** in production
2. **Limit port range** in firewall
3. **Regular cleanup** of old deployments
4. **Monitor resource usage**
5. **Keep runner updated**

## 🐛 Troubleshooting

### Common Issues

#### Runner Not Starting
```bash
# Check runner status
./runner-status.sh

# Check runner logs
tail -f ~/actions-runner/_diag/Runner_*.log
```

#### Deployment Failed
```bash
# Check workflow logs on GitHub
# Check PM2 logs
pm2 logs pr-X-server

# Check deployment directory
ls -la ~/deployments/pr-X/
```

#### Port Conflicts
```bash
# Find what's using the port
lsof -i :3001

# Kill conflicting processes
pm2 delete all
```

#### Nginx Issues
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### Cleanup Commands

```bash
# Emergency cleanup - stop everything
pm2 delete all
pm2 kill

# Remove all deployments
rm -rf ~/deployments/*

# Reset PM2
pm2 resurrect
```

## 📈 Scaling

### Multiple Runners

For high-volume repositories:

1. **Set up multiple servers**
2. **Use different runner labels**
3. **Load balance with nginx**
4. **Shared storage for deployments**

### Resource Limits

Monitor and limit resource usage:

```bash
# Set PM2 memory limits
pm2 start app.js --max-memory-restart 500M

# Monitor resource usage
pm2 monit
```

## 🔄 Updates

### Updating the Runner

```bash
cd ~/actions-runner
./svc.sh stop
# Download new version
./config.sh remove
# Reconfigure with new version
./svc.sh start
```

### Updating Dependencies

```bash
# Update Node.js packages
sudo npm update -g pm2 serve

# Update system packages
sudo apt update && sudo apt upgrade
```

## 📞 Support

### Getting Help

1. **Check logs** first (runner, PM2, nginx)
2. **Review GitHub Actions** workflow logs
3. **Test manually** with the same commands
4. **Check firewall** and port configurations

### Useful Commands

```bash
# Complete system status
./runner-status.sh

# View all logs
journalctl -u github-runner -f

# Test deployment manually
cd ~/deployments/pr-test
pm2 start ecosystem.config.js
```

## 🎉 Success!

Once set up, you'll have:
- ✅ **Automatic PR previews**
- ✅ **Unique URLs for each PR**
- ✅ **Automatic cleanup**
- ✅ **Real-time updates**
- ✅ **Professional workflow**

Happy deploying! 🚀 