# MCP Code Mode - Complete Codebase Structure Analysis

## Executive Summary

**Project**: MCP Code Mode Starter  
**Size**: 3.9MB total repository  
**Type**: TypeScript Monorepo (Yarn Berry Workspace)  
**Purpose**: Production-ready Model Context Protocol (MCP) server implementing Code Mode pattern with 98% token reduction, AI-powered code analysis, and automated BestCase management.

**Key Metrics**:
- **72** TypeScript/JavaScript source files (18,530 total lines of code)
- **1** comprehensive test file (502 lines)
- **57** documentation files (.md)
- **5** configuration files (tsconfig.json variants, nuxt.config.ts, .yarnrc.yml)
- **11** package.json files (1 root + 10 in workspaces)
- **6** external npm dependencies

---

## Quick Navigation

1. [Complete Directory Structure](#directory-structure)
2. [Packages & Their Purposes](#package-details--purposes)
   - ai-bindings (TypeScript API bridge)
   - ai-runner (Code execution engine)
   - bestcase-db (Storage & indexing)
   - llm-analyzer (AI code analysis)
3. [MCP Servers](#mcp-servers-guide)
   - filesystem (File I/O)
   - bestcase (BestCase management)
   - guides (Dynamic guidelines)
4. [Root Entry Point (mcp-stdio-server.ts)](#root-entry-point)
5. [Configuration Files](#configuration-files)
6. [Dependencies & Architecture](#dependencies--architecture)
7. [Statistics & Performance](#statistics)

---

## Packages Summary

| Package | Purpose | Files | Lines | Key Exports |
|---------|---------|-------|-------|------------|
| **ai-bindings** | TypeScript API facade | 1 | 5 | filesystem, bestcase, guides |
| **ai-runner** | Sandbox execution (vm2) | 4 | 520 | runAgentScript, runInSandbox |
| **bestcase-db** | BestCase storage & search | 5 | 1,500 | BestCaseStorage, FileCaseStorage, scoring types |
| **llm-analyzer** | AI code analysis | 15 | 6,500 | MetadataAnalyzer, scoreCalculator, comparator |

---

## MCP Servers Summary

| Server | Purpose | Files | Functions | Usage |
|--------|---------|-------|-----------|-------|
| **filesystem** | File I/O | 5 | readFile, writeFile, searchFiles | Injected into sandbox |
| **bestcase** | BestCase CRUD | 11 | 12 exported functions | Injected into sandbox |
| **guides** | Dynamic guidelines | 2 | indexGuides, load, merge | Loaded for context |

---

## Architecture Overview

```
User Code (TypeScript)
    ↓
mcp-stdio-server.ts (Main entry, 1,658 lines)
    ├─→ ai-runner (Sandbox execution)
    │    └─→ vm2 (Isolated environment)
    │         ├─ filesystem API (file ops)
    │         ├─ bestcase API (code examples)
    │         └─ guides (dynamic instructions)
    │
    ├─→ bestcase-db (Storage)
    │    └─ LRU Cache (5min TTL, 100 items)
    │
    ├─→ llm-analyzer (AI Analysis)
    │    ├─ MetadataAnalyzer
    │    ├─ Design system detection (7 frameworks)
    │    ├─ Utility library detection (9 libraries)
    │    └─ Multi-dimensional scoring (8 dimensions)
    │
    └─→ guides (Dynamic instructions)
         └─ From .github/instructions/guides/
```

---

## Multi-Dimensional Scoring (8 Dimensions)

Each code sample is scored on:

1. **Structure** (15% weight) - File organization, component separation
2. **API Connection** (15% weight) - gRPC/REST API usage, error handling
3. **Design System** (12% weight) - UI component consistency
4. **Utility Usage** (10% weight) - Library usage (lodash, date-fns, etc.)
5. **Error Handling** (15% weight) - Exception handling, user feedback
6. **Type Usage** (13% weight) - TypeScript type definitions
7. **State Management** (10% weight) - Global/local state patterns
8. **Performance** (10% weight) - Optimization, caching, rendering

**Grade Mapping**:
- Excellent: 85+ points
- Good: 70-84 points
- Fair: 50-69 points
- Poor: <50 points

---

## Framework/Library Detection

### Detected UI Frameworks (7)
1. openerd-nuxt3
2. element-plus
3. vuetify
4. quasar
5. primevue
6. ant-design-vue
7. naive-ui

### Detected Utilities (9)
1. vueuse
2. lodash
3. date-fns
4. axios
5. dayjs
6. Plus 4 hybrid combinations

---

## File Organization (Top-Level)

```
/home/user/mcp-code-mode/
├── packages/              (4 NPM packages)
├── mcp-servers/          (3 MCP implementations)
├── apps/web/             (Nuxt3 web app)
├── scripts/              (21 utility/test scripts)
├── tests/                (1 test file - 502 lines)
├── docs/                 (27 documentation files)
├── .github/              (GitHub config + guides)
├── mcp-stdio-server.ts   (Main entry - 1,658 lines)
└── Configuration files   (package.json, tsconfig, etc.)
```

---

## Largest Source Files

```
1. mcp-stdio-server.ts (1,658 lines)
   └─ Main server implementation + cache + handlers

2. scripts/scan/scan-files-ai.ts (1,056 lines)
   └─ AI-powered file scanning

3. llm-analyzer/metadataAnalyzer.ts (847 lines)
   └─ Metadata extraction engine

4. llm-analyzer/utilityLibraryMapping.ts (732 lines)
   └─ 9 utility libraries detection

5. bestcase-db/fileCase.ts (645 lines)
   └─ File-level BestCase storage (v3.0)

6. llm-analyzer/localPackageAnalyzer.ts (568 lines)
   └─ Local package detection

7. mcp-servers/guides/index.ts (513 lines)
   └─ Dynamic guide loading

8. tests/cache-thresholds-keywords.test.ts (502 lines)
   └─ Cache + threshold + keyword tests

9. llm-analyzer/scoreCalculator.ts (492 lines)
   └─ 8-dimensional scoring

10. ai-runner/sandbox.ts (482 lines)
    └─ vm2 sandbox wrapper + preprocessing
```

---

## External Dependencies (Production Only)

```
vm2@3.10.0           - Sandbox execution
node-fetch@3.3.2     - HTTP client
nuxt@4.2.0           - Web framework
vue@3.5.22           - UI framework
vue-router@4.6.3     - Routing
```

**DevDependencies**:
- typescript@5.9.3
- tsup@8.5.0
- esbuild@0.25.12
- tsx@4.19.2
- @types/node@24.10.0

---

## Build Process

### Workspace Build Order
```bash
1. yarn workspace bestcase-db run build
2. yarn workspace llm-analyzer run build
3. yarn workspace @mcp-code-mode/guides run build
4. yarn workspace ai-bindings run build
5. yarn workspace ai-runner run build
6. tsup mcp-stdio-server.ts (root entry)
```

### Build Tools
- **tsup** - Main bundler (esm format)
- **TypeScript** - Compilation
- **esbuild** - Fast JS compiler

---

## Development Scripts

```bash
# Web development
yarn dev                      # Start Nuxt dev server

# Building
yarn build:all               # Build all packages
yarn build:root              # Build server only

# Scanning & Analysis
yarn scan                     # Scan files with AI
yarn scan:migrate             # Migrate bestcases
yarn scan:validate            # Validate data

# Testing
yarn test:guides             # Test guide system
yarn test:metadata           # Test metadata extraction
yarn test:design-system      # Test framework detection
yarn test:multidimensional   # Test 8-D scoring
# ... more tests

# Docker
yarn docker:up               # Start containers
yarn docker:down             # Stop containers
```

---

## Cache System (in mcp-stdio-server.ts)

**Type**: LRU Cache with TTL

**Configuration**:
- `CACHE_TTL_MS` env var (default: 300000ms = 5 minutes)
- `CACHE_MAX_ENTRIES` env var (default: 100 items)

**Strategy**:
- Time-based expiration (TTL)
- Size-based eviction (LRU)
- Automatic invalidation on FileCase save/delete

**Benefits**:
- Reduces database queries
- Improves API response time
- Configurable for different environments

---

## Storage Locations

```
~/.mcp/                       # MCP data directory
├── bestcases/               # v2.0 BestCase JSON files
├── filecases/               # v3.0 FileCase JSON files
└── local-packages.json      # Custom package mappings
```

---

## Dynamic Guideline System

**Location**: `.github/instructions/guides/`

**Categories**:
- `api/` (6 files) - gRPC & OpenAPI integration
- `error/` (1 file) - Error handling patterns
- `ui/` (4 files) - UI component usage
- `workflow/` (2 files) - Development workflows

**Features**:
- Metadata-driven filtering
- Scope matching (project/repo/org/global)
- API type matching (gRPC/OpenAPI/any)
- Automatic loading for mandatory guides
- Merge-based customization

---

## Testing Strategy

### Unit Tests
- **1 main test file** (tests/cache-thresholds-keywords.test.ts - 502 lines)
  - LRU cache behavior
  - Threshold configuration
  - Keyword merging
  - Multi-dimensional scoring

### Integration Tests
**11 test scripts** in `scripts/test/`:
- Guide loading integration
- YAML parsing
- MCP server flow
- Metadata extraction
- Framework detection
- Import/require handling
- IIFE unwrapping
- Multi-dimensional scoring
- API workflows
- Complete end-to-end validation

---

## Documentation (57 Files)

### By Category

**Quick Start** (3 files):
- README.md
- QUICK_START_OTHER_PROJECTS.md
- USAGE_GUIDE.md

**Architecture** (3 files):
- PROJECT_STRUCTURE.md
- PROJECT_CONTEXT.md
- PROCESS_SUMMARY.md

**Features** (8 files):
- BESTCASE_MIGRATION.md
- CODE_RECOMMENDATION_API.md
- DESIGN_SYSTEM_USAGE.md
- UTILITY_LIBRARY_USAGE.md
- LOCAL_PACKAGES.md
- METADATA_SYSTEM.md
- MULTIDIMENSIONAL_SCORING.md
- GUIDES_MCP_INTEGRATION.md

**Integration** (6 files):
- MCP_SETUP_GUIDE.md
- MCP_LOGGING_GUIDE.md
- SANDBOX_USAGE_GUIDE.md
- EXECUTE_WORKFLOW_EXAMPLES.md
- ENHANCED_OPTIONS.md
- ENVIRONMENT_VARIABLES.md

**Deployment** (7 files):
- DOCKER_REBUILD_GUIDE.md
- PRODUCTION_GUIDE.md
- VSCODE_MCP_GUIDE.md
- VSCODE_COPILOT_USAGE.md (56KB comprehensive guide)
- WORKFLOW_CORRECT.md
- TEST_GUIDE.md
- TROUBLESHOOTING.md

---

## Key Features

1. **Code Mode Implementation**
   - Single `execute` tool + sandbox
   - 98% token reduction vs traditional MCP

2. **Multi-Dimensional Scoring**
   - 8 independent quality dimensions
   - Weighted average calculation
   - Save criteria based on thresholds

3. **AI-Powered Analysis**
   - Ollama LLM integration
   - Structured metadata extraction
   - Design system detection (7 frameworks)
   - Utility library detection (9 libraries)

4. **BestCase Management**
   - v2.0: Project-level bestcases
   - v3.0: File-level filecases
   - Full-text search + metadata filtering
   - RAG-based recommendations

5. **Dynamic Guidelines**
   - Metadata-driven filtering
   - API type matching
   - Automatic loading
   - Context-aware merging

6. **Sandbox Execution**
   - vm2 isolation
   - Auto import/require removal
   - IIFE unwrapping
   - Direct API injection

7. **LRU Caching**
   - TTL-based expiration
   - Size-based eviction
   - Configurable limits

8. **Docker Support**
   - GPU-enabled Ollama
   - CPU-only fallback
   - Docker Compose configs

---

## Dependency Relationships

### Package Import Chain

```
apps/web
  └─ depends: ai-runner
      └─ depends: ai-bindings
          └─ imports: filesystem, bestcase, guides
```

### Server Integration

```
mcp-stdio-server.ts
  ├─ imports: ai-runner (execution)
  ├─ imports: bestcase (CRUD)
  ├─ imports: guides (instructions)
  ├─ imports: bestcase-db (storage)
  ├─ imports: llm-analyzer (analysis)
  └─ manages: LRU cache, tool handlers
```

---

## Performance Optimizations

1. **Caching**
   - LRU cache with TTL
   - Automatic eviction

2. **Indexing**
   - Full-text search index
   - Fast keyword lookups

3. **Code Execution**
   - Auto-remove imports
   - IIFE unwrapping
   - Configurable timeout

4. **Metadata**
   - Structured extraction (no full content)
   - Efficient scoring

---

## Type Safety

- **Full TypeScript strict mode** throughout
- **No `any` types** in core code
- **Strong interfaces** for all data structures
- **Type-safe MCP protocol** implementation

---

## Security

1. **Sandbox Isolation** (vm2)
   - No file system access by default
   - Explicit API injection
   - Network isolation

2. **Type Safety**
   - TypeScript strict mode
   - No unchecked casts

3. **Path Validation**
   - Safe path utilities
   - Input validation

---

## Next Steps for Users

1. **Understand the architecture**: Read PROJECT_STRUCTURE.md
2. **Explore packages**: Start with ai-bindings → ai-runner → bestcase-db
3. **Test locally**: Run `yarn test:*` scripts
4. **Review examples**: Check scripts/examples/ for usage patterns
5. **Deploy**: Use Docker Compose for full stack

---

## Statistics Summary

| Metric | Value |
|--------|-------|
| Total LOC | 18,530 |
| Source Files | 72 |
| Packages | 4 |
| MCP Servers | 3 |
| Test Files | 1 |
| Doc Files | 57 |
| Config Files | 11 |
| Repo Size | 3.9MB |
| Dependencies | 10 |
| DevDependencies | 5 |

---

**Generated**: 2025-11-17  
**Repository**: github.com/TaeGyumKim/mcp-code-mode  
**License**: MIT

