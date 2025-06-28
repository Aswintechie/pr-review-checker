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

## Benefits

✅ **Consistent Code Style**: All team members write code in the same format  
✅ **Automatic Fixes**: Many issues are fixed automatically  
✅ **Better Code Quality**: ESLint catches common mistakes and anti-patterns  
✅ **Faster Reviews**: Less time spent on style discussions  
✅ **Modern Standards**: Enforces ES6+ best practices  
✅ **Pre-commit Validation**: Code quality enforced automatically before commits 