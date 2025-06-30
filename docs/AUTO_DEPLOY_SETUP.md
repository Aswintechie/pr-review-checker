# Auto Deploy Setup

This document explains how to set up the auto-deploy GitHub Action that automatically deploys the application to your VM when changes are merged to the main branch.

## 🚀 How It Works

The GitHub Action:
<<<<<<< HEAD
1. **Automatic Trigger**: Runs on every push to the `main` branch
2. **Manual Trigger**: Can be triggered manually with custom options
3. **Connection**: Connects to your VM via Cloudflare Access SSH
4. **Deployment**: Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`
5. **Monitoring**: Shows deployment logs and service status
=======
1. Triggers on every push to the `main` branch
2. Connects to your VM via Cloudflare Access SSH
3. Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)

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

<<<<<<< HEAD
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

=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
## 📋 Setup Steps

### 1. Configure GitHub Secrets
Add all the secrets listed above in your repository settings.

### 2. Ensure Auto-Deploy Script Exists
Make sure the script `/home/aswin/pr-review-checker/auto-deploy.sh` exists on your VM and is executable:

```bash
# On your VM
chmod +x /home/aswin/pr-review-checker/auto-deploy.sh
```

<<<<<<< HEAD
### 3. Set Up Systemd Service
Create a systemd service file for the application:

```bash
# Create service file
sudo nano /etc/systemd/system/pr-deploy.service
```

Add the following content:
```ini
[Unit]
Description=PR Review Checker Server
After=network.target

[Service]
Type=simple
User=aswin
WorkingDirectory=/home/aswin/pr-review-checker/server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pr-deploy
sudo systemctl start pr-deploy
```

### 4. Test the Script
=======
### 3. Test the Script
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
Test that your auto-deploy script works correctly:

```bash
# On your VM
cd /home/aswin/pr-review-checker
./auto-deploy.sh
```

<<<<<<< HEAD
## 📊 Monitoring and Logs

### Deployment Logs
The auto-deploy script logs all activities to `/home/aswin/pr-review-checker/deploy.log`:

```bash
# View recent deployment logs
tail -f /home/aswin/pr-review-checker/deploy.log

# View all deployment logs
cat /home/aswin/pr-review-checker/deploy.log
```

### Service Status
Check the systemd service status:

```bash
# Check service status
sudo systemctl status pr-deploy

# View service logs
sudo journalctl -u pr-deploy -f
```

### GitHub Actions Logs
The GitHub Actions workflow will show:
- Deployment progress
- Recent deployment logs from your VM
- Service status after deployment
- Any errors or warnings

=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
## 🔍 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify Cloudflare Access is properly configured
   - Check that the hostname in `CLOUDFLARE_HOSTNAME` is correct
   - Ensure the VM is accessible via Cloudflare Access

2. **Permission Denied**
   - Make sure the auto-deploy script is executable
   - Verify the SSH user has access to the directory
<<<<<<< HEAD
   - Check sudo permissions for systemctl commands
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)

3. **Script Not Found**
   - Ensure the path `/home/aswin/pr-review-checker/auto-deploy.sh` is correct
   - Check that the script exists on the VM

<<<<<<< HEAD
4. **Service Restart Failed**
   - Check systemd service configuration
   - Verify the service file syntax
   - Check service logs: `sudo journalctl -u pr-deploy`

5. **Build Failures**
   - Check Node.js and npm versions
   - Verify all dependencies are available
   - Check disk space for builds

### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
- 🚀 Manual deployment triggered
- 🔄 Automatic deployment triggered
=======
### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
- 📦 Installation steps
- 🔧 Configuration steps
- 🔍 Connection testing
- 🚀 Deployment execution
<<<<<<< HEAD
- 📋 Log retrieval
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
- ✅ Success indicators
- ❌ Error indicators

## 🔒 Security Notes

- The SSH password is stored securely in GitHub secrets
- SSH key checking is disabled for automation
- The connection uses Cloudflare Access for secure tunneling
- All secrets are encrypted and not visible in logs
<<<<<<< HEAD
- Systemd service runs with appropriate user permissions

## 📝 Auto-Deploy Script Structure

Your auto-deploy script includes:

```bash
#!/bin/bash
# auto-deploy.sh - Production deployment script for pr-review-checker

set -e  # Exit on error

LOG_FILE="/home/aswin/pr-review-checker/deploy.log"
PROJECT_DIR="/home/aswin/pr-review-checker"
APP_NAME="pr-deploy"

# Git pull, npm install, build, and service restart
# All with comprehensive logging
```

Key features:
- **Comprehensive logging** to `deploy.log`
- **Error handling** with `set -e`
- **Dependency installation** with fallback to `npm install`
- **Client build** process
- **Systemd service restart**
- **Health check** verification

=======

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

>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
Make sure to make the script executable: `chmod +x auto-deploy.sh` 