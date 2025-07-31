#!/usr/bin/env python3
"""
Python CODEOWNERS parser bridge for PR Approval Finder
Uses the 'codeowners' package instead of custom JavaScript parser
"""

import sys
import json
import argparse
from typing import List, Dict, Any, Tuple

def install_and_import():
    """Install and import the codeowners package"""
    try:
        from codeowners import CodeOwners
        return CodeOwners
    except ImportError:
        print("Installing codeowners package...", file=sys.stderr)
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "codeowners"])
        from codeowners import CodeOwners
        return CodeOwners

def parse_codeowners_python(codeowners_content: str, changed_files: List[str]) -> List[Dict[str, Any]]:
    """
    Parse CODEOWNERS content using Python package and return results for changed files
    
    Args:
        codeowners_content: Raw CODEOWNERS file content
        changed_files: List of file paths to check
    
    Returns:
        List of dictionaries with file ownership information
    """
    CodeOwners = install_and_import()
    
    try:
        # Create parser instance
        owners_parser = CodeOwners(codeowners_content)
        
        results = []
        for file_path in changed_files:
            try:
                # Get owners for this file - returns list of tuples like [('USERNAME', '@user')]
                owners_raw = owners_parser.of(file_path)
                
                # Extract just the owner names (remove @ prefix and convert to list)
                owners = []
                matching_rule = None
                
                if owners_raw:
                    for owner_type, owner_name in owners_raw:
                        if owner_name.startswith('@'):
                            owners.append(owner_name)  # Keep @ prefix for consistency
                    
                    # Try to find which rule matched (this is a limitation of the library)
                    matching_rule = "Pattern matched by codeowners library"
                
                results.append({
                    "file": file_path,
                    "owners": owners,
                    "matchingRule": matching_rule,
                    "ruleIndex": -1  # Library doesn't provide rule index
                })
                
            except Exception as file_error:
                # Handle individual file errors
                results.append({
                    "file": file_path,
                    "owners": [],
                    "matchingRule": None,
                    "ruleIndex": -1,
                    "error": str(file_error)
                })
        
        return results
        
    except Exception as e:
        # Return empty results for all files if parsing fails
        return [
            {
                "file": file_path,
                "owners": [],
                "matchingRule": None,
                "ruleIndex": -1,
                "error": f"Parser error: {str(e)}"
            }
            for file_path in changed_files
        ]

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description='Parse CODEOWNERS using Python package')
    parser.add_argument('--codeowners', required=True, help='CODEOWNERS file content')
    parser.add_argument('--files', required=True, help='JSON array of files to check')
    
    args = parser.parse_args()
    
    try:
        # Parse input
        files = json.loads(args.files)
        codeowners_content = args.codeowners
        
        # Process files
        results = parse_codeowners_python(codeowners_content, files)
        
        # Output results as JSON
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()