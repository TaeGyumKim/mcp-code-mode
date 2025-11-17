# MCP Code Mode - Complete File Matrix

## Source Files by Package

### packages/ai-bindings/ (1 file)
| File | Lines | Purpose | Exports |
|------|-------|---------|---------|
| src/index.ts | 5 | Re-exports MCP servers | filesystem, bestcase, guides |

---

### packages/ai-runner/ (4 files, ~520 lines)
| File | Lines | Purpose | Key Exports/Functions |
|------|-------|---------|----------------------|
| src/agentRunner.ts | 20 | Main execution interface | `runAgentScript()` |
| src/sandbox.ts | 482 | vm2 sandbox + preprocessing | `runInSandbox()`, `preprocessCode()` |
| src/projectContext.ts | ~20 | Context extraction | `extractProjectContext()` |
| src/vm2.d.ts | - | Type definitions | - |

**Key Features**:
- Automatic import/require removal
- IIFE unwrapping
- API injection into sandbox

---

### packages/bestcase-db/ (5 files, ~1,500 lines)
| File | Lines | Purpose | Key Exports |
|------|-------|---------|------------|
| src/index.ts | ~30 | Main exports | All public APIs |
| src/types.ts | 259 | Type definitions | BestCaseScores, BestCase interface |
| src/storage.ts | ~300 | v2.0 BestCase storage | BestCaseStorage class |
| src/fileCase.ts | 645 | v3.0 FileCase storage | FileCaseStorage class, FileCase interface |
| src/indexer.ts | ~250 | Full-text indexing | buildIndex(), searchIndex() |

**Key Scoring Utilities**:
- `calculateWeightedScore()` - 8-D weighted average
- `getScoreGrade()` - Grade mapping (excellent/good/fair/poor)
- `shouldSaveBestCase()` - Save criteria evaluation

**Storage Locations**:
- ~/.mcp/bestcases/ (v2.0)
- ~/.mcp/filecases/ (v3.0)

---

### packages/llm-analyzer/ (15 files, ~6,500 lines)
| File | Lines | Purpose | Key Exports |
|------|-------|---------|------------|
| src/index.ts | ~50 | Main exports | All analyzers + utilities |
| src/metadata.ts | ~150 | Type definitions | FileMetadata, ComponentMetadata, ProjectMetadata |
| src/metadataAnalyzer.ts | 847 | Metadata extraction engine | MetadataAnalyzer class |
| src/designSystemMapping.ts | 402 | 7 UI framework detection | DESIGN_SYSTEMS, mapDesignSystem() |
| src/utilityLibraryMapping.ts | 732 | 9 utility lib detection | UTILITY_LIBRARIES, mapUtilityLibrary() |
| src/scoreCalculator.ts | 492 | 8-D scoring | calculateScoresFromMetadata() |
| src/bestcaseComparator.ts | ~150 | BestCase comparison | compareBestCaseMetadata() |
| src/codeAnalyzer.ts | 374 | Legacy score-based analyzer | CodeAnalyzer class |
| src/ollamaClient.ts | ~150 | Ollama LLM integration | OllamaClient class |
| src/embeddingService.ts | ~100 | RAG embeddings | EmbeddingService class |
| src/localPackageAnalyzer.ts | 568 | Local package detection | LocalPackageAnalyzer |
| src/localPackageManager.ts | ~100 | Package management | LocalPackageManager |
| src/localPackageTypes.ts | ~80 | Type definitions | LocalPackage, PackageRegistry |
| src/prompts.ts | 378 | LLM prompt templates | PromptTemplates class |
| src/metadataPrompts.ts | ~100 | Metadata prompts | MetadataPrompts class |

**Detected Frameworks**:
- openerd-nuxt3, element-plus, vuetify, quasar, primevue, ant-design-vue, naive-ui

**Detected Utilities**:
- vueuse, lodash, date-fns, axios, dayjs + 4 hybrids

---

### mcp-servers/filesystem/ (5 files)
| File | Lines | Purpose | Exports |
|------|-------|---------|---------|
| index.ts | ~10 | Main exports | readFile, writeFile, searchFiles |
| readFile.ts | ~30 | Read operations | `readFile(path)` |
| writeFile.ts | ~30 | Write operations | `writeFile(path, content)` |
| searchFiles.ts | ~50 | Search implementation | `searchFiles(pattern)` |
| pathUtils.ts | ~30 | Path utilities | Path validation functions |

