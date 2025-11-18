# MCP Code Mode - Documentation

> **Anthropic Code Mode pattern with 98% token reduction**

Complete documentation for MCP Code Mode Starter.

---

## 🚀 Quick Start (Choose One)

### New Users
1. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** ⭐ - Complete setup (Docker, VS Code, env)
2. **[GETTING_STARTED.md](./GETTING_STARTED.md)** ⭐ - Learn basics in 10 minutes
3. **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)** ⭐ - Master the workflow

### Existing Projects
- **[QUICK_START_OTHER_PROJECTS.md](./QUICK_START_OTHER_PROJECTS.md)** - Add to your project

---

## 📖 Core Documentation

### Essentials

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** | Environment, Docker, VS Code setup | First time setup |
| **[GETTING_STARTED.md](./GETTING_STARTED.md)** | Core concepts, first task, FAQ | Learning the basics |
| **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)** | Workflow patterns, examples | Daily usage |
| **[SANDBOX_USAGE_GUIDE.md](./SANDBOX_USAGE_GUIDE.md)** | Complete API reference | Need API details |

### Architecture & Systems

| Document | Description |
|----------|-------------|
| **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** | How metadata extraction works |
| **[MULTIDIMENSIONAL_SCORING.md](./MULTIDIMENSIONAL_SCORING.md)** | 8-dimension scoring system |
| **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** | Auto-detection of APIs, design systems |
| **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** | Codebase organization |

### Advanced Features

| Document | Description |
|----------|-------------|
| **[DESIGN_SYSTEM_USAGE.md](./DESIGN_SYSTEM_USAGE.md)** | 7 UI frameworks auto-detection |
| **[UTILITY_LIBRARY_USAGE.md](./UTILITY_LIBRARY_USAGE.md)** | 9 utility libraries mapping |
| **[LOCAL_PACKAGES.md](./LOCAL_PACKAGES.md)** | Monorepo & local deps analysis |
| **[CODE_RECOMMENDATION_API.md](./CODE_RECOMMENDATION_API.md)** | RAG-based recommendations |

### Guides & Integration

| Document | Description |
|----------|-------------|
| **[GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md)** | Dynamic guide loading system |
| **[BESTCASE_PRIORITY_GUIDE.md](./BESTCASE_PRIORITY_GUIDE.md)** | BestCase priority strategy |
| **[BESTCASE_MIGRATION.md](./BESTCASE_MIGRATION.md)** | Migration from old format |

### Operations

| Document | Description |
|----------|-------------|
| **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** | Production deployment |
| **[MCP_LOGGING_GUIDE.md](./MCP_LOGGING_GUIDE.md)** | Logging & debugging |
| **[TEST_GUIDE.md](./TEST_GUIDE.md)** | Testing strategies |

### Reference

| Document | Description |
|----------|-------------|
| **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** | All environment variables |
| **[EXECUTE_WORKFLOW_EXAMPLES.md](./EXECUTE_WORKFLOW_EXAMPLES.md)** | 15+ workflow examples |
| **[ENHANCED_OPTIONS.md](./ENHANCED_OPTIONS.md)** | Advanced configuration options |
| **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** | Original usage guide (legacy) |
| **[PROCESS_SUMMARY.md](./PROCESS_SUMMARY.md)** | System process overview |

---

## 🎯 Documentation by Use Case

### I want to...

#### Get Started
→ **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** + **[GETTING_STARTED.md](./GETTING_STARTED.md)**

#### Use with VS Code Copilot
→ **[GETTING_STARTED.md](./GETTING_STARTED.md)** → **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)**

#### Understand How it Works
→ **[GETTING_STARTED.md](./GETTING_STARTED.md)** (Core Concepts section)

#### Scan My Project
→ **[QUICK_START_OTHER_PROJECTS.md](./QUICK_START_OTHER_PROJECTS.md)**

#### Use Advanced Features
→ **[MULTIDIMENSIONAL_SCORING.md](./MULTIDIMENSIONAL_SCORING.md)**
→ **[DESIGN_SYSTEM_USAGE.md](./DESIGN_SYSTEM_USAGE.md)**
→ **[LOCAL_PACKAGES.md](./LOCAL_PACKAGES.md)**

#### Debug Issues
→ **[MCP_LOGGING_GUIDE.md](./MCP_LOGGING_GUIDE.md)**
→ **[../TROUBLESHOOTING.md](../TROUBLESHOOTING.md)**

