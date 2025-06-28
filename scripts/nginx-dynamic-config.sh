#!/bin/bash

# 🌐 Dynamic Nginx Configuration for PR Previews
# This script creates clean subdomain URLs for PR previews

set -e

DOMAIN=${1:-"your-domain.com"}
PR_NUMBER=${2:-""}

if [[ -z "$PR_NUMBER" ]]; then
    echo "Usage: $0 <domain> <pr_number>"
    echo "Example: $0 preview.example.com 5"
    exit 1
fi

CLIENT_PORT=$((3000 + $PR_NUMBER))
SERVER_PORT=$((3001 + $PR_NUMBER))

echo "🌐 Configuring Nginx for PR #$PR_NUMBER"
echo "   Domain: pr-$PR_NUMBER.$DOMAIN"
echo "   Client Port: $CLIENT_PORT"
echo "   Server Port: $SERVER_PORT"

# Create Nginx site configuration
cat > /tmp/pr-$PR_NUMBER.conf << EOF
# PR #$PR_NUMBER Preview Configuration
server {
    listen 80;
    server_name pr-$PR_NUMBER.$DOMAIN;
    
    # Redirect HTTP to HTTPS (if SSL is configured)
    # return 301 https://\$server_name\$request_uri;
    
    # Frontend (React app)
    location / {
        proxy_pass http://localhost:$CLIENT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers for development
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:$SERVER_PORT/health;
        access_log off;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:$CLIENT_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS configuration (uncomment if SSL is configured)
# server {
#     listen 443 ssl http2;
#     server_name pr-$PR_NUMBER.$DOMAIN;
#     
#     ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
#     
#     # Same location blocks as above...
# }
EOF

# Install the configuration
sudo cp /tmp/pr-$PR_NUMBER.conf /etc/nginx/sites-available/pr-$PR_NUMBER
sudo ln -sf /etc/nginx/sites-available/pr-$PR_NUMBER /etc/nginx/sites-enabled/pr-$PR_NUMBER

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Nginx configured for PR #$PR_NUMBER"
echo "   URL: http://pr-$PR_NUMBER.$DOMAIN"
echo "   API: http://pr-$PR_NUMBER.$DOMAIN/api/"

# Cleanup temp file
rm /tmp/pr-$PR_NUMBER.conf 