#!/bin/bash

# 🧹 Nginx Cleanup Script for Closed PRs
# Removes Nginx configurations for closed/merged PRs

set -e

PR_NUMBER=${1:-""}

if [[ -z "$PR_NUMBER" ]]; then
    echo "Usage: $0 <pr_number>"
    echo "Example: $0 5"
    echo ""
    echo "Or run without arguments to clean up all orphaned configurations:"
    echo "$0 --cleanup-all"
    exit 1
fi

cleanup_pr() {
    local pr_num=$1
    echo "🧹 Cleaning up Nginx configuration for PR #$pr_num"
    
    # Remove symlink from sites-enabled
    sudo rm -f /etc/nginx/sites-enabled/pr-$pr_num
    
    # Remove configuration file
    sudo rm -f /etc/nginx/sites-available/pr-$pr_num
    
    echo "✅ Removed Nginx configuration for PR #$pr_num"
}

cleanup_all_orphaned() {
    echo "🔍 Finding orphaned Nginx configurations..."
    
    # Get list of active PM2 processes
    active_prs=$(pm2 jlist 2>/dev/null | jq -r '.[].name' | grep -E '^pr-[0-9]+-' | sed 's/pr-\([0-9]\+\)-.*/\1/' | sort -u || true)
    
    # Get list of Nginx configurations
    nginx_prs=$(ls /etc/nginx/sites-available/pr-* 2>/dev/null | sed 's/.*pr-\([0-9]\+\)$/\1/' | sort -u || true)
    
    if [[ -z "$nginx_prs" ]]; then
        echo "ℹ️  No PR Nginx configurations found"
        return
    fi
    
    echo "Active PRs: $active_prs"
    echo "Nginx configs: $nginx_prs"
    
    # Find orphaned configurations
    for pr in $nginx_prs; do
        if ! echo "$active_prs" | grep -q "^$pr$"; then
            echo "🗑️  Found orphaned configuration for PR #$pr"
            cleanup_pr $pr
        fi
    done
}

if [[ "$1" == "--cleanup-all" ]]; then
    cleanup_all_orphaned
else
    cleanup_pr $PR_NUMBER
fi

# Test and reload Nginx
echo "🔄 Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Nginx cleanup completed" 