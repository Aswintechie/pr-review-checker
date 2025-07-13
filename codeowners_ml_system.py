#!/usr/bin/env python3
"""
CODEOWNERS-Aware ML System for PR Approval Prediction
This system learns approval patterns within each CODEOWNERS group
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import json
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Tuple
import requests
import os
import re
from collections import defaultdict

class CodeownersMLPredictor:
    """
    ML system that learns approval patterns within CODEOWNERS groups.
    Each group gets specialized features and models.
    """
    
    def __init__(self):
        self.group_models = {}  # group_id -> RandomForestClassifier
        self.group_features = {}  # group_id -> feature names
        self.group_encoders = {}  # group_id -> label encoders
        self.group_scalers = {}  # group_id -> standard scalers
        self.codeowners_patterns = []  # parsed CODEOWNERS rules
        self.developer_stats = {}  # developer -> stats across groups
        self.group_developer_stats = {}  # group_id -> developer -> stats
        
        # Team approval model (separate from file-pattern-based models)
        self.team_models = {}  # team_name -> RandomForestClassifier
        self.team_features = {}  # team_name -> feature names
        self.team_encoders = {}  # team_name -> label encoders
        self.team_scalers = {}  # team_name -> standard scalers
        self.team_member_stats = {}  # team_name -> member -> approval stats
        
        self.is_trained = False
        self.training_date = None
        self.training_log_path = 'python_training_log.json'
        self.processed_prs = set()  # Track processed PR numbers
        
    def parse_codeowners(self, codeowners_content: str) -> List[Dict]:
        """
        Parse CODEOWNERS file into rules.
        
        Returns:
            List of rules: [{'pattern': str, 'owners': List[str], 'rule_index': int}]
        """
        rules = []
        lines = codeowners_content.strip().split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split()
            if len(parts) < 2:
                continue
                
            pattern = parts[0]
            owners = [owner.lstrip('@') for owner in parts[1:]]
            
            rules.append({
                'pattern': pattern,
                'owners': owners,
                'rule_index': i
            })
            
        print(f"📋 Parsed {len(rules)} CODEOWNERS rules")
        return rules
    
    def match_files_to_groups(self, files: List[str], codeowners_rules: List[Dict]) -> Dict[str, List[str]]:
        """
        Match files to CODEOWNERS groups.
        
        Returns:
            Dict mapping group_id to list of files
        """
        file_groups = defaultdict(list)
        
        for file_path in files:
            matched_rule = None
            
            # Find the last matching rule (CODEOWNERS uses last-match-wins)
            for rule in codeowners_rules:
                if self._matches_pattern(rule['pattern'], file_path):
                    matched_rule = rule
                    
            if matched_rule:
                # Create group ID from sorted owners
                group_id = '_'.join(sorted(matched_rule['owners']))
                file_groups[group_id].append(file_path)
                
        return dict(file_groups)
    
    def _matches_pattern(self, pattern: str, file_path: str) -> bool:
        """Check if a file matches a CODEOWNERS pattern"""
        # Convert CODEOWNERS pattern to regex
        regex_pattern = pattern.replace('.', r'\.')
        regex_pattern = regex_pattern.replace('*', '[^/]*')
        regex_pattern = regex_pattern.replace('[^/]*[^/]*', '.*')  # ** becomes .*
        
        # Handle directory patterns
        if pattern.endswith('/'):
            regex_pattern = regex_pattern + '.*'
            
        # Anchor the pattern
        if pattern.startswith('/'):
            regex_pattern = '^' + regex_pattern[1:]
        else:
            regex_pattern = f'(^|/){regex_pattern}'
            
        if not pattern.endswith('/') and '*' not in pattern:
            regex_pattern = regex_pattern + '(/|$)'
            
        try:
            return bool(re.match(regex_pattern, file_path))
        except re.error:
            return False
    
    def collect_codeowners_training_data(self, repo_owner: str, repo_name: str, token: str, months: int = 6, pr_limit: int = 1000) -> List[Dict]:
        """
        Collect training data specifically focused on CODEOWNERS groups.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            token: GitHub API token
            months: Number of months to look back (not used currently)
            pr_limit: Maximum number of PRs to collect
        """
        print(f"📊 Collecting CODEOWNERS-aware training data from {repo_owner}/{repo_name}...")
        print(f"🎯 PR limit: {pr_limit}")
        
        headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        
        # First, get CODEOWNERS file
        codeowners_content = self._fetch_codeowners(repo_owner, repo_name, headers)
        if not codeowners_content:
            raise ValueError("No CODEOWNERS file found in repository")
            
        self.codeowners_patterns = self.parse_codeowners(codeowners_content)
        
        # Get merged PRs
        training_data = []
        page = 1
        consecutive_skipped_pages = 0
        
        while len(training_data) < pr_limit and page <= 15:
            url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/pulls"
            params = {
                'state': 'closed',
                'sort': 'updated',
                'direction': 'desc',
                'per_page': 100,
                'page': page
            }
            
            response = requests.get(url, headers=headers, params=params)
            if response.status_code != 200:
                print(f"❌ GitHub API error: {response.status_code}")
                break
                
            prs = response.json()
            if not prs:
                break
            
            page_new_prs = 0
            page_skipped_prs = 0
                
            for pr in prs:
                # Stop if we've reached the limit
                if len(training_data) >= pr_limit:
                    break
                    
                if pr['merged_at']:
                    # Skip if already processed (early filter)
                    if pr['number'] in self.processed_prs:
                        page_skipped_prs += 1
                        if page_skipped_prs <= 3:  # Only show first few to avoid spam
                            print(f"  ⚠️ Skipped PR #{pr['number']}: already processed")
                        continue
                        
                    pr_data = self._extract_codeowners_features(pr, headers)
                    if pr_data:
                        training_data.append(pr_data)
                        page_new_prs += 1
                        # Track processed PR numbers
                        self.processed_prs.add(pr_data['pr_number'])
                        print(f"  ✅ Added PR #{pr_data['pr_number']}: {pr['title'][:50]}...")
            
            # Early termination if we're only hitting already-processed PRs
            if page_new_prs == 0 and page_skipped_prs > 0:
                consecutive_skipped_pages += 1
                print(f"📄 Page {page}: {page_new_prs} new, {page_skipped_prs} skipped")
                if consecutive_skipped_pages >= 3:
                    print(f"🛑 Early termination: {consecutive_skipped_pages} consecutive pages with no new PRs")
                    break
            else:
                consecutive_skipped_pages = 0
                print(f"📄 Page {page}: {page_new_prs} new, {page_skipped_prs} skipped, {len(training_data)} total")
                        
            page += 1
            
        print(f"✅ Collected {len(training_data)} CODEOWNERS-aware training samples (limit: {pr_limit})")
        return training_data
    
    def _fetch_codeowners(self, repo_owner: str, repo_name: str, headers: Dict) -> str:
        """Fetch CODEOWNERS file from repository"""
        paths = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']
        
        for path in paths:
            try:
                url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/{path}"
                response = requests.get(url, headers=headers)
                
                if response.status_code == 200:
                    content = response.json()
                    if content.get('content'):
                        import base64
                        return base64.b64decode(content['content']).decode('utf-8')
            except Exception as e:
                continue
                
        return None
    
    def _extract_codeowners_features(self, pr: Dict, headers: Dict) -> Dict:
        """Extract CODEOWNERS-specific features from a PR"""
        try:
            # Get files changed
            files_url = pr['url'] + '/files'
            files_response = requests.get(files_url, headers=headers)
            if files_response.status_code != 200:
                return None
                
            files = files_response.json()
            file_paths = [f['filename'] for f in files]
            
            # Get reviews
            reviews_url = pr['url'] + '/reviews'
            reviews_response = requests.get(reviews_url, headers=headers)
            if reviews_response.status_code != 200:
                return None
                
            reviews = reviews_response.json()
            approvers = [r['user']['login'] for r in reviews if r['state'] == 'APPROVED']
            
            # Match files to CODEOWNERS groups
            file_groups = self.match_files_to_groups(file_paths, self.codeowners_patterns)
            
            # Only include PRs that have files matching CODEOWNERS patterns
            if not file_groups:
                return None
                
            return {
                'pr_number': pr['number'],
                'files': file_paths,
                'file_groups': file_groups,  # This is the key CODEOWNERS data
                'approvers': approvers,
                'author': pr['user']['login'],
                'additions': pr.get('additions', 0),
                'deletions': pr.get('deletions', 0),
                'title': pr['title'],
                'created_at': pr['created_at'],
                'merged_at': pr['merged_at']
            }
            
        except Exception as e:
            print(f"⚠️ Error processing PR {pr['number']}: {e}")
            return None
    
    def engineer_group_features(self, pr_data: Dict, group_id: str, developer: str, 
                              all_training_data: List[Dict]) -> Dict:
        """
        Engineer features specific to a CODEOWNERS group.
        
        Args:
            pr_data: PR information
            group_id: CODEOWNERS group identifier
            developer: Developer username
            all_training_data: Historical data for calculating expertise
            
        Returns:
            Feature dictionary for this group
        """
        group_files = pr_data['file_groups'].get(group_id, [])
        all_files = pr_data['files']
        
        # Basic group features
        features = {
            'group_file_count': len(group_files),
            'group_file_ratio': len(group_files) / len(all_files) if all_files else 0,
            'total_file_count': len(all_files),
            'pr_size_additions': pr_data.get('additions', 0),
            'pr_size_deletions': pr_data.get('deletions', 0),
            'pr_total_changes': pr_data.get('additions', 0) + pr_data.get('deletions', 0),
            'pr_title_length': len(pr_data.get('title', '')),
        }
        
        # Developer expertise within this specific group
        dev_group_stats = self._calculate_developer_group_expertise(
            developer, group_id, all_training_data
        )
        features.update(dev_group_stats)
        
        # File pattern features within the group
        if group_files:
            extensions = [f.split('.')[-1].lower() for f in group_files if '.' in f]
            directories = ['/'.join(f.split('/')[:-1]) for f in group_files]
            
            features.update({
                'group_unique_extensions': len(set(extensions)),
                'group_unique_directories': len(set(directories)),
                'group_max_depth': max([len(f.split('/')) for f in group_files]) if group_files else 0,
                'group_has_tests': any('test' in f.lower() for f in group_files),
                'group_has_docs': any(f.endswith('.md') for f in group_files),
                'group_has_config': any(f.endswith(('.json', '.yaml', '.yml')) for f in group_files),
            })
        
        # Temporal features
        if pr_data.get('created_at'):
            created_dt = datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00'))
            features.update({
                'created_hour': created_dt.hour,
                'created_day_of_week': created_dt.weekday(),
                'created_month': created_dt.month,
            })
        
        return features
    
    def engineer_group_features_for_prediction(self, pr_data: Dict, group_id: str, developer: str) -> Dict:
        """
        Engineer features for prediction using stored developer statistics.
        
        Args:
            pr_data: PR information
            group_id: CODEOWNERS group identifier
            developer: Developer username
            
        Returns:
            Feature dictionary for this group
        """
        group_files = pr_data['file_groups'].get(group_id, [])
        all_files = pr_data['files']
        
        # Basic group features (same as training)
        features = {
            'group_file_count': len(group_files),
            'group_file_ratio': len(group_files) / len(all_files) if all_files else 0,
            'total_file_count': len(all_files),
            'pr_size_additions': pr_data.get('additions', 0),
            'pr_size_deletions': pr_data.get('deletions', 0),
            'pr_total_changes': pr_data.get('additions', 0) + pr_data.get('deletions', 0),
            'pr_title_length': len(pr_data.get('title', '')),
        }
        
        # Use stored developer statistics for this group
        if group_id in self.group_developer_stats and developer in self.group_developer_stats[group_id]:
            stored_stats = self.group_developer_stats[group_id][developer]
            features.update(stored_stats)
        else:
            # Fallback to default values if no stored stats
            features.update({
                'dev_group_approval_count': 0,
                'dev_group_appearance_count': 0,
                'dev_group_approval_rate': 0,
                'dev_group_file_experience': 0,
                'dev_group_experience_score': 0,
            })
        
        # File pattern features within the group (same as training)
        if group_files:
            extensions = [f.split('.')[-1].lower() for f in group_files if '.' in f]
            directories = ['/'.join(f.split('/')[:-1]) for f in group_files]
            
            features.update({
                'group_unique_extensions': len(set(extensions)),
                'group_unique_directories': len(set(directories)),
                'group_max_depth': max([len(f.split('/')) for f in group_files]) if group_files else 0,
                'group_has_tests': any('test' in f.lower() for f in group_files),
                'group_has_docs': any(f.endswith('.md') for f in group_files),
                'group_has_config': any(f.endswith(('.json', '.yaml', '.yml')) for f in group_files),
            })
        
        # Temporal features (same as training)
        if pr_data.get('created_at'):
            created_dt = datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00'))
            features.update({
                'created_hour': created_dt.hour,
                'created_day_of_week': created_dt.weekday(),
                'created_month': created_dt.month,
            })
        
        return features
    
    def _calculate_developer_group_expertise(self, developer: str, group_id: str, 
                                           historical_data: List[Dict]) -> Dict:
        """Calculate developer's expertise within a specific CODEOWNERS group"""
        group_approvals = 0
        group_appearances = 0
        similar_file_count = 0
        
        # Look at historical data for this developer and group
        for pr_data in historical_data:
            if group_id in pr_data.get('file_groups', {}):
                group_appearances += 1
                
                if developer in pr_data.get('approvers', []):
                    group_approvals += 1
                    
                # Count similar files this developer has worked on
                group_files = pr_data['file_groups'][group_id]
                similar_file_count += len(group_files)
        
        return {
            'dev_group_approval_count': group_approvals,
            'dev_group_appearance_count': group_appearances,
            'dev_group_approval_rate': group_approvals / group_appearances if group_appearances > 0 else 0,
            'dev_group_file_experience': similar_file_count,
            'dev_group_experience_score': (group_approvals * 2 + similar_file_count) / 10.0,
        }
    
    def prepare_group_training_data(self, raw_data: List[Dict]) -> Dict[str, Tuple]:
        """
        Prepare training data for each CODEOWNERS group.
        
        Returns:
            Dict mapping group_id to (X, y) training data
        """
        group_datasets = {}
        
        # Collect all developers who appear in the data
        all_developers = set()
        for pr_data in raw_data:
            all_developers.update(pr_data.get('approvers', []))
            all_developers.add(pr_data.get('author', ''))
        
        # For each group, create training samples
        for group_id in self._get_all_group_ids(raw_data):
            print(f"📊 Preparing training data for group: {group_id}")
            
            group_samples = []
            group_labels = []
            
            # For each PR that affects this group
            for pr_data in raw_data:
                if group_id in pr_data.get('file_groups', {}):
                    approvers = set(pr_data.get('approvers', []))
                    
                    # Get group owners
                    group_owners = group_id.split('_')
                    
                    # Create positive samples (developers who approved)
                    for approver in approvers:
                        if approver in group_owners:  # Only consider group owners
                            features = self.engineer_group_features(
                                pr_data, group_id, approver, raw_data
                            )
                            group_samples.append(features)
                            group_labels.append(1)  # approved
                    
                    # Create negative samples (group owners who didn't approve)
                    for owner in group_owners:
                        if owner not in approvers:
                            features = self.engineer_group_features(
                                pr_data, group_id, owner, raw_data
                            )
                            group_samples.append(features)
                            group_labels.append(0)  # didn't approve
            
            # Check if we have enough samples and sufficient balance for both classes
            positive_samples = sum(group_labels)
            negative_samples = len(group_labels) - positive_samples
            
            if (len(group_samples) >= 20 and 
                positive_samples >= 3 and 
                negative_samples >= 3):  # Need at least 3 of each class for proper training
                
                # Convert to DataFrame for easier handling
                df = pd.DataFrame(group_samples)
                
                # Handle missing values
                df = df.fillna(0)
                
                # Store feature names for this group
                self.group_features[group_id] = df.columns.tolist()
                
                # Prepare X and y
                X = df.values
                y = np.array(group_labels)
                
                group_datasets[group_id] = (X, y)
                print(f"✅ Group {group_id}: {len(X)} samples, {positive_samples} positive, {negative_samples} negative")
            else:
                print(f"⚠️ Group {group_id}: Insufficient samples for training")
                print(f"   Total: {len(group_samples)}, Positive: {positive_samples}, Negative: {negative_samples}")
                print(f"   Need: ≥20 total, ≥3 positive, ≥3 negative")
        
        return group_datasets
    
    def _get_all_group_ids(self, raw_data: List[Dict]) -> set:
        """Get all unique group IDs from training data"""
        group_ids = set()
        for pr_data in raw_data:
            group_ids.update(pr_data.get('file_groups', {}).keys())
        return group_ids
    
    def _store_group_developer_stats(self, group_id: str, raw_data: List[Dict]):
        """Store developer statistics for a specific group"""
        group_owners = group_id.split('_')
        group_stats = {}
        
        for developer in group_owners:
            stats = self._calculate_developer_group_expertise(developer, group_id, raw_data)
            group_stats[developer] = stats
            
        self.group_developer_stats[group_id] = group_stats
        print(f"📊 Stored stats for {len(group_stats)} developers in group {group_id}")
        
        # Print individual developer stats for debugging
        for dev, stats in group_stats.items():
            approval_rate = stats.get('dev_group_approval_rate', 0)
            approval_count = stats.get('dev_group_approval_count', 0)
            print(f"   {dev}: {approval_count} approvals, {approval_rate:.2%} rate")
    
    def prepare_team_training_data(self, raw_data: List[Dict]) -> Dict[str, Tuple]:
        """
        Prepare training data for team-based approval models.
        This model learns who approves more within teams, regardless of file patterns.
        
        Args:
            raw_data: List of PR data from collect_codeowners_training_data
            
        Returns:
            Dict mapping team names to (features, labels) tuples
        """
        team_datasets = {}
        
        # Get all teams (entries with '/' in the name)
        all_teams = set()
        for pr_data in raw_data:
            file_groups = pr_data.get('file_groups', {})
            for group_id in file_groups.keys():
                group_owners = group_id.split('_')
                for owner in group_owners:
                    if '/' in owner:  # Team identifier
                        all_teams.add(owner)
        
        print(f"📊 Found {len(all_teams)} teams for training: {list(all_teams)}")
        
        # For each team, prepare training data
        for team_name in all_teams:
            team_samples = []
            team_labels = []
            
            # Get team members (would need to be fetched from GitHub API in real implementation)
            # For now, we'll use a simplified approach - extract members from historical approvals
            team_members = set()
            for pr_data in raw_data:
                approvers = pr_data.get('approvers', [])
                file_groups = pr_data.get('file_groups', {})
                
                # Check if this PR has files that belong to this team
                team_has_files = False
                for group_id in file_groups.keys():
                    if team_name in group_id.split('_'):
                        team_has_files = True
                        break
                
                if team_has_files:
                    # Add all approvers as potential team members
                    for approver in approvers:
                        if approver and isinstance(approver, str):
                            clean_approver = approver.strip().lstrip('@')
                            if clean_approver and '/' not in clean_approver:  # Individual, not team
                                team_members.add(clean_approver)
            
            print(f"🎯 Team {team_name}: Found {len(team_members)} potential members")
            
            if len(team_members) < 2:
                print(f"⚠️ Team {team_name}: Too few members ({len(team_members)}), skipping")
                continue
            
            # Create training samples for each PR where this team is involved
            for pr_data in raw_data:
                file_groups = pr_data.get('file_groups', {})
                approvers = set(pr_data.get('approvers', []))
                
                # Check if this team is involved in this PR
                team_involved = False
                for group_id in file_groups.keys():
                    if team_name in group_id.split('_'):
                        team_involved = True
                        break
                
                if not team_involved:
                    continue
                
                # Create samples for each team member
                for member in team_members:
                    features = self.engineer_team_features(pr_data, team_name, member, raw_data)
                    
                    # Label: 1 if member approved, 0 if not
                    label = 1 if member in approvers else 0
                    
                    team_samples.append(features)
                    team_labels.append(label)
            
            # Check if we have enough samples for training
            if len(team_samples) < 20:
                print(f"⚠️ Team {team_name}: Insufficient samples ({len(team_samples)}), need ≥20")
                continue
            
            positive_samples = sum(team_labels)
            negative_samples = len(team_labels) - positive_samples
            
            # Need at least 3 positive and 3 negative samples for balanced training
            if positive_samples < 3 or negative_samples < 3:
                print(f"⚠️ Team {team_name}: Unbalanced samples (pos:{positive_samples}, neg:{negative_samples})")
                continue
            
            # Convert to arrays
            X = np.array([list(sample.values()) for sample in team_samples])
            y = np.array(team_labels)
            
            # Store feature names for this team
            self.team_features[team_name] = list(team_samples[0].keys())
            
            # Store team member stats
            self._store_team_member_stats(team_name, raw_data, team_members)
            
            team_datasets[team_name] = (X, y)
            print(f"✅ Team {team_name}: {len(X)} samples, {positive_samples} positive, {negative_samples} negative")
        
        return team_datasets
    
    def engineer_team_features(self, pr_data: Dict, team_name: str, member: str, all_training_data: List[Dict]) -> Dict:
        """
        Engineer features for team-based approval prediction.
        Focus on approval frequency and patterns, not file patterns.
        
        Args:
            pr_data: Current PR data
            team_name: Team name (e.g., 'org/team')
            member: Team member username
            all_training_data: All historical training data
            
        Returns:
            Dict of engineered features
        """
        features = {}
        
        # Basic PR features
        features['pr_additions'] = pr_data.get('additions', 0)
        features['pr_deletions'] = pr_data.get('deletions', 0)
        features['pr_total_changes'] = features['pr_additions'] + features['pr_deletions']
        features['pr_file_count'] = len(pr_data.get('files', []))
        
        # Member's historical approval behavior (across all PRs)
        member_approvals = 0
        member_pr_appearances = 0
        member_total_prs = 0
        
        for historical_pr in all_training_data:
            member_total_prs += 1
            approvers = historical_pr.get('approvers', [])
            
            # Check if this member could have approved (team was involved)
            file_groups = historical_pr.get('file_groups', {})
            team_involved = False
            for group_id in file_groups.keys():
                if team_name in group_id.split('_'):
                    team_involved = True
                    break
            
            if team_involved:
                member_pr_appearances += 1
                if member in approvers:
                    member_approvals += 1
        
        # Member approval statistics
        features['member_total_approvals'] = member_approvals
        features['member_pr_appearances'] = member_pr_appearances
        features['member_approval_rate'] = member_approvals / member_pr_appearances if member_pr_appearances > 0 else 0
        features['member_approval_frequency'] = member_approvals / member_total_prs if member_total_prs > 0 else 0
        
        # Team context features
        features['team_member_count'] = len(self.team_member_stats.get(team_name, {}))
        
        # Time-based features (if available)
        if 'created_at' in pr_data:
            # Could add time-based features here (day of week, time of day, etc.)
            pass
        
        return features
    
    def _store_team_member_stats(self, team_name: str, raw_data: List[Dict], team_members: set):
        """Store team member statistics for prediction"""
        team_stats = {}
        
        for member in team_members:
            approvals = 0
            appearances = 0
            
            for pr_data in raw_data:
                file_groups = pr_data.get('file_groups', {})
                approvers = pr_data.get('approvers', [])
                
                # Check if team was involved
                team_involved = False
                for group_id in file_groups.keys():
                    if team_name in group_id.split('_'):
                        team_involved = True
                        break
                
                if team_involved:
                    appearances += 1
                    if member in approvers:
                        approvals += 1
            
            team_stats[member] = {
                'total_approvals': approvals,
                'team_appearances': appearances,
                'team_approval_rate': approvals / appearances if appearances > 0 else 0,
            }
        
        self.team_member_stats[team_name] = team_stats
        print(f"📊 Stored stats for {len(team_stats)} members in team {team_name}")
    
    def engineer_team_features_for_prediction(self, pr_data: Dict, team_name: str, member: str) -> Dict:
        """
        Engineer features for team-based prediction (similar to training but uses stored stats).
        
        Args:
            pr_data: Current PR data
            team_name: Team name (e.g., 'org/team')
            member: Team member username
            
        Returns:
            Dict of engineered features
        """
        features = {}
        
        # Basic PR features
        features['pr_additions'] = pr_data.get('additions', 0)
        features['pr_deletions'] = pr_data.get('deletions', 0)
        features['pr_total_changes'] = features['pr_additions'] + features['pr_deletions']
        features['pr_file_count'] = len(pr_data.get('files', []))
        
        # Use stored member statistics if available
        if team_name in self.team_member_stats and member in self.team_member_stats[team_name]:
            member_stats = self.team_member_stats[team_name][member]
            features['member_total_approvals'] = member_stats.get('total_approvals', 0)
            features['member_pr_appearances'] = member_stats.get('team_appearances', 0)
            features['member_approval_rate'] = member_stats.get('team_approval_rate', 0)
            features['member_approval_frequency'] = member_stats.get('team_approval_rate', 0)  # Using rate as proxy
        else:
            # Fallback to default values
            features['member_total_approvals'] = 0
            features['member_pr_appearances'] = 0
            features['member_approval_rate'] = 0
            features['member_approval_frequency'] = 0
        
        # Team context features
        features['team_member_count'] = len(self.team_member_stats.get(team_name, {}))
        
        return features
    
    def train(self, repo_owner: str, repo_name: str, token: str, months: int = 6, pr_limit: int = 1000) -> Dict:
        """
        Train CODEOWNERS-aware ML models.
        
        Args:
            repo_owner: Repository owner
            repo_name: Repository name
            token: GitHub API token
            months: Number of months to look back (not used currently)
            pr_limit: Maximum number of PRs to collect and train on
        
        Returns:
            Training summary statistics
        """
        print(f"🚀 Starting CODEOWNERS-aware ML training for {repo_owner}/{repo_name}")
        
        # Load training log
        log_data = self.load_training_log()
        self.processed_prs = set(log_data.get('processed_prs', []))
        
        # Collect training data (already filtered during collection)
        new_prs = self.collect_codeowners_training_data(repo_owner, repo_name, token, months, pr_limit)
        
        # Check if there are new PRs to process
        if len(new_prs) == 0:
            print("✅ No new PRs to train on - skipping training")
            print("💡 Model is already up to date with latest PRs")
            return {
                'trained_groups': len(self.group_models),
                'total_samples': 0,
                'training_date': self.training_date,
                'group_models': list(self.group_models.keys()),
                'codeowners_rules': len(self.codeowners_patterns),
                'message': 'No new PRs found - training skipped'
            }
        
        # Log all PR numbers for verification
        pr_numbers = [pr['pr_number'] for pr in new_prs]
        print(f"🔍 Training on PR numbers: {sorted(pr_numbers[:10])}..." + (f" and {len(pr_numbers)-10} more" if len(pr_numbers) > 10 else ""))
        print(f"📊 PR range: #{min(pr_numbers)} to #{max(pr_numbers)}")
        
        # Save PR numbers to file for comparison between training runs
        import json
        pr_log = {
            'training_date': datetime.now().isoformat(),
            'repo': f"{repo_owner}/{repo_name}",
            'pr_numbers': sorted(pr_numbers),
            'total_prs': len(pr_numbers)
        }
        with open('training_pr_log.json', 'w') as f:
            json.dump(pr_log, f, indent=2)
        print(f"💾 Saved PR numbers to training_pr_log.json")
        
        # Prepare group-specific training data
        group_datasets = self.prepare_group_training_data(new_prs)
        
        # Train a model for each group
        trained_groups = 0
        total_samples = 0
        
        for group_id, (X, y) in group_datasets.items():
            print(f"🧠 Training model for group: {group_id}")
            
            # Split data - use stratification only if we have enough samples of each class
            min_class_count = min(np.bincount(y))
            if min_class_count >= 2:  # Need at least 2 samples of each class for stratification
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
            else:
                # Don't stratify if classes are too small
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                class_weight='balanced'
            )
            
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_score = model.score(X_train_scaled, y_train)
            test_score = model.score(X_test_scaled, y_test)
            
            print(f"📊 Group {group_id}: Train={train_score:.3f}, Test={test_score:.3f}")
            
            # Store model and preprocessing
            self.group_models[group_id] = model
            self.group_scalers[group_id] = scaler
            
            # Store developer statistics for this group
            self._store_group_developer_stats(group_id, new_prs)
            
            trained_groups += 1
            total_samples += len(X)
        
        # Train team-based models
        print(f"🚀 Starting team-based model training...")
        team_datasets = self.prepare_team_training_data(new_prs)
        
        trained_teams = 0
        team_samples = 0
        
        for team_name, (X, y) in team_datasets.items():
            print(f"🧠 Training team model for: {team_name}")
            
            # Split data - use stratification only if we have enough samples of each class
            min_class_count = min(np.bincount(y))
            if min_class_count >= 2:  # Need at least 2 samples of each class for stratification
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
            else:
                # Don't stratify if classes are too small
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                random_state=42,
                class_weight='balanced'
            )
            
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_score = model.score(X_train_scaled, y_train)
            test_score = model.score(X_test_scaled, y_test)
            
            print(f"📊 Team {team_name}: Train={train_score:.3f}, Test={test_score:.3f}")
            
            # Store model and preprocessing
            self.team_models[team_name] = model
            self.team_scalers[team_name] = scaler
            
            trained_teams += 1
            team_samples += len(X)
        
        self.is_trained = True
        self.training_date = datetime.now().isoformat()
        
        summary = {
            'trained_groups': trained_groups,
            'trained_teams': trained_teams,
            'total_samples': total_samples,
            'team_samples': team_samples,
            'training_date': self.training_date,
            'group_models': list(self.group_models.keys()),
            'team_models': list(self.team_models.keys()),
            'codeowners_rules': len(self.codeowners_patterns),
            'pr_limit': pr_limit,
            'new_prs_processed': len(new_prs)
        }
        
        print(f"✅ Training complete! Trained {trained_groups} group models on {total_samples} samples")
        print(f"✅ Team training complete! Trained {trained_teams} team models on {team_samples} samples")
        
        # Save training log
        self.save_training_log(summary)
        return summary
    
    def predict_approvers(self, files: List[str], top_k: int = 5) -> List[Dict]:
        """
        Predict approvers for given files using CODEOWNERS group models.
        
        Args:
            files: List of file paths
            top_k: Number of top predictions to return
            
        Returns:
            List of predictions with confidence scores
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet")
            
        if not self.codeowners_patterns:
            raise ValueError("No CODEOWNERS patterns available")
        
        # Match files to groups
        file_groups = self.match_files_to_groups(files, self.codeowners_patterns)
        
        if not file_groups:
            print("⚠️ No files match any CODEOWNERS patterns", file=sys.stderr)
            return []
        
        # Suppress print statements for API mode
        # print(f"📊 Files matched to {len(file_groups)} CODEOWNERS groups")
        
        # Get predictions from each group
        developer_scores = defaultdict(float)
        
        for group_id, group_files in file_groups.items():
            if group_id in self.group_models:
                # Create dummy PR data for feature engineering
                dummy_pr = {
                    'files': files,
                    'file_groups': {group_id: group_files},
                    'additions': 100,  # reasonable defaults
                    'deletions': 50,
                    'title': 'Test PR',
                    'created_at': datetime.now().isoformat()
                }
                
                # Get group owners
                group_owners = group_id.split('_')
                
                # Predict for each owner in this group
                for owner in group_owners:
                    try:
                        if '/' in owner:
                            # This is a team - use team model
                            if owner in self.team_models:
                                # Get team members and predict for each
                                team_members = self.team_member_stats.get(owner, {}).keys()
                                for member in team_members:
                                    try:
                                        # Use team features for prediction
                                        features = self.engineer_team_features_for_prediction(
                                            dummy_pr, owner, member
                                        )
                                        
                                        # Convert to array
                                        feature_array = np.array([list(features.values())])
                                        
                                        # Scale features
                                        scaler = self.team_scalers[owner]
                                        feature_array_scaled = scaler.transform(feature_array)
                                        
                                        # Get prediction probability
                                        model = self.team_models[owner]
                                        prob = model.predict_proba(feature_array_scaled)[0]
                                        
                                        # Use probability of approval (class 1)
                                        approval_prob = prob[1] if len(prob) > 1 else prob[0]
                                        
                                        # Weight by number of files in this group
                                        weight = len(group_files) / len(files)
                                        developer_scores[member] += approval_prob * weight
                                        
                                    except Exception as e:
                                        print(f"⚠️ Error predicting for team member {member} in {owner}: {e}", file=sys.stderr)
                                        continue
                            else:
                                print(f"⚠️ Team {owner} has no trained model, skipping", file=sys.stderr)
                        else:
                            # This is an individual codeowner - use group model
                            features = self.engineer_group_features_for_prediction(
                                dummy_pr, group_id, owner
                            )
                            
                            # Convert to array
                            feature_array = np.array([list(features.values())])
                            
                            # Scale features
                            scaler = self.group_scalers[group_id]
                            feature_array_scaled = scaler.transform(feature_array)
                            
                            # Get prediction probability
                            model = self.group_models[group_id]
                            prob = model.predict_proba(feature_array_scaled)[0]
                            
                            # Use probability of approval (class 1)
                            approval_prob = prob[1] if len(prob) > 1 else prob[0]
                            
                            # Weight by number of files in this group
                            weight = len(group_files) / len(files)
                            developer_scores[owner] += approval_prob * weight
                        
                    except Exception as e:
                        print(f"⚠️ Error predicting for {owner} in group {group_id}: {e}", file=sys.stderr)
                        continue
            else:
                # Group doesn't have a trained model - skip this group
                print(f"⚠️ Group {group_id} has no trained model, skipping", file=sys.stderr)
                continue
        
        # Sort by score and return top predictions
        sorted_predictions = sorted(
            developer_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        predictions = []
        for developer, score in sorted_predictions[:top_k]:
            # Determine which model(s) were used for this developer
            reasoning_parts = []
            
            # Check if this developer appears in any group models
            group_count = 0
            for group_id in file_groups.keys():
                if group_id in self.group_models:
                    group_owners = group_id.split('_')
                    if developer in group_owners:
                        group_count += 1
            
            # Check if this developer appears in any team models
            team_count = 0
            for group_id in file_groups.keys():
                group_owners = group_id.split('_')
                for owner in group_owners:
                    if '/' in owner and owner in self.team_models:
                        team_members = self.team_member_stats.get(owner, {}).keys()
                        if developer in team_members:
                            team_count += 1
            
            if group_count > 0 and team_count > 0:
                reasoning_parts.append(f"CODEOWNERS group model ({group_count} groups)")
                reasoning_parts.append(f"team approval model ({team_count} teams)")
            elif group_count > 0:
                reasoning_parts.append(f"CODEOWNERS group model ({group_count} groups)")
            elif team_count > 0:
                reasoning_parts.append(f"team approval model ({team_count} teams)")
            else:
                reasoning_parts.append("unknown model")
            
            predictions.append({
                'approver': developer,
                'confidence': min(score * 100, 100),  # Convert to percentage, cap at 100
                'probability': score,
                'reasoning': f"ML prediction from {' and '.join(reasoning_parts)}"
            })
        
        # Suppress print statements for API mode
        # print(f"✅ Generated {len(predictions)} predictions using CODEOWNERS group models")
        return predictions
    
    def save_model(self, filepath: str):
        """Save the trained models to disk"""
        model_data = {
            'group_models': {gid: model for gid, model in self.group_models.items()},
            'group_features': self.group_features,
            'group_scalers': self.group_scalers,
            'group_developer_stats': self.group_developer_stats,
            'team_models': {tid: model for tid, model in self.team_models.items()},
            'team_features': self.team_features,
            'team_scalers': self.team_scalers,
            'team_member_stats': self.team_member_stats,
            'codeowners_patterns': self.codeowners_patterns,
            'is_trained': self.is_trained,
            'training_date': self.training_date
        }
        
        joblib.dump(model_data, filepath)
        print(f"💾 Saved CODEOWNERS ML model with {len(self.group_models)} group models and {len(self.team_models)} team models to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained models from disk"""
        model_data = joblib.load(filepath)
        
        self.group_models = model_data['group_models']
        self.group_features = model_data['group_features']
        self.group_scalers = model_data['group_scalers']
        self.group_developer_stats = model_data.get('group_developer_stats', {})
        self.team_models = model_data.get('team_models', {})
        self.team_features = model_data.get('team_features', {})
        self.team_scalers = model_data.get('team_scalers', {})
        self.team_member_stats = model_data.get('team_member_stats', {})
        self.codeowners_patterns = model_data['codeowners_patterns']
        self.is_trained = model_data['is_trained']
        self.training_date = model_data['training_date']
        
        # Suppress print statements for API mode
        # print(f"📖 Loaded CODEOWNERS ML model from {filepath}")
        # print(f"🎯 Model has {len(self.group_models)} trained groups and {len(self.team_models)} trained teams")

    def load_training_log(self) -> Dict:
        """Load training log from disk"""
        try:
            if os.path.exists(self.training_log_path):
                with open(self.training_log_path, 'r') as f:
                    log = json.load(f)
                    self.processed_prs = set(log.get('processed_prs', []))
                    print(f"📋 Loaded training log: {len(self.processed_prs)} PRs processed")
                    return log
        except Exception as e:
            print(f"⚠️ Error loading training log: {e}")
        return {'processed_prs': [], 'last_training_date': None}

    def save_training_log(self, training_summary: Dict):
        """Save training log to disk"""
        try:
            log = {
                'last_training_date': datetime.now().isoformat(),
                'processed_prs': list(self.processed_prs),
                'total_processed_prs': len(self.processed_prs),
                'training_summary': training_summary
            }
            with open(self.training_log_path, 'w') as f:
                json.dump(log, f, indent=2)
            print(f"💾 Saved training log to {self.training_log_path}")
        except Exception as e:
            print(f"⚠️ Error saving training log: {e}")

    def filter_new_prs(self, all_prs: List[Dict]) -> List[Dict]:
        """Filter out already processed PRs"""
        new_prs = []
        for pr in all_prs:
            if pr['pr_number'] not in self.processed_prs:
                new_prs.append(pr)
        
        print(f"🔍 PR Analysis:")
        print(f"   📊 Total PRs from API: {len(all_prs)}")
        print(f"   📋 Previously processed: {len(self.processed_prs)}")
        print(f"   🆕 New PRs to process: {len(new_prs)}")
        
        return new_prs

# Example usage
if __name__ == "__main__":
    predictor = CodeownersMLPredictor()
    
    # Train the model
    # predictor.train("tenstorrent", "tt-metal", "your_token_here")
    
    # Save the model
    # predictor.save_model("codeowners_ml_model.pkl")
    
    # Load and use the model
    # predictor.load_model("codeowners_ml_model.pkl")
    # predictions = predictor.predict_approvers(["tt_metal/hw/inc/tensix.h", "tests/test_basic.py"])
    # print(predictions) 