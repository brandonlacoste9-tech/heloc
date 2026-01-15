# Security Policy

## Overview

CI-Fixer is designed with security in mind, but there are important considerations when using automated CI failure detection and PR creation.

## Security Considerations

### Workflow Trigger Security

CI-Fixer uses the `workflow_run` trigger to detect CI failures. This trigger:

1. **Runs in a privileged context** with write permissions to create PRs
2. **Can checkout code from failed workflows** which may include untrusted PRs
3. **Requires careful permission management** to minimize risk

### Mitigations

We've implemented several security measures:

1. **Limited Permissions**: The workflow uses explicit minimal permissions:
   - `contents: write` - Only to create branches for fixes
   - `pull-requests: write` - Only to create PRs
   - `issues: write` - Only to add labels
   - `actions: read` - Only to read workflow logs

2. **No Direct Code Execution**: The workflow:
   - Does NOT directly merge changes
   - Does NOT execute untrusted code from PRs
   - Only creates PRs that require human review before merging

3. **Credential Protection**:
   - Uses `persist-credentials: false` in checkout
   - API keys stored as GitHub Secrets
   - Service should be deployed with proper authentication

4. **Review Required**: All fixes are submitted as PRs that:
   - Require maintainer review
   - Can be inspected before merging
   - Are clearly labeled as automated

5. **Log Sanitization Warning**: ⚠️ Error logs may contain sensitive information
   - Logs are truncated but not sanitized
   - Ensure your workflows don't log secrets or sensitive data
   - Review logs before sending to external AI services
   - Consider implementing custom sanitization for your use case

## Best Practices

When using CI-Fixer:

1. **Review all PRs** created by CI-Fixer before merging
2. **Verify API keys** are stored as GitHub Secrets, never in code
3. **Monitor the service** for unusual activity
4. **Use branch protection rules** to require reviews for all PRs
5. **Limit workflow_run triggers** to specific workflows if needed

## Reporting Security Issues

If you discover a security vulnerability in CI-Fixer:

1. **DO NOT** open a public issue
2. Email security concerns to: [your-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fixes (if any)

We will respond within 48 hours and work with you to address the issue.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Updates

We will publish security updates as needed. Subscribe to repository releases to be notified of security patches.

## Additional Resources

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Workflow Run Events Security](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run)
