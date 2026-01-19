# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **Email**: Send details to the repository maintainer
2. **Private Security Advisory**: Use GitHub's private vulnerability reporting

### What to Include

When reporting a vulnerability, please include:

- Type of vulnerability (e.g., XSS, SQL injection, etc.)
- Full paths of source files related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity and complexity

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version
2. **Secure Credentials**: Never share your bot token
3. **Environment Variables**: Store sensitive data in `.env`, never commit it
4. **Permissions**: Grant minimum required Discord permissions
5. **MongoDB**: Use authentication and secure connections
6. **Owner Commands**: Restrict OWNER_IDS to trusted users only

### For Contributors

1. **Input Validation**: Always validate and sanitize user input
2. **Authentication**: Verify user permissions before executing commands
3. **Rate Limiting**: Implement rate limiting for resource-intensive operations
4. **SQL/NoSQL Injection**: Use parameterized queries (Mongoose handles this)
5. **XSS Prevention**: Use HTML entity encoding for transcripts
6. **Error Messages**: Don't expose sensitive information in errors
7. **Dependencies**: Keep dependencies updated

## Known Security Features

### Input Sanitization
- HTML entity encoding for transcripts
- MongoDB query sanitization
- Null byte removal
- Length limits on user input

### Rate Limiting
- Per-user rate limits for ticket creation
- Configurable time windows
- Automatic cleanup of old entries

### Permission System
- Role-based access control
- Owner-only commands
- Staff/Admin separation
- Channel permission management

### Blacklist System
- Prevent abusive users from creating tickets
- Admin-managed blacklist
- Reason tracking

### Lockdown Mode
- Emergency shutdown of ticket creation
- Maintenance mode support

## Vulnerability Disclosure Policy

We believe in responsible disclosure:

1. **Report**: Security researchers should report vulnerabilities privately
2. **Acknowledgment**: We'll acknowledge receipt within 48 hours
3. **Investigation**: We'll investigate and develop a fix
4. **Disclosure**: After a fix is released, we'll publicly acknowledge the researcher (if desired)
5. **Credit**: Security researchers will be credited in release notes

## Security Updates

Security updates will be:
- Released as soon as possible
- Documented in release notes
- Announced in GitHub releases
- Tagged with security labels

## Automated Security

This project uses:
- GitHub Dependabot for dependency updates
- npm audit for vulnerability scanning

Run `npm audit` regularly to check for known vulnerabilities in dependencies.

## Secure Configuration

### Recommended `.env` Settings

```env
# Use strong bot tokens
DISCORD_TOKEN=your_secure_token

# Use authenticated MongoDB
MONGODB_URI=mongodb://user:password@localhost:27017/dbname

# Restrict owner access
OWNER_IDS=single_trusted_user_id

# Optional: Error webhook for monitoring
ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Disable debug in production
DEBUG_MODE=false
```

### MongoDB Security

1. Enable authentication
2. Use SSL/TLS connections
3. Restrict network access
4. Regular backups
5. Use strong passwords

### Discord Bot Security

1. Enable privileged intents only if needed
2. Use least-privilege permission model
3. Regenerate token if compromised
4. Monitor bot activity
5. Use 2FA on Discord account

## Incident Response

If a security incident occurs:

1. **Containment**: Immediately disable affected functionality
2. **Assessment**: Evaluate the scope and impact
3. **Notification**: Inform affected users
4. **Remediation**: Deploy fixes
5. **Review**: Conduct post-incident review

## Contact

For security concerns, contact the repository maintainer through GitHub.

---

**Remember**: Security is everyone's responsibility. If you see something, say something.