**Injected As**: `filesystem` module in sandbox

---

### mcp-servers/bestcase/ (11 files)
| File | Lines | Purpose | Key Exports |
|------|-------|---------|------------|
| index.ts | ~30 | Main exports (12 functions) | All public functions |
| saveBestCase.ts | ~50 | Save v2.0 | `saveBestCase()` |
| loadBestCase.ts | ~40 | Load by ID | `loadBestCase(id)` |
| listBestCases.ts | ~30 | List all | `listBestCases()` |
| searchBestCases.ts | ~60 | Full-text search | `searchBestCases(query)` |
| findSimilarPages.ts | ~80 | Similarity search | `findSimilarPages()` |
| recommendCodeForPage.ts | 407 | Code recommendations | `recommendCodeForPage()` |
| saveFileCase.ts | ~50 | Save v3.0 | `saveFileCase()` |
| searchFileCases.ts | ~100 | Advanced search | findFilesByFunction(), findFilesByEntity(), findFilesByRole() |
| autoRecommend.ts | 441 | RAG recommendations | `autoRecommend()`, `analyzeAndRecommend()` |

**Injected As**: `bestcase` module in sandbox

---

### mcp-servers/guides/ (2 files)
| File | Lines | Purpose | Key Exports |
|------|-------|---------|------------|
| index.ts | 513 | Guide indexing & loading | `indexGuides()` + loading functions |
| preflight.ts | ~100 | Validation | `validateAPIs()`, `validateDependencies()` |

**Guide Categories**:
- guides/api/ (6 files) - gRPC & OpenAPI
- guides/error/ (1 file) - Error handling
- guides/ui/ (4 files) - UI components
- guides/workflow/ (2 files) - Workflows

---

### apps/web/ (3 source files)
| File | Type | Purpose |
|------|------|---------|
| nuxt.config.ts | Config | Nuxt 4.2.0 configuration |
| app.vue | Vue3 | Root component |
| server/api/agent/execute.post.ts | API | Server endpoint for execution |

**Dependencies**: ai-runner, nuxt, vue, vue-router

---

### scripts/ (21 files)

#### scan/ (4 files)
| File | Lines | Purpose |
|------|-------|---------|
| scan-files-ai.ts | 1,056 | Main AI-powered scanner |
| migrate-bestcases.ts | 398 | v2→v3 migration |
| migrate-filecase-ids.ts | ~80 | ID migration utility |
| validate-bestcases.ts | ~100 | Data validation |

#### test/ (11 files)
| File | Lines | Purpose |
|------|-------|---------|
| test-guides-integration.ts | ~150 | Guide system testing |
| test-yaml-parser.ts | ~100 | YAML parsing |
| test-mcp-server-flow.ts | ~200 | MCP protocol flow |
| test-metadata-analyzer.ts | ~150 | Metadata extraction |
| test-design-system-integration.ts | ~180 | Framework detection |
| test-import-support.ts | ~120 | Import handling |
| test-require-support.ts | ~100 | Require handling |
| test-iife-unwrap.ts | ~150 | IIFE preprocessing |
| test-multidimensional-scoring.ts | 442 | 8-D scoring |
| test-api-workflow.ts | 340 | API integration |
| validate-complete-workflow.ts | ~200 | End-to-end validation |

#### examples/ (7 files)
| File | Lines | Purpose |
|------|-------|---------|
| setup-sample-bestcase.ts | ~150 | Basic setup |
| setup-sample-bestcase-direct.ts | ~150 | Direct setup |
| recommend-page-code-example.ts | ~120 | Code recommendations |
| compare-bestcase-example.ts | ~100 | BestCase comparison |
| analyze-local-packages.ts | ~100 | Package analysis |

#### ci/ (1 file)
| File | Lines | Purpose |
|------|-------|---------|
| validate-docs-links.ts | ~80 | Link validation |

#### Root (1 file)
| File | Lines | Purpose |
|------|-------|---------|
| types.ts | ~100 | Shared type definitions |

---

### tests/ (1 file)
| File | Lines | Purpose | Tests |
|------|-------|---------|-------|
| cache-thresholds-keywords.test.ts | 502 | Cache + thresholds + keywords | LRU, env vars, thresholds, scoring |

---

