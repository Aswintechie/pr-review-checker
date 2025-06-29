# Code Style and Formatting

This project uses **Prettier** and **ESLint** to maintain consistent code quality and formatting.

## Tools Setup

### Prettier
- **Purpose**: Code formatting
- **Config**: `.prettierrc` files in both `client/` and `server/`
- **Settings**: Single quotes, semicolons, 100 character line width, 2-space tabs

### ESLint
- **Purpose**: Code linting and quality checks
- **Config**: `.eslintrc.js` files in both `client/` and `server/`
- **Rules**: React best practices, modern JavaScript patterns, Prettier integration

## Available Scripts

### Root Level (runs on both client and server)
```bash
npm run lint          # Check for linting issues
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check if code is formatted
npm run code:fix      # Run lint:fix + format (complete cleanup)
```

### Client Only
```bash
cd client && npm run lint          # React-specific linting
cd client && npm run lint:fix      # Auto-fix React issues
cd client && npm run format        # Format React code
cd client && npm run code:fix      # Complete client cleanup
```

### Server Only
```bash
cd server && npm run lint          # Node.js-specific linting
cd server && npm run lint:fix      # Auto-fix Node.js issues
cd server && npm run format        # Format server code
cd server && npm run code:fix      # Complete server cleanup
```

## Configuration Details

### Client Configuration
- **ESLint**: React hooks, JSX best practices, no unused variables
- **Prettier**: JSX single quotes, React-friendly formatting
- **Rules**: Console warnings allowed (useful for debugging)

### Server Configuration
- **ESLint**: Node.js environment, modern JavaScript patterns
- **Prettier**: Server-side formatting standards
- **Rules**: Console statements allowed (server logging), prefer const/template literals

## Usage Workflow

1. **Before committing**: Run `npm run code:fix` to ensure all code is properly formatted and linted
2. **During development**: Use `npm run lint` to check for issues
3. **CI/CD**: Can integrate `npm run format:check` and `npm run lint` for automated checks

## IDE Integration

### VS Code
Install these extensions for automatic formatting:
- **Prettier - Code formatter**
- **ESLint**

Add to VS Code settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.autoFixOnSave": true
}
```

### Other IDEs
Most modern IDEs support Prettier and ESLint through plugins.

## Automated Pre-commit Hooks

The project includes automated pre-commit hooks that run before each commit:

### What Gets Checked
- **Formatting**: All code must pass Prettier formatting checks
- **Linting**: All code must pass ESLint validation
- **Both client and server**: Checks run on React and Node.js code

### How It Works
1. **Auto-format**: Automatically formats code with Prettier
2. **Lint check**: Validates code quality with ESLint
3. **Smart blocking**: Only blocks commits with unfixable issues
4. **Fast**: Efficient processing of staged files

### Setup (Already Done)
The pre-commit hooks are already configured using Husky:
- `.husky/pre-commit` - Git hook script
- `package.json` - Pre-commit script configuration
- ESLint configs updated with Jest environment support

### Manual Testing
```bash
# Test pre-commit hook manually
npm run pre-commit
```

### What Gets Auto-Fixed
✅ **Formatting issues**: Prettier automatically fixes all formatting  
✅ **Auto-fixable lint issues**: ESLint fixes simple problems  
❌ **Unfixable lint issues**: Manual intervention required  

### Troubleshooting
Pre-commit hooks automatically fix most issues, but if a commit still fails:
```bash
# Check what issues remain
npm run lint

# Fix remaining linting issues manually
npm run lint:fix

# Then commit again (formatting is already fixed)
git add .
git commit -m "your message"
```

### Example Workflow
```bash
# 1. Make changes with poor formatting
echo "const x={a:1,b:2};" >> file.js

# 2. Commit - auto-formatting happens automatically
git add .
git commit -m "Add feature"

