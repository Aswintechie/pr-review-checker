#!/usr/bin/env node

/**
 * Version Sync Script
 * Updates version numbers across all files to match the root package.json
 * 
 * Usage: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the current version from root package.json
const rootPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = rootPackageJson.version;
const currentVersionShort = currentVersion.split('.').slice(0, 2).join('.'); // e.g., "7.0"

console.log(`🔄 Syncing version to ${currentVersion} (short: ${currentVersionShort})`);

// Files to update with their update patterns
const filesToUpdate = [
  {
    file: 'client/package.json',
    updateFn: (content) => {
      const pkg = JSON.parse(content);
      pkg.version = currentVersion;
      return JSON.stringify(pkg, null, 2) + '\n';
    }
  },
  {
    file: 'server/package.json', 
    updateFn: (content) => {
      const pkg = JSON.parse(content);
      pkg.version = currentVersion;
      return JSON.stringify(pkg, null, 2) + '\n';
    }
  },
  {
    file: 'README.md',
    updateFn: (content) => {
      return content.replace(
        /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d\.]+/,
        `![Version](https://img.shields.io/badge/version-${currentVersion}`
      );
    }
  },
  {
    file: 'vercel.json',
    updateFn: (content) => {
      return content.replace(
        /"REACT_APP_VERSION": "[\d\.]+"/,
        `"REACT_APP_VERSION": "${currentVersion}"`
      );
    }
  },
  {
    file: 'Dockerfile',
    updateFn: (content) => {
      return content.replace(
        /LABEL version="[\d\.]+"/,
        `LABEL version="${currentVersion}"`
      );
    }
  },
  {
    file: '.github/ISSUE_TEMPLATE/bug_report.md',
    updateFn: (content) => {
      return content.replace(
        /- \*\*App Version\*\*: \[e\.g\. [\d\.]+\]/,
        `- **App Version**: [e.g. ${currentVersion}]`
      );
    }
  },
  {
    file: 'client/.env',
    updateFn: (content) => {
      // If file is empty or doesn't exist, create basic content
      if (!content || content.trim() === '') {
        return `# Environment variables for local development\n# This file is updated by the sync-version script\n\nREACT_APP_VERSION=${currentVersion}\n`;
      }
      
      // Create or update the REACT_APP_VERSION line
      if (content.includes('REACT_APP_VERSION=')) {
        return content.replace(
          /REACT_APP_VERSION=[\d\.]+/,
          `REACT_APP_VERSION=${currentVersion}`
        );
      } else {
        // Add the variable if it doesn't exist
        return content.trim() + '\n' + `REACT_APP_VERSION=${currentVersion}\n`;
      }
    }
  },
  {
    file: 'client/src/version.js',
    updateFn: (content) => {
      return content.replace(
        /const FALLBACK_VERSION = '[\d\.]+';/,
        `const FALLBACK_VERSION = '${currentVersion}';`
      );
    }
  }
];

// Process each file
let updatedCount = 0;
let errorCount = 0;
const updatedFiles = [];

filesToUpdate.forEach(({ file, updateFn }) => {
  try {
    let originalContent = '';
    if (fs.existsSync(file)) {
      originalContent = fs.readFileSync(file, 'utf8');
    } else if (file === 'client/.env') {
      // Create .env file if it doesn't exist
      console.log(`📄 Creating ${file}`);
    } else {
      console.log(`⚠️  Skipping ${file} (file not found)`);
      return;
    }

    const updatedContent = updateFn(originalContent);
    
    if (originalContent !== updatedContent) {
      fs.writeFileSync(file, updatedContent);
      console.log(`✅ Updated ${file}`);
      updatedCount++;
      updatedFiles.push(file);
    } else {
      console.log(`ℹ️  No changes needed for ${file}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    errorCount++;
  }
});

// Auto-stage updated files if this is running in a git repository
if (updatedFiles.length > 0) {
  try {
    // Check if we're in a git repository
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    
    // Stage only the files we modified
    const filesToStage = updatedFiles.join(' ');
    execSync(`git add ${filesToStage}`, { stdio: 'ignore' });
    console.log(`📦 Auto-staged updated files: ${updatedFiles.join(', ')}`);
  } catch (gitError) {
    console.log(`ℹ️  Not in a git repository or git staging failed - files updated but not staged`);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Updated: ${updatedCount} files`);
console.log(`   Errors: ${errorCount} files`);
console.log(`   Version: ${currentVersion}`);

if (errorCount > 0) {
  console.log(`\n⚠️  Some files had errors. Please check manually.`);
  process.exit(1);
} else {
  console.log(`\n🎉 All files synced successfully!`);
  
  if (updatedFiles.length > 0) {
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review the changes with: git diff --staged`);
    console.log(`   2. Updated files have been auto-staged for commit`);
  } else {
    console.log(`\n💡 All version references were already up to date.`);
  }
} 