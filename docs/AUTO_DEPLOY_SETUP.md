# Auto Deploy Setup

This document explains how to set up the auto-deploy GitHub Action that automatically deploys the application to your VM when changes are merged to the main branch.

## 🚀 How It Works

The GitHub Action:
1. Triggers on every push to the `main` branch
2. Connects to your VM via Cloudflare Access SSH
3. Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`

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

### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
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

Here's an example of what your `auto-deploy.sh` script might look like:

```bash
#!/bin/bash
set -e

echo "🚀 Starting auto-deploy process..."

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Restart services (if using PM2, systemd, etc.)
# pm2 restart pr-review-checker
# or
# sudo systemctl restart pr-review-checker

echo "✅ Auto-deploy completed successfully!"
```

Make sure to make the script executable: `chmod +x auto-deploy.sh` 