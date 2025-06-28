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

## Benefits

✅ **Consistent Code Style**: All team members write code in the same format  
✅ **Automatic Fixes**: Many issues are fixed automatically  
✅ **Better Code Quality**: ESLint catches common mistakes and anti-patterns  
✅ **Faster Reviews**: Less time spent on style discussions  
✅ **Modern Standards**: Enforces ES6+ best practices 