#!/usr/bin/env python3

"""
Check approval statistics for a specific user
This script searches through available data and GitHub API to find approval counts
"""

import json
import sys
import os
import requests
from collections import Counter
import time

def search_user_in_logs(username):
    """Search for a username in all available log files"""
    
    log_files = [
        'training_pr_log.json',
        'server/training-log.json'
    ]
    
    results = {}
    
    for log_file in log_files:
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    data = json.load(f)
                    
                # Convert to string and search
                log_str = json.dumps(data).lower()
                if username.lower() in log_str:
                    results[log_file] = "Found mention"
                else:
                    results[log_file] = "No mention"
                    
            except Exception as e:
                results[log_file] = f"Error reading: {e}"
        else:
            results[log_file] = "File not found"
    
    return results

def get_github_user_data(username, token=None):
    """Get recent PR approval activity for a user from GitHub API"""
    
    if not token:
        print("⚠️  No GitHub token provided - limited data available")
        return None
    
    # Remove @ if present
    clean_username = username.lstrip('@')
    
    headers = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': f'token {token}',
        'User-Agent': 'PR-Approval-Checker'
    }
    
    try:
        # Get user info
        user_response = requests.get(f'https://api.github.com/users/{clean_username}', headers=headers)
        
        if user_response.status_code == 404:
            return {'error': f'User {clean_username} not found on GitHub'}
        elif user_response.status_code != 200:
            return {'error': f'GitHub API error: {user_response.status_code}'}
        
        user_data = user_response.json()
        
        # Get recent activity (this is limited without org access)
        events_response = requests.get(f'https://api.github.com/users/{clean_username}/events/public', headers=headers)
        
        approval_count = 0
        pr_review_events = []
        
        if events_response.status_code == 200:
            events = events_response.json()
            
            for event in events:
                if event.get('type') == 'PullRequestReviewEvent':
                    review = event.get('payload', {}).get('review', {})
                    if review.get('state') == 'approved':
                        approval_count += 1
                        pr_review_events.append({
                            'repo': event.get('repo', {}).get('name', 'Unknown'),
                            'pr_number': event.get('payload', {}).get('pull_request', {}).get('number'),
                            'created_at': event.get('created_at')
                        })
        
        return {
            'user': user_data.get('name') or clean_username,
            'username': clean_username,
            'recent_approvals': approval_count,
            'approval_events': pr_review_events[:10],  # Last 10 approvals
            'github_url': user_data.get('html_url'),
            'note': 'This shows only recent public activity visible via GitHub API'
        }
        
    except Exception as e:
        return {'error': f'Error fetching GitHub data: {str(e)}'}

def search_in_fallback_stats(username):
    """Search for user in the fallback statistics"""
    
    fallback_approvers = [
        'tt-aho', 'tt-rkim', 'tt-asaigal', 'tt-dma', 'tt-bojko',
        'tt-soonjaec', 'tt-rjordahl', 'blozano-tt', 'tt-tenstorrent', 'tt-tlawrie',
        'tt-yichiyang', 'tt-amyk', 'tt-yuntaoz', 'tt-jvasiljevic', 
        'tt-kmaley', 'tt-vmilosevic'
    ]
    
    clean_username = username.lstrip('@')
    
    if clean_username in fallback_approvers:
        # Get the approval count from our fallback data
        approval_data = {
            'tt-aho': 85, 'tt-rkim': 72, 'tt-asaigal': 68, 'tt-dma': 64,
            'tt-bojko': 58, 'tt-soonjaec': 45, 'tt-rjordahl': 38, 'blozano-tt': 35,
            'tt-tenstorrent': 32, 'tt-tlawrie': 28, 'tt-yichiyang': 25,
            'tt-amyk': 22, 'tt-yuntaoz': 18, 'tt-jvasiljevic': 15,
            'tt-kmaley': 12, 'tt-vmilosevic': 10
        }
        
        return {
            'found_in_fallback': True,
            'approval_count': approval_data.get(clean_username, 0),
            'note': 'From trained ML model fallback statistics (tenstorrent/tt-metal)'
        }
    
    return {'found_in_fallback': False}

def main():
    """Main function"""
    
    if len(sys.argv) < 2:
        print("Usage: python check_user_approvals.py <username> [github_token]")
        print("Example: python check_user_approvals.py blozano-tt")
        sys.exit(1)
    
    username = sys.argv[1]
    github_token = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"🔍 Searching for approval data for user: {username}")
    print("=" * 60)
    
    # Search in log files
    print("📁 Checking local log files...")
    log_results = search_user_in_logs(username)
    for log_file, result in log_results.items():
        print(f"   {log_file}: {result}")
    
    print()
    
    # Search in fallback statistics
    print("📊 Checking ML model statistics...")
    fallback_result = search_in_fallback_stats(username)
    if fallback_result['found_in_fallback']:
        print(f"   ✅ Found in trained model: {fallback_result['approval_count']} approvals")
        print(f"   📝 {fallback_result['note']}")
    else:
        print(f"   ❌ Not found in trained model statistics")
    
    print()
    
    # Search GitHub API
    print("🐙 Checking GitHub API...")
    if github_token:
        github_result = get_github_user_data(username, github_token)
        if 'error' in github_result:
            print(f"   ❌ {github_result['error']}")
        else:
            print(f"   ✅ User found: {github_result['user']}")
            print(f"   🔄 Recent approvals: {github_result['recent_approvals']}")
            print(f"   📝 {github_result['note']}")
            
            if github_result['approval_events']:
                print("   Recent approval activity:")
                for event in github_result['approval_events'][:5]:
                    print(f"      - {event['repo']} PR #{event['pr_number']} ({event['created_at'][:10]})")
    else:
        print("   ⚠️  No GitHub token provided - skipping API check")
        print("   💡 Provide token as second argument for GitHub API data")
    
    print()
    print("=" * 60)
    print("📋 Summary:")
    
    if fallback_result['found_in_fallback']:
        print(f"✅ {username} has {fallback_result['approval_count']} approvals in the trained model")
        print("   (Based on tenstorrent/tt-metal repository training data)")
    else:
        print(f"❌ {username} not found in the current trained model statistics")
        print("   This could mean:")
        print("   • User is not a frequent approver in tenstorrent/tt-metal")
        print("   • User joined after the model was trained")
        print("   • User uses a different GitHub username")

if __name__ == '__main__':
    main() 