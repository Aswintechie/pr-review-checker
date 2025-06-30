# Auto Deploy Setup

This document explains how to set up the auto-deploy GitHub Action that automatically deploys the application to your VM when changes are merged to the main branch.

## 🚀 How It Works

The GitHub Action:
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
1. **Automatic Trigger**: Runs on every push to the `main` branch
2. **Manual Trigger**: Can be triggered manually with custom options
3. **Connection**: Connects to your VM via Cloudflare Access SSH
4. **Deployment**: Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`
<<<<<<< HEAD
<<<<<<< HEAD
5. **Monitoring**: Shows deployment logs and service status
=======
1. Triggers on every push to the `main` branch
2. Connects to your VM via Cloudflare Access SSH
3. Runs the auto-deploy script at `/home/aswin/pr-review-checker/auto-deploy.sh`
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
=======
5. **Monitoring**: Shows deployment logs and service status
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)

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
| `SSH_PRIVATE_KEY` | SSH private key content (ed25519 recommended) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `CLOUDFLARE_HOSTNAME` | Cloudflare Access hostname | `ubuntu.aswinlocal.in` |

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
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

<<<<<<< HEAD
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
## 📋 Setup Steps

### 1. Configure GitHub Secrets
Add all the secrets listed above in your repository settings.

### 2. Set Up SSH Keys

Generate and configure SSH keys for secure authentication:

#### Generate SSH Key Pair (if you don't have one)
```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key

# This creates:
# - ~/.ssh/github_actions_key (private key)
# - ~/.ssh/github_actions_key.pub (public key)
```

#### Add Public Key to VM
```bash
# Copy the public key to your VM
ssh-copy-id -i ~/.ssh/github_actions_key.pub aswin@YOUR_VM_IP

# Or manually add to authorized_keys
cat ~/.ssh/github_actions_key.pub | ssh aswin@YOUR_VM_IP "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

#### Add Private Key to GitHub Secrets
1. Copy the private key content:
   ```bash
   cat ~/.ssh/github_actions_key
   ```
2. Add as `SSH_PRIVATE_KEY` secret in GitHub repository settings

### 3. Ensure Auto-Deploy Script Exists
Make sure the script `/home/aswin/pr-review-checker/auto-deploy.sh` exists on your VM and is executable:

```bash
# On your VM
chmod +x /home/aswin/pr-review-checker/auto-deploy.sh
```

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
### 3. Set Up Systemd Service
=======
### 4. Set Up Systemd Service
>>>>>>> be50992 (🔐 Switch to SSH key authentication for improved security and reliability)
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

<<<<<<< HEAD
### 4. Test the Script
<<<<<<< HEAD
=======
### 3. Test the Script
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
=======
### 5. Test the Script
>>>>>>> be50992 (🔐 Switch to SSH key authentication for improved security and reliability)
Test that your auto-deploy script works correctly:

```bash
# On your VM
cd /home/aswin/pr-review-checker
./auto-deploy.sh
```

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
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

<<<<<<< HEAD
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
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
<<<<<<< HEAD
   - Check sudo permissions for systemctl commands
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
   - Check sudo permissions for systemctl commands
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)

3. **Script Not Found**
   - Ensure the path `/home/aswin/pr-review-checker/auto-deploy.sh` is correct
   - Check that the script exists on the VM

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
4. **Service Restart Failed**
   - Check systemd service configuration
   - Verify the service file syntax
   - Check service logs: `sudo journalctl -u pr-deploy`

5. **Build Failures**
   - Check Node.js and npm versions
   - Verify all dependencies are available
   - Check disk space for builds
<<<<<<< HEAD
=======
4. **No Changes to Deploy**
   - This is normal behavior when no new commits exist
   - Use "Force deploy" option to deploy anyway
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
=======
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)

### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
- 🚀 Manual deployment triggered
- 🔄 Automatic deployment triggered
<<<<<<< HEAD
=======
### Debugging

The GitHub Action includes detailed logging with emojis for easy identification:
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
>>>>>>> 91a4749 (🎛️ Add manual trigger support with environment and force deploy options)
- 📦 Installation steps
- 🔧 Configuration steps
- 🔍 Connection testing
- 🚀 Deployment execution
<<<<<<< HEAD
<<<<<<< HEAD
- 📋 Log retrieval
=======
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
- 📋 Log retrieval
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
- ✅ Success indicators
- ❌ Error indicators

## 🔒 Security Notes

- The SSH private key is stored securely in GitHub secrets
- SSH key checking is enabled for automation
- The connection uses Cloudflare Access for secure tunneling
- All secrets are encrypted and not visible in logs
<<<<<<< HEAD
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
=======
- Systemd service runs with appropriate user permissions
>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)

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

<<<<<<< HEAD
>>>>>>> 40a43ce (🚀 Add auto-deploy GitHub Action for VM deployment)
=======
Key features:
- **Comprehensive logging** to `deploy.log`
- **Error handling** with `set -e`
- **Dependency installation** with fallback to `npm install`
- **Client build** process
- **Systemd service restart**
- **Health check** verification

>>>>>>> e3d2023 (🔧 Update auto-deploy workflow to match actual VM script with systemd and logging)
Make sure to make the script executable: `chmod +x auto-deploy.sh` 