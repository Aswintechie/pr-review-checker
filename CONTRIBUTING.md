# 🤝 Contributing to PR Approval Finder

Thank you for your interest in contributing to PR Approval Finder! We welcome contributions from developers of all skill levels.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports** - Found a bug? Let us know!
- 💡 **Feature Requests** - Have ideas for new features?
- 📖 **Documentation** - Help improve our docs
- 🎨 **UI/UX Improvements** - Make the app more beautiful
- 🔧 **Code Contributions** - Fix bugs or add features
- 🧪 **Testing** - Help us improve test coverage

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 18.0.0
npm >= 8.0.0
Git
```

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/pr-approval-finder.git
   cd pr-approval-finder
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up Environment**
   ```bash
   # Copy environment example files
   cp server/env.example server/.env
   
   # Add your GitHub token (optional, for testing)
   echo "GITHUB_TOKEN=your_token_here" >> server/.env
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Setup**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:3001](http://localhost:3001)

## 🔧 Development Workflow

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow our coding standards
   - Add tests for new features
   - Update documentation if needed

3. **Test Your Changes**
   ```bash
   # Run all tests
   npm test
   
   # Run tests with coverage
   npm run test:coverage
   
   # Run linting
   npm run lint
   
   # Fix formatting
   npm run format
   ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

**Examples:**
```bash
feat: add dark mode toggle to header
fix: resolve CODEOWNERS parsing issue with spaces
docs: update API documentation
style: format code with prettier
refactor: extract theme logic to custom hook
test: add unit tests for approval calculation
chore: update dependencies to latest versions
```

### Pull Request Process

1. **Push Your Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**
   - Use our [PR template](.github/pull_request_template.md)
   - Provide clear description of changes
   - Link related issues
   - Add screenshots for UI changes

3. **Code Review**
   - Address reviewer feedback
   - Keep discussions constructive
   - Be responsive to comments

4. **Merge**
   - Once approved, maintainers will merge your PR
   - Your branch will be deleted automatically

## 🎯 Code Standards

### JavaScript/React

- Use functional components with hooks
- Prefer `const` over `let`, avoid `var`
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Use React fragments instead of unnecessary divs

```javascript
// ✅ Good
const UserCard = ({ user, isApproved }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <>
      <div className="user-card">
        {/* Component content */}
      </div>
    </>
  );
};

// ❌ Bad
function UserCard(props) {
  var expanded = false;
  
  return (
    <div>
      <div className="user-card">
        {/* Component content */}
      </div>
    </div>
  );
}
```

### CSS

- Use CSS custom properties (variables)
- Follow BEM naming convention when appropriate
- Use semantic class names
- Prefer flexbox/grid over floats
- Write mobile-first responsive styles

```css
/* ✅ Good */
.user-card {
  display: flex;
  align-items: center;
  background: var(--bg-primary);
  border-radius: 12px;
}

.user-card--approved {
  border-color: var(--success);
}

/* ❌ Bad */
.card {
  float: left;
  background: #ffffff;
}

.approved {
  border-color: #10b981;
}
```

### File Structure

```
src/
├── components/          # Reusable components
│   ├── UserCard/
│   │   ├── UserCard.js
│   │   ├── UserCard.css
│   │   └── index.js
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # App constants
└── types/              # TypeScript types (if using TS)
```

## 🧪 Testing Guidelines

### Writing Tests

- Write tests for all new features
- Test edge cases and error conditions
- Use descriptive test names
- Mock external dependencies

```javascript
// ✅ Good
describe('UserCard', () => {
  it('should display user name and avatar', () => {
    const user = { name: 'John Doe', avatar_url: 'https://...' };
    render(<UserCard user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', user.avatar_url);
  });
  
  it('should show approval badge when user is approved', () => {
    const user = { name: 'John Doe' };
    render(<UserCard user={user} isApproved={true} />);
    
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- UserCard.test.js
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Details**
   - OS and version
   - Browser and version
   - Node.js version

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Additional Context**
   - PR URL you were testing
   - Console error messages
   - Network tab information

## 💡 Feature Requests

When requesting features:

1. **Describe the Problem**
   - What problem does this solve?
   - Who would benefit from this feature?

2. **Proposed Solution**
   - How should it work?
   - Any UI mockups or examples?

3. **Alternatives Considered**
   - What other solutions did you consider?
   - Why is this the best approach?

## 🎨 Design Guidelines

### UI/UX Principles

- **Accessibility First** - WCAG 2.1 AA compliance
- **Mobile First** - Design for mobile, enhance for desktop
- **Progressive Enhancement** - Core functionality works without JavaScript
- **Consistent** - Follow established patterns and components
- **Performant** - Optimize for speed and efficiency

### Theme System

When adding new themes:

1. Follow existing color variable patterns
2. Ensure sufficient contrast ratios
3. Test in both light and dark environments
4. Provide meaningful theme names and descriptions

## 📦 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Create release notes
- [ ] Tag release in Git
- [ ] Deploy to production

## 💬 Getting Help

- 📧 **Email**: [maintainer@example.com](mailto:maintainer@example.com)
- 💬 **Discord**: [Join our community](https://discord.gg/pr-approval-finder)
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/pr-approval-finder/issues)
- 📖 **Documentation**: [Full Documentation](./docs)

## 🏆 Recognition

Contributors are recognized in:

- 📜 **CONTRIBUTORS.md** - All contributors listed
- 🎉 **Release Notes** - Major contributions highlighted  
- 💫 **Hall of Fame** - Outstanding contributors featured

---

## 📄 Code of Conduct

Please note that this project is released with a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

Thank you for contributing to PR Approval Finder! 🎉 