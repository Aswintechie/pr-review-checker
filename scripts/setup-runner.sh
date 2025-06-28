#!/bin/bash

# 🚀 Self-Hosted Runner Setup Script for PR Preview Deployments
# This script prepares your Ubuntu server for GitHub Actions self-hosted runner

set -e

echo "🚀 Setting up Self-Hosted GitHub Runner for PR Previews..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_step "1. Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_step "2. Installing essential packages..."
sudo apt install -y curl wget git build-essential software-properties-common

print_step "3. Installing Node.js 20.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

print_step "4. Installing PM2 globally..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup
    print_warning "Please run the command shown above to enable PM2 startup"
else
    print_status "PM2 already installed: $(pm2 --version)"
fi

print_step "5. Installing serve globally..."
sudo npm install -g serve

print_step "6. Creating deployment directories..."
mkdir -p ~/deployments
mkdir -p ~/runner-logs

print_step "7. Setting up nginx (optional - for domain hosting)..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    print_status "Nginx installed. You can configure it later for domain hosting."
else
    print_status "Nginx already installed"
fi

print_step "8. Creating nginx configuration template..."
cat > ~/nginx-pr-preview.conf << 'EOF'
# Nginx configuration for PR previews
# Copy this to /etc/nginx/sites-available/ and modify as needed

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    
    # Main application (production)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API endpoint
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# PR Preview subdomains (optional)
server {
    listen 80;
    server_name ~^pr-(?<pr_number>\d+)\.your-domain\.com$;  # Replace with your domain
    
    location / {
        set $pr_port 3000;
        if ($pr_number) {
            set $pr_port "300$pr_number";  # This creates ports like 3001, 3002, etc.
        }
        proxy_pass http://localhost:$pr_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

print_step "9. Setting up firewall rules..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000:4000/tcp  # Allow ports for PR previews
print_warning "Firewall rules added. Enable with: sudo ufw enable"

print_step "10. Installing GitHub CLI (optional)..."
if ! command -v gh &> /dev/null; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install gh -y
else
    print_status "GitHub CLI already installed"
fi

print_step "11. Creating runner management scripts..."

# Start script
cat > ~/start-runner.sh << 'EOF'
#!/bin/bash
cd ~/actions-runner
./run.sh
EOF
chmod +x ~/start-runner.sh

# Stop script
cat > ~/stop-runner.sh << 'EOF'
#!/bin/bash
cd ~/actions-runner
./svc.sh stop
EOF
chmod +x ~/stop-runner.sh

# Status script
cat > ~/runner-status.sh << 'EOF'
#!/bin/bash
echo "=== GitHub Runner Status ==="
ps aux | grep Runner.Listener || echo "Runner not running"
echo ""
echo "=== PM2 Processes ==="
pm2 status
echo ""
echo "=== Active Deployments ==="
ls -la ~/deployments/ 2>/dev/null || echo "No deployments found"
echo ""
echo "=== Port Usage ==="
netstat -tlnp | grep -E ":(300[0-9]|400[0-9])" || echo "No PR preview ports in use"
EOF
chmod +x ~/runner-status.sh

print_step "12. Creating cleanup script..."
cat > ~/cleanup-deployments.sh << 'EOF'
#!/bin/bash
echo "🧹 Cleaning up old PR deployments..."

# Stop all PR-related PM2 processes
pm2 delete all 2>/dev/null || true

# Remove deployment directories older than 7 days
find ~/deployments -name "pr-*" -type d -mtime +7 -exec rm -rf {} \;

# Clean up logs
find ~/runner-logs -name "*.log" -mtime +30 -delete

echo "✅ Cleanup completed"
EOF
chmod +x ~/cleanup-deployments.sh

print_step "13. Setting up log rotation..."
sudo tee /etc/logrotate.d/pr-previews > /dev/null << 'EOF'
/home/*/deployments/*/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
}

/home/*/runner-logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
}
EOF

print_step "14. Creating systemd service for runner (optional)..."
cat > ~/github-runner.service << 'EOF'
[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/actions-runner
ExecStart=/home/$USER/actions-runner/run.sh
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

print_status "Setup completed! 🎉"
echo ""
print_step "Next steps:"
echo "1. Download and configure GitHub Actions runner:"
echo "   - Go to your repository Settings > Actions > Runners"
echo "   - Click 'New self-hosted runner'"
echo "   - Follow the instructions to download and configure"
echo ""
echo "2. Update the workflow file:"
echo "   - Replace 'your-server-domain' with your actual domain/IP"
echo "   - Configure nginx if using domain names"
echo ""
echo "3. Optional: Enable the systemd service:"
echo "   sudo cp ~/github-runner.service /etc/systemd/system/"
echo "   sudo systemctl enable github-runner"
echo "   sudo systemctl start github-runner"
echo ""
echo "4. Test the setup:"
echo "   ./runner-status.sh"
echo ""
print_warning "Remember to:"
echo "- Configure your domain/IP in the workflow file"
echo "- Set up SSL certificates if using HTTPS"
echo "- Configure firewall rules: sudo ufw enable"
echo "- Set up nginx configuration if needed"
echo ""
print_status "Happy deploying! 🚀" 