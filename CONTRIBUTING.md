# MCP Code Mode Starter - Contributing Guide

Thank you for considering contributing to the MCP Code Mode Starter project!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/mcp-code-mode-starter.git`
3. Install dependencies: `yarn install`
4. Build all packages: `yarn build:all`

## Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `yarn test:simple`
4. Commit your changes: `git commit -m "feat: add new feature"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Use TypeScript for new code
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Add tests for new features
- Ensure existing tests pass: `yarn test:simple`
- Test with Docker: `yarn docker:up && yarn docker:logs`

## Questions?

Open an issue or discussion on GitHub!
