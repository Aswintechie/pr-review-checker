// Test file to demonstrate commit message validation
// This file can be used to test commits with different message formats

console.log("=== Commit Message Validation Test ===");

// Test scenarios:
// 1. Collaborator commits (any format allowed)
// 2. External contributor commits (structured format required)

const validFormats = [
  "feat: add new feature",
  "fix(auth): resolve login issue", 
  "docs: update README",
  "#123: implement user dashboard",
  "#456: fix memory leak"
];

const invalidFormats = [
  "quick fix",
  "updated stuff", 
  "WIP",
  "debugging",
  "small change"
];

console.log("✅ Valid formats for external contributors:");
validFormats.forEach(format => console.log(`  - "${format}"`));

console.log("\n❌ Invalid formats for external contributors:");
invalidFormats.forEach(format => console.log(`  - "${format}"`));

console.log("\n📝 Note: All formats above are valid for collaborators!");

// Export for potential testing
module.exports = {
  validFormats,
  invalidFormats
}; 