### Root Entry Point
| File | Lines | Purpose |
|------|-------|---------|
| mcp-stdio-server.ts | 1,658 | Main MCP server + cache + handlers |

---

## Configuration Files

### TypeScript Configs
| File | Target | Purpose |
|------|--------|---------|
| tsconfig.base.json | Root | Base config for all packages |
| packages/ai-bindings/tsconfig.build.json | ES2022 | Build-specific |
| apps/web/tsconfig.json | ES2022 + Vue3 | Web app config |
| mcp-servers/guides/tsconfig.json | Node | Guide compilation |
| scripts/tsconfig.json | ES2022 | Script compilation |

### Package Configs
| File | Workspace | Type |
|------|-----------|------|
| package.json | root | Root workspace |
| packages/ai-bindings/package.json | ai-bindings | Package |
| packages/ai-runner/package.json | ai-runner | Package |
| packages/bestcase-db/package.json | bestcase-db | Package |
| packages/llm-analyzer/package.json | llm-analyzer | Package |
| mcp-servers/guides/package.json | guides | Package |
| apps/web/package.json | web | App |
| scripts/package.json | scripts | Scripts |

### Other Configs
| File | Purpose |
|------|---------|
| nuxt.config.ts | Nuxt 4.2.0 |
| .yarnrc.yml | Yarn Berry |
| .gitignore | Git rules |
| .env.example | Env template |

---

## Documentation Files (57 total)

### Quick Start (3 files)
- docs/README.md - Documentation index
- docs/QUICK_START_OTHER_PROJECTS.md
- docs/USAGE_GUIDE.md

### Architecture (3 files)
- docs/PROJECT_STRUCTURE.md
- docs/PROJECT_CONTEXT.md
- docs/PROCESS_SUMMARY.md

### Features (8 files)
- docs/BESTCASE_MIGRATION.md - v2→v3 migration
- docs/BESTCASE_PRIORITY_GUIDE.md
- docs/CODE_RECOMMENDATION_API.md
- docs/DESIGN_SYSTEM_USAGE.md - 7 frameworks
- docs/UTILITY_LIBRARY_USAGE.md - 9 utilities
- docs/LOCAL_PACKAGES.md
- docs/METADATA_SYSTEM.md
- docs/MULTIDIMENSIONAL_SCORING.md - 8 dimensions

### Integration (6 files)
- docs/MCP_SETUP_GUIDE.md
- docs/MCP_LOGGING_GUIDE.md
- docs/SANDBOX_USAGE_GUIDE.md
- docs/GUIDES_MCP_INTEGRATION.md
- docs/EXECUTE_WORKFLOW_EXAMPLES.md
- docs/ENHANCED_OPTIONS.md

### Deployment (7 files)
- docs/DOCKER_REBUILD_GUIDE.md
- docs/PRODUCTION_GUIDE.md
- docs/VSCODE_MCP_GUIDE.md
- docs/VSCODE_COPILOT_USAGE.md (56KB)
- docs/ENVIRONMENT_VARIABLES.md
- docs/WORKFLOW_CORRECT.md
- docs/TEST_GUIDE.md

### Root Documentation (3 files)
- README.md - Main project README
- CONTRIBUTING.md - Contribution guidelines
- TROUBLESHOOTING.md - Troubleshooting

### GitHub (8 files)
- .github/instructions/default.instructions.md
- .github/instructions/main.instructions.md
- .github/instructions/main-ultra-compact.md
- .github/instructions/00-bestcase-priority.md
- .github/instructions/bestcase-usage.md
- .github/PULL_REQUEST_TEMPLATE.md
- .github/ISSUE_TEMPLATE/bug_report.md
- .github/ISSUE_TEMPLATE/feature_request.md

### Guides (13 files)
**api/** (6 files):
- api-validation.md
- grpc-api-connection.md
- grpc-api-integration.md
- mandatory-api-detection.md
- openapi-api-connection.md
- openapi-integration.md

**error/** (1 file):
- error-handling.md

**ui/** (4 files):
- formatting-utilities.md
- openerd-nuxt3-components.md
- pagination-pattern.md
- routing-navigation.md

**workflow/** (2 files):
- core-workflow.md
- main-workflow.md

---

## Build Artifacts (Gitignored)

| Directory | Purpose | Contents |
|-----------|---------|----------|
| packages/*/dist/ | Package outputs | Compiled JS, type defs |
| mcp-servers/guides/dist/ | Guides output | Compiled guides |
| apps/web/.nuxt/ | Nuxt cache | Dev build cache |
| apps/web/.output/ | Nuxt build | Production output |
| node_modules/ | Dependencies | NPM packages |

