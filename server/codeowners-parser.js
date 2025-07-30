/**
 * Custom CODEOWNERS parser that correctly handles /* pattern
 * The codeowners library has a bug where /* incorrectly matches subdirectory files
 */

const { minimatch } = require('minimatch');

class CustomCodeownersParser {
  constructor(codeownersContent) {
    this.rules = this.parseCodeowners(codeownersContent);
  }

  parseCodeowners(content) {
    const lines = content.split('\n');
    const rules = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Split on whitespace - first part is pattern, rest are owners
      const parts = line.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }

      const pattern = parts[0];
      const owners = parts.slice(1).filter(owner => owner.startsWith('@'));

      if (owners.length > 0) {
        rules.push({
          pattern,
          owners,
          lineNumber: i + 1,
          originalLine: line,
        });
      }
    }

    return rules;
  }

  getOwners(filePath) {
    // Find the last matching rule (CODEOWNERS precedence: last matching rule wins)
    let matchingRule = null;

    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];

      if (this.matchesPattern(rule.pattern, filePath)) {
        matchingRule = rule;
        break;
      }
    }

    return matchingRule ? matchingRule.owners : [];
  }

  matchesPattern(pattern, filePath) {
    // Handle the special case of /* pattern - should only match root files
    if (pattern === '/*') {
      // Only match files in the root directory (no slashes except at the beginning)
      return !filePath.includes('/') || filePath.split('/').length === 1;
    }

    // For directory patterns (ending with /), check if filePath starts with the pattern
    if (pattern.endsWith('/')) {
      return filePath.startsWith(pattern);
    }

    // For all other patterns, use minimatch
    return minimatch(filePath, pattern, { matchBase: false });
  }

  // Debug method to see what rule matches a file
  getMatchingRule(filePath) {
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];

      if (this.matchesPattern(rule.pattern, filePath)) {
        return rule;
      }
    }
    return null;
  }
}

module.exports = CustomCodeownersParser;
