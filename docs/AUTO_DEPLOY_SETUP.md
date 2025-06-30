# Auto Deploy Setup

This document explains how to set up the auto-deploy GitHub Action that automatically deploys the application to your VM when changes are merged to the main branch.

## 🚀 How It Works

The GitHub Action:
1. **Automatic Trigger**: Runs on every push to the `main` branch
2. **Manual Trigger**: Can be triggered manually with custom options
3. **Connection**: Connects to your VM via Cloudflare Access SSH
4. **Deployment**: Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`

## 🔧 Required GitHub Secrets

You need to configure these secrets in your GitHub repository:

### Go to Repository Settings
1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret** for each secret below

### Required Secrets

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `SSH_HOST` | The internal hostname/IP of your VM | `ubuntu.aswinlocal.in` |
| `SSH_USER` | SSH username for the VM | `aswin` |
| `SSH_PASSWORD` | SSH password for the VM | `your_password_here` |
| `CLOUDFLARE_HOSTNAME` | Cloudflare Access hostname | `ubuntu.aswinlocal.in` |

## 🎛️ Manual Deployment

### How to Trigger Manually
1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Auto Deploy to VM** workflow
4. Click **Run workflow** button
5. Configure options:
   - **Environment**: Choose `production` or `staging`
   - **Force deploy**: Enable to deploy even if no changes exist
6. Click **Run workflow**

### Manual Trigger Options

| Option | Description | Default |
|--------|-------------|---------|
| **Environment** | Deployment environment | `production` |
| **Force deploy** | Deploy even without changes | `false` |

## 📋 Setup Steps

### 1. Configure GitHub Secrets
Add all the secrets listed above in your repository settings.

### 2. Ensure Auto-Deploy Script Exists
Make sure the script `/home/aswin/pr-review-checker/auto-deploy.sh` exists on your VM and is executable:

```bash
# On your VM
chmod +x /home/aswin/pr-review-checker/auto-deploy.sh
```

### 3. Test the Script
Test that your auto-deploy script works correctly:

```bash
# On your VM
cd /home/aswin/pr-review-checker
./auto-deploy.sh
```

## 🔍 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify Cloudflare Access is properly configured
   - Check that the hostname in `CLOUDFLARE_HOSTNAME` is correct
   - Ensure the VM is accessible via Cloudflare Access

2. **Permission Denied**
   - Make sure the auto-deploy script is executable
   - Verify the SSH user has access to the directory

3. **Script Not Found**
   - Ensure the path `/home/aswin/pr-review-checker/auto-deploy.sh` is correct
   - Check that the script exists on the VM

4. **No Changes to Deploy**
   - This is normal behavior when no new commits exist
   - Use "Force deploy" option to deploy anyway

### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
- 🚀 Manual deployment triggered
- 🔄 Automatic deployment triggered
- 📦 Installation steps
- 🔧 Configuration steps
- 🔍 Connection testing
- 🚀 Deployment execution
- ✅ Success indicators
- ❌ Error indicators

## 🔒 Security Notes

- The SSH password is stored securely in GitHub secrets
- SSH key checking is disabled for automation
- The connection uses Cloudflare Access for secure tunneling
- All secrets are encrypted and not visible in logs

## 📝 Example Auto-Deploy Script

The script handles both automatic and manual deployments:

```bash
#!/bin/bash
set -e

# Get deployment parameters (set by GitHub Actions)
DEPLOY_ENV=${DEPLOY_ENV:-"production"}
FORCE_DEPLOY=${FORCE_DEPLOY:-"false"}

echo "🚀 Starting auto-deploy process for PR Review Checker..."
echo "📋 Environment: $DEPLOY_ENV"
echo "🔧 Force deploy: $FORCE_DEPLOY"

# Check for changes (unless force deploy is enabled)
if [ "$FORCE_DEPLOY" = "false" ]; then
    echo "🔍 Checking for changes..."
    git fetch origin
    if git rev-list HEAD...origin/main --count | grep -q "^0$"; then
        echo "✅ No new changes to deploy"
        exit 0
    fi
fi

# Pull latest changes and deploy
git reset --hard origin/main
npm install
cd client && npm install && npm run build && cd ..

# Environment-specific deployment
if [ "$DEPLOY_ENV" = "staging" ]; then
    PM2_APP_NAME="pr-review-checker-staging"
else
    PM2_APP_NAME="pr-review-checker"
fi

pm2 restart $PM2_APP_NAME || pm2 start server/index.js --name $PM2_APP_NAME

echo "✅ Deployment completed successfully!"
```

Make sure to make the script executable: `chmod +x auto-deploy.sh` 