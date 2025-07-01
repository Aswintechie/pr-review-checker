# Version Management System

This document explains how version numbers are managed across the PR Approval Finder application.

## 🎯 Overview

We use a **centralized version management system** where the version is defined in one place and referenced everywhere else. This eliminates version drift and makes releases much easier to manage.

## 📍 Single Source of Truth

**Location:** `package.json` (root level)

```json
{
  "version": "7.0.0"
}
```

This is the **only place** where you should manually update the version number.

## 🔄 How It Works

### 1. Frontend (React App)
- **File:** `client/src/version.js`
- **Purpose:** Utility that imports version from root `package.json`
- **Usage:** Import and use `APP_VERSION_SHORT` or `APP_VERSION` in React components

```javascript
import { APP_VERSION_SHORT } from './version';

// Use in JSX
<span>v{APP_VERSION_SHORT}</span>
```

### 2. Static Files
- **Files:** README.md, Dockerfile, vercel.json, issue templates, etc.
- **Management:** Automated via sync script
- **Command:** `npm run sync-version`

## 🛠️ Updating Version

### Step 1: Update Root Package.json
```bash
# Edit the version in package.json
{
  "version": "7.1.0"  // <- Change this
}
```

### Step 2: Sync All Files
```bash
npm run sync-version
```

This automatically updates:
- ✅ `client/package.json`
- ✅ `server/package.json`
- ✅ `README.md` badge
- ✅ `vercel.json` environment variable
- ✅ `Dockerfile` label
- ✅ Issue templates

### Step 3: Commit Changes
```bash
git add .
git commit -m "Bump version to 7.1.0"
git tag v7.1.0
git push origin main --tags
```

## 📁 Files Managed

### Automatically Synced
| File | What Gets Updated |
|------|------------------|
| `client/package.json` | `version` field |
| `server/package.json` | `version` field |
| `README.md` | Version badge |
| `vercel.json` | `REACT_APP_VERSION` env var |
| `Dockerfile` | Version label |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Example version |

### Dynamically Referenced
| File | How Version is Used |
|------|-------------------|
| `client/src/App.js` | Developer modal, version button |
| `client/src/version.js` | Version utility (imports from root) |

### Manual Updates (Legacy)
These files no longer contain hardcoded versions:
- ✅ `client/src/App.css` - Version removed from comments
- ✅ `client/src/App.js` - Version removed from comments

## 🚀 Benefits

1. **Single Source of Truth**: Version defined in one place only
2. **No Version Drift**: All files stay in sync automatically  
3. **Easy Releases**: Update version once, sync everywhere
4. **Reduced Errors**: No more forgetting to update a file
5. **Automated Process**: Script handles all the tedious work

## 🔧 Version Sync Script

**Location:** `scripts/sync-version.js`

**Features:**
- ✅ Reads version from root `package.json`
- ✅ Updates all static files with regex patterns
- ✅ Provides detailed feedback on what was changed
- ✅ Error handling for missing files
- ✅ Summary report

**Usage:**
```bash
# Run directly
node scripts/sync-version.js

# Or use npm script
npm run sync-version
```

## 📊 Version Formats

- **Full Version:** `7.0.0` (used in package.json, badges, etc.)
- **Short Version:** `7.0` (used in UI displays, comments)

The script automatically handles both formats as needed.

## 🎯 Best Practices

1. **Always use the sync script** after updating the root version
2. **Review changes** with `git diff` before committing  
3. **Use semantic versioning** (MAJOR.MINOR.PATCH)
4. **Tag releases** with version numbers
5. **Update changelog** when bumping versions

## 🐛 Troubleshooting

### Script Fails to Update a File
1. Check if the file exists
2. Verify the regex pattern in `scripts/sync-version.js`
3. Check file permissions
4. Look at the error message for specific details

### Version Not Showing in UI
1. Restart the development server
2. Check if `client/src/version.js` exists
3. Verify the import in `App.js` is correct
4. Check browser console for import errors

### Manual Verification
To check if all versions are in sync:
```bash
# Search for version references
grep -r "7\.0" . --exclude-dir=node_modules --exclude-dir=.git

# Run sync script (dry run - it will report what needs updating)
npm run sync-version
```

## 📋 Checklist for Version Updates

- [ ] Update `package.json` version
- [ ] Run `npm run sync-version`
- [ ] Review changes with `git diff`
- [ ] Test the application
- [ ] Commit all changes
- [ ] Create git tag
- [ ] Push to repository
- [ ] Update release notes/changelog 