# 3. Code is automatically formatted and committed!
# Result: const x = { a: 1, b: 2 };
```

## Commit Message & PR Title Validation

The project includes intelligent validation for both commit messages and PR titles that applies different rules based on contributor type:

### Rules for External Contributors
External contributors must follow structured commit message formats:

**Conventional Commits Format:**
```bash
feat: add user authentication system
fix(auth): resolve login timeout issue  
docs: update API documentation
style: improve button styling
refactor: restructure user service
test: add integration tests
chore: update dependencies
```

**Issue Reference Format:**
```bash
#123: implement new dashboard feature
#456: fix memory leak in data processing
```

### Rules for Project Collaborators
Project collaborators can use **any commit message format** - no restrictions applied.

**Collaborator Detection:**
The system identifies collaborators by matching the git user configuration against a predefined list:
- `git config user.login` (GitHub username)
- `git config user.name` (fallback)

### Current Collaborators List
The following users can bypass commit message restrictions:
- `azayasankaran`
- `Aswin-coder` 
- `dmakoviichuk-tt`
- `rfurko-tt`
- `ayerofieiev-tt`

### How It Works

#### **Commit Message Validation (Local)**
1. **Commit Attempted**: User tries to commit changes
2. **User Detection**: System checks if committer is a collaborator via git config
3. **Rule Application**: 
   - **Collaborators**: Any message format allowed ✅
   - **External Contributors**: Must follow structured format ❌/✅
4. **Validation**: Commit proceeds if rules are satisfied

#### **PR Title Validation (GitHub Actions)**
1. **PR Created/Updated**: User creates or updates a pull request
2. **User Detection**: System checks if PR author is a collaborator via GitHub username
3. **Rule Application**: 
   - **Collaborators**: Any PR title format allowed ✅
   - **External Contributors**: Must follow structured format ❌/✅
4. **Validation**: PR checks pass if rules are satisfied

### Examples

**✅ Valid for External Contributors:**

*Commit Messages:*
```bash
git commit -m "feat: add dark mode support"
git commit -m "fix(ui): resolve button alignment issue"
git commit -m "#789: implement search functionality"
```

*PR Titles:*
```
feat: add dark mode support
fix(ui): resolve button alignment issue  
#789: implement search functionality
```

**❌ Invalid for External Contributors:**

*Commit Messages:*
```bash
git commit -m "quick fix"
git commit -m "updated stuff"
git commit -m "WIP"
```

*PR Titles:*
```
quick fix
updated stuff
WIP: work in progress
```

**✅ Valid for Collaborators (any format):**

*Commit Messages:*
```bash
git commit -m "quick fix"           # ← Allowed for collaborators
git commit -m "feat: add feature"   # ← Also valid
git commit -m "debugging session"   # ← Also allowed
```

*PR Titles:*
```
quick fix                          # ← Allowed for collaborators
feat: add feature                  # ← Also valid
debugging session                  # ← Also allowed
WIP: experimenting with new API    # ← Also allowed
```

### Configuration

To add new collaborators, update the collaborator lists in **both locations**:

**1. For Commit Message Validation** (`.husky/commit-msg`):
```bash
collaborators=(
  "new-collaborator-username"
  # Add more as needed
)
```

**2. For PR Title Validation** (`.github/workflows/ci.yml`):
```bash
collaborators=(
  "new-collaborator-username" 
  # Add more as needed - keep in sync with .husky/commit-msg
)
```

**⚠️ Important**: Keep both lists synchronized to ensure consistent behavior across commit messages and PR title validation.

## Benefits

✅ **Consistent Code Style**: All team members write code in the same format  
✅ **Automatic Fixes**: Many issues are fixed automatically  
✅ **Better Code Quality**: ESLint catches common mistakes and anti-patterns  
✅ **Faster Reviews**: Less time spent on style discussions  
✅ **Modern Standards**: Enforces ES6+ best practices  
✅ **Pre-commit Validation**: Code quality enforced automatically before commits  
✅ **Flexible Commit Messages & PR Titles**: Collaborators have freedom while maintaining quality for external contributions 