#### Deploy to Production
→ **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)**

#### Understand the Architecture
→ **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**
→ **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)**

---

## 📊 Key Concepts

### Code Mode vs Traditional MCP

**Traditional MCP:**
```
LLM → read_file(large_file) → 500KB → LLM
= 150,000 tokens
```

**Code Mode:**
```
LLM → execute(smart_code) → 10-line summary → LLM
= 2,000 tokens (98% reduction!)
```

### Auto-Context System

Every `execute` call can automatically load:
- **Recommendations** - Similar code via RAG
- **Best Practices** - High-quality examples
- **Guides** - Relevant documentation
- **Project Context** - API/design system detection

### Multi-Dimensional Scoring

Files scored across 8 dimensions:
1. API Connection
2. Error Handling
3. Type Usage
4. State Management
5. Design System
6. Structure
7. Performance
8. Utility Usage

---

## 🏗️ Architecture Overview

```
┌─────────────────┐
│  MCP STDIO      │  Single execute tool
│  Server         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ Auto  │ │Sand   │  TypeScript execution
│Context│ │ box   │  with all APIs
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
  ┌──────▼──────┐
  │  4 API Sets │
  ├─────────────┤
  │ filesystem  │  Read/write/search files
  │ bestcase    │  Code search & storage
  │ guides      │  Dynamic guide loading
  │ metadata    │  Project analysis
  └─────────────┘
```

---

## 📂 Documentation Structure

```
docs/
├── README.md (this file)
│
├── 🚀 Getting Started
│   ├── SETUP_GUIDE.md
│   ├── GETTING_STARTED.md
│   ├── WORKFLOW_GUIDE.md
│   └── QUICK_START_OTHER_PROJECTS.md
│
├── 📖 Core Systems
│   ├── METADATA_SYSTEM.md
│   ├── MULTIDIMENSIONAL_SCORING.md
│   ├── PROJECT_CONTEXT.md
│   └── SANDBOX_USAGE_GUIDE.md
│
├── 🎨 Advanced Features
│   ├── DESIGN_SYSTEM_USAGE.md
│   ├── UTILITY_LIBRARY_USAGE.md
│   ├── LOCAL_PACKAGES.md
│   └── CODE_RECOMMENDATION_API.md
│
├── 📚 Guides & Examples
│   ├── GUIDES_MCP_INTEGRATION.md
│   ├── EXECUTE_WORKFLOW_EXAMPLES.md
│   ├── BESTCASE_PRIORITY_GUIDE.md
│   └── BESTCASE_MIGRATION.md
│
├── ⚙️ Operations
│   ├── PRODUCTION_GUIDE.md
│   ├── MCP_LOGGING_GUIDE.md
│   └── TEST_GUIDE.md
│
└── 📋 Reference
    ├── ENVIRONMENT_VARIABLES.md
    ├── ENHANCED_OPTIONS.md
    ├── PROJECT_STRUCTURE.md
    ├── USAGE_GUIDE.md
    └── PROCESS_SUMMARY.md
```

---

## 🔗 External Resources

- **[Main README](../README.md)** - Project overview
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute
- **[Troubleshooting](../TROUBLESHOOTING.md)** - Common issues
- **[GitHub Issues](https://github.com/TaeGyumKim/mcp-code-mode/issues)** - Report bugs

---

## 📈 Version History

### v1.0.0 (Latest)
- ✅ Consolidated documentation
- ✅ Unified setup guide
- ✅ Comprehensive getting started
- ✅ Workflow guide with examples
- ✅ Removed legacy/temporary files

### Previous Versions
See individual files for detailed change history.

---

## 💡 Tips for Reading

1. **Start with Getting Started** - Even if you're experienced
2. **Use search** - Ctrl+F is your friend
3. **Follow links** - Documentation is interconnected
4. **Try examples** - Best way to learn
5. **Check troubleshooting** - Many answers there

---

## 🤝 Contributing to Documentation

Found an error? Want to improve something?

1. Check **[CONTRIBUTING.md](../CONTRIBUTING.md)**
2. Open an issue or PR on GitHub
3. Follow the documentation style guide

---

## ❓ Need Help?

1. Check **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)**
2. Search **[GitHub Issues](https://github.com/TaeGyumKim/mcp-code-mode/issues)**
3. Read related documentation
4. Ask in GitHub Discussions (if available)

---

**Last Updated:** 2025-11-18
**Maintained by:** MCP Code Mode Contributors
