# Project Structure

```
mcp-code-mode-starter/
├── .github/                    # GitHub workflows and templates
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── workflows/             # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/
│   └── web/                   # Nuxt3 web application
├── docs/                      # Documentation
│   ├── AI_*.md               # AI-related documentation
│   ├── *_GUIDE.md            # Setup guides
│   └── *_SUMMARY.md          # Implementation summaries
├── mcp-servers/              # MCP server implementations
│   ├── bestcase/             # BestCase management
│   └── filesystem/           # File system operations
├── packages/                 # Shared packages
│   ├── ai-bindings/          # API bindings
│   ├── ai-runner/            # Sandbox executor
│   ├── bestcase-db/          # BestCase storage
│   └── llm-analyzer/         # LLM code analyzer
├── scripts/                  # Utility scripts
│   ├── scan/                 # Scanning scripts
│   └── tests/                # Test scripts
├── .dockerignore
├── .env.example              # Environment variables template
├── .gitignore
├── CONTRIBUTING.md           # Contributing guidelines
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Docker image definition
├── LICENSE                   # MIT License
├── package.json              # Project dependencies
├── README.md                 # Main documentation
└── tsconfig.base.json        # TypeScript configuration
```

## Key Directories

- **apps/web**: Nuxt3 web interface for the MCP server
- **docs/**: All documentation files
- **mcp-servers/**: MCP server implementations (bestcase, filesystem)
- **packages/**: Shared TypeScript packages
- **scripts/**: Utility scripts for scanning and testing