---

## Statistics

### By Package
| Package | Files | Lines |
|---------|-------|-------|
| ai-bindings | 1 | 5 |
| ai-runner | 4 | 520 |
| bestcase-db | 5 | 1,500 |
| llm-analyzer | 15 | 6,500 |
| mcp-servers | 18 | 3,000+ |
| apps/web | 3 | 50 |
| scripts | 21 | 4,000+ |
| tests | 1 | 502 |
| mcp-stdio-server | 1 | 1,658 |
| **Total** | **72** | **18,530** |

### By Type
| Type | Count |
|------|-------|
| TypeScript source | 72 |
| Configuration files | 11 |
| Documentation files | 57 |
| Docker configs | 5 |
| Test files | 1 |

### Code Concentration (Top 10 files)
| File | % of Total |
|------|-----------|
| mcp-stdio-server.ts | 8.9% |
| scan-files-ai.ts | 5.7% |
| metadataAnalyzer.ts | 4.6% |
| utilityLibraryMapping.ts | 4.0% |
| fileCase.ts | 3.5% |
| localPackageAnalyzer.ts | 3.1% |
| guides/index.ts | 2.8% |
| test-cache-thresholds | 2.7% |
| scoreCalculator.ts | 2.7% |
| sandbox.ts | 2.6% |
| **Top 10 Total** | **40.6%** |

---

## File Relationships

### Import Chains

```
apps/web/app.vue
  ↓
apps/web/server/api/agent/execute.post.ts
  ↓
packages/ai-runner/src/agentRunner.ts
  ↓
packages/ai-bindings/src/index.ts
  ├─ mcp-servers/filesystem/index.ts
  ├─ mcp-servers/bestcase/index.ts
  └─ mcp-servers/guides/dist/index.ts
```

```
mcp-stdio-server.ts
  ├─ packages/ai-runner/dist/agentRunner.js
  ├─ packages/ai-runner/dist/projectContext.js
  ├─ mcp-servers/bestcase/index.ts (direct)
  ├─ mcp-servers/guides/dist/index.js (direct)
  ├─ packages/bestcase-db/dist/index.js (FileCaseStorage)
  └─ packages/llm-analyzer/src/metadataAnalyzer.js (MetadataAnalyzer)
```

### Data Flow

```
TypeScript Code (input)
  ↓
mcp-stdio-server.ts
  ├─ Sandbox (ai-runner/sandbox.ts)
  │   ├─ Preprocess (remove imports/IIFE)
  │   ├─ Execute in vm2
  │   ├─ Inject APIs (filesystem, bestcase, guides)
  │   └─ Return result
  │
  ├─ Cache Check (LRU)
  │   └─ If miss: query bestcase-db
  │
  ├─ Metadata Extract (if needed)
  │   └─ llm-analyzer/metadataAnalyzer.ts
  │
  └─ Store Result
      └─ FileCaseStorage (.mcp/filecases/)
```

---

## Build Dependency Order

```
1. bestcase-db       (no internal deps)
2. llm-analyzer      (depends: bestcase-db for types)
3. guides            (no internal deps)
4. ai-bindings       (depends: mcp-servers exports)
5. ai-runner         (depends: ai-bindings, vm2)
6. mcp-stdio-server  (depends: all above)
7. web               (depends: ai-runner)
```

---

## Key File Dependencies

### Critical Files (Most Dependencies)
1. **mcp-stdio-server.ts** - Main server (imports 6 modules)
2. **ai-runner/sandbox.ts** - Execution engine (imports MCP servers)
3. **llm-analyzer/metadataAnalyzer.ts** - Analysis (imports utilities)
4. **bestcase-db/fileCase.ts** - Storage (imports types)

### Shared Dependencies
- **types.ts** (scripts/) - Shared types
- **tsconfig.base.json** - Base TS config
- **types.ts** (bestcase-db) - Scoring types

### MCP Server Dependencies
All 12 exported functions in mcp-servers/bestcase/ depend on:
- bestcase-db/fileCase.ts
- bestcase-db/storage.ts
- llm-analyzer modules (for scoring/analysis)

---

Generated: 2025-11-17
