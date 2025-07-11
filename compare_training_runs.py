#!/usr/bin/env python3
"""
Compare PR numbers between training runs to verify duplicate detection
"""

import json
import os
from datetime import datetime

def compare_training_runs():
    """Compare current and previous training PR numbers"""
    
    current_file = 'training_pr_log.json'
    previous_file = 'training_pr_log_previous.json'
    
    if not os.path.exists(current_file):
        print("❌ No current training log found (training_pr_log.json)")
        return
    
    with open(current_file, 'r') as f:
        current = json.load(f)
    
    print(f"📊 Current Training Run:")
    print(f"  Date: {current['training_date']}")
    print(f"  Repository: {current['repo']}")
    print(f"  Total PRs: {current['total_prs']}")
    print(f"  PR Range: #{min(current['pr_numbers'])} to #{max(current['pr_numbers'])}")
    
    if os.path.exists(previous_file):
        with open(previous_file, 'r') as f:
            previous = json.load(f)
        
        print(f"\n📊 Previous Training Run:")
        print(f"  Date: {previous['training_date']}")
        print(f"  Repository: {previous['repo']}")
        print(f"  Total PRs: {previous['total_prs']}")
        print(f"  PR Range: #{min(previous['pr_numbers'])} to #{max(previous['pr_numbers'])}")
        
        # Compare PR numbers
        current_set = set(current['pr_numbers'])
        previous_set = set(previous['pr_numbers'])
        
        identical = current_set == previous_set
        new_prs = current_set - previous_set
        removed_prs = previous_set - current_set
        
        print(f"\n🔍 Comparison Results:")
        print(f"  Identical PR sets: {'✅ YES' if identical else '❌ NO'}")
        print(f"  New PRs in current: {len(new_prs)}")
        print(f"  PRs removed from current: {len(removed_prs)}")
        
        if new_prs:
            print(f"  New PR numbers: {sorted(list(new_prs))[:10]}{'...' if len(new_prs) > 10 else ''}")
        
        if removed_prs:
            print(f"  Removed PR numbers: {sorted(list(removed_prs))[:10]}{'...' if len(removed_prs) > 10 else ''}")
        
        if identical:
            print(f"\n✅ CONFIRMED: Training would use the exact same PRs!")
        else:
            print(f"\n⚠️  DIFFERENT: Training data has changed since last run")
    
    else:
        print(f"\n💡 No previous training log found")
        print(f"   Run training again to compare with this baseline")

def backup_current_log():
    """Backup current log as previous for next comparison"""
    if os.path.exists('training_pr_log.json'):
        os.rename('training_pr_log.json', 'training_pr_log_previous.json')
        print("💾 Backed up current log as previous")

if __name__ == "__main__":
    print("🔍 TRAINING RUN COMPARISON")
    print("=" * 50)
    compare_training_runs()
    
    backup_choice = input("\n💾 Backup current log for next comparison? (y/n): ")
    if backup_choice.lower() == 'y':
        backup_current_log() 