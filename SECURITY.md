# 🛡️ Security Policy

## 🔒 Supported Versions

We actively maintain security updates for the following versions of PR Approval Finder:

| Version | Supported          | Status                    |
| ------- | ------------------ | ------------------------- |
| 6.0.x   | ✅ Yes             | Current stable release    |
| 5.x.x   | ⚠️ Limited Support | Security fixes only       |
| < 5.0   | ❌ No              | Please upgrade            |

## 🚨 Reporting a Vulnerability

### 📧 How to Report

If you discover a security vulnerability, please report it responsibly:

**🔒 For Security Issues:**
- **Email**: [security@example.com](mailto:security@example.com)
- **Subject**: `[SECURITY] PR Approval Finder - Brief Description`

**⚠️ Please DO NOT:**
- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability publicly until it's been addressed
- Attempt to exploit the vulnerability

### 📋 What to Include

When reporting a security issue, please include:

1. **📝 Description** - Clear description of the vulnerability
2. **🔍 Steps to Reproduce** - Detailed steps to reproduce the issue
3. **💥 Impact Assessment** - Potential impact and severity
4. **🌐 Affected Versions** - Which versions are affected
5. **🛠️ Suggested Fix** - If you have ideas for a fix (optional)
6. **📧 Contact Information** - Your preferred contact method

### ⏱️ Response Timeline

We are committed to addressing security issues promptly:

- **📨 Initial Response**: Within 24 hours
- **🔍 Assessment**: Within 72 hours
- **🛠️ Fix Development**: 1-7 days (depending on severity)
- **🚀 Release**: As soon as possible after fix completion
- **📢 Public Disclosure**: After fix is deployed and users have time to update

## 🔐 Security Best Practices

### For Users

When using PR Approval Finder:

- **🔑 GitHub Tokens**: Use tokens with minimal required permissions
- **🔒 Private Repos**: Only use trusted instances for private repository analysis
- **🕒 Token Rotation**: Regularly rotate your GitHub tokens
- **📱 HTTPS Only**: Always access the application over HTTPS
- **🖥️ Browser Security**: Keep your browser updated with latest security patches

### For Contributors

When contributing to the project:

- **🧪 Security Testing**: Test for common vulnerabilities (XSS, CSRF, etc.)
- **🔍 Code Review**: All changes undergo security-focused code review
- **📦 Dependencies**: Keep dependencies updated and audit for vulnerabilities
- **🔐 Secrets**: Never commit API keys, tokens, or other secrets
- **🛡️ Input Validation**: Validate and sanitize all user inputs

## 🛡️ Security Measures

### Application Security

- **🔒 HTTPS Enforcement**: All communication encrypted in transit
- **🚫 No Server Storage**: GitHub tokens never stored on servers
- **🌐 CORS Protection**: Proper Cross-Origin Resource Sharing configuration
- **🔐 CSP Headers**: Content Security Policy implemented
- **🛡️ Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.

### Infrastructure Security

- **☁️ Vercel Security**: Hosted on security-audited platform
- **🔒 API Rate Limiting**: GitHub API rate limiting respected and managed
- **📊 Monitoring**: Security monitoring and alerting in place
- **🔄 Regular Updates**: Dependencies and runtime regularly updated

## 🚨 Known Security Considerations

### GitHub Token Handling

- **⚠️ Client-Side Storage**: Tokens stored in browser memory only
- **🕒 Session-Only**: Tokens not persisted between browser sessions
- **🔐 Minimal Permissions**: Use tokens with only required scopes
- **📝 Audit Trail**: All API calls logged (without exposing tokens)

### Rate Limiting

- **⏱️ API Limits**: Respect GitHub's API rate limits
- **🔄 Retry Logic**: Intelligent retry mechanism to prevent abuse
- **📊 Monitoring**: Track and display rate limit status to users

## 🤝 Security Contact

For non-urgent security questions or suggestions:

- **📧 Email**: [security@example.com](mailto:security@example.com)
- **💬 Discussion**: [GitHub Discussions](https://github.com/yourusername/pr-approval-finder/discussions) (for general security topics)
- **📚 Documentation**: Check our [Security Documentation](./docs/SECURITY.md)

## 🏆 Security Hall of Fame

We recognize responsible security researchers who help improve our security:

<!-- Future security researchers will be listed here -->

*No security issues have been reported yet. Be the first responsible researcher!*

## 📋 Security Checklist

For security-conscious users and organizations:

### ✅ Deployment Checklist
- [ ] Using HTTPS-only deployment
- [ ] GitHub tokens have minimal required permissions
- [ ] Regular security updates applied
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

### ✅ Usage Checklist
- [ ] GitHub tokens rotated regularly
- [ ] Access logs reviewed periodically
- [ ] Team members trained on security best practices
- [ ] Incident response plan in place

## 📚 Additional Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Application Security Guide](https://github.com/OWASP/wstg)
- [Vercel Security](https://vercel.com/security)

---

**Thank you for helping keep PR Approval Finder secure! 🙏** 