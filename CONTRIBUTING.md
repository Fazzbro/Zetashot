# Contributing to OpenShot UI Camera

Thank you for your interest in contributing to OpenShot UI Camera! We are building a modern, open-source, local-first studio for web camera captures, mockups, and presentations.

## Development Workflow

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
git clone https://github.com/your-username/openshot-ui-camera.git
cd openshot-ui-camera
npm install
npm run dev
```

### Testing with TDD
We follow Test-Driven Development (TDD). Before submitting a feature or bugfix:
```bash
npm test
```

Ensure all unit and integration tests pass and new behavior has corresponding test coverage.

### Code Style & Guidelines
- Strict TypeScript (`tsc --noEmit`)
- Modular architecture: keep utilities, services, components, and styles clean and decoupled.
- Zero analytics/telemetry: preserve local-first privacy at all times.
- Accessible UI components with keyboard navigation and ARIA labels.

## Submitting Pull Requests
1. Fork the repo and create a feature branch (`git checkout -b feature/awesome-mockup`).
2. Commit your changes with clear, descriptive commit messages.
3. Push to your branch and open a Pull Request.
