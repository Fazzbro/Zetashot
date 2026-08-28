# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within OpenShot UI Camera, please report it privately:

1. **Do not create a public issue** on GitHub.
2. Email security vulnerability details and reproduction steps to the repository maintainers.
3. We will review, respond, and patch critical issues promptly.

## Security Practices
- **Content Security Policy (CSP)**: Strict inline script restrictions.
- **Sandboxed Frames**: Embedded targets run with constrained sandbox attributes (`allow-scripts`, `allow-same-origin`).
- **Simulated Browser Chrome**: The fake address bar is purely cosmetic and does not intercept, expose, or modify browser security tokens or cookies.
