# Getting Started with MCP Code Mode

> **Learn how to use MCP Code Mode in 10 minutes**

This guide teaches you the fundamentals of MCP Code Mode and how to use it effectively with VS Code Copilot.

---

## 📖 Table of Contents

1. [What is MCP Code Mode?](#what-is-mcp-code-mode)
2. [Core Concepts](#core-concepts)
3. [Your First Task](#your-first-task)
4. [Understanding the Workflow](#understanding-the-workflow)
5. [Advanced Features](#advanced-features)
6. [Best Practices](#best-practices)

---

## 🎯 What is MCP Code Mode?

### The Problem

Traditional MCP servers use **file reading tools** that consume massive tokens:

```
LLM → read_file(large_file.ts) → Server → 500KB response → LLM
Result: 150,000 tokens consumed
```

### The Solution

MCP Code Mode uses **sandbox execution** for 98% token reduction:

```
LLM → execute(smart_code) → Sandbox processes → 10-line summary → LLM
Result: 2,000 tokens consumed (98% reduction!)
```

### Key Benefits

- ✅ **98% token reduction** - Process data in sandbox, return only summaries
- ✅ **Automatic context loading** - RAG recommendations, guides, project analysis
- ✅ **Type-safe execution** - Full TypeScript support with all project types
- ✅ **Zero hallucination** - Direct file access, no made-up APIs

---

## 🧩 Core Concepts

### 1. The `execute` Tool

There's **only ONE tool**: `execute(code, autoRecommend?)`

```typescript
// LLM writes TypeScript code
const code = `
  const files = await filesystem.searchFiles({
    path: '/projects/myapp',
    pattern: '**/*.vue',
    recursive: true
  });

  return { count: files.files.length };
`;

// Sandbox executes and returns result
// { count: 42 }
```

### 2. Auto-Context System

When you provide `autoRecommend`, the server automatically:

1. **Fetches similar code** via RAG (hybrid keyword + vector search)
2. **Finds best practices** based on multi-dimensional scores
3. **Loads relevant guides** based on keywords
4. **Extracts project context** (API type, design system, etc.)
5. **Injects everything into `context`** variable

```typescript
// Available in every execution:
context.recommendations       // Similar code examples
context.bestPracticeExamples // High-scoring files
context.guides                // Relevant documentation
context.projectContext        // Project analysis
```

### 3. Sandbox APIs

Four main API groups available in sandbox:

#### filesystem - File Operations
```typescript
await filesystem.readFile({ path: '/projects/myapp/file.ts' })
await filesystem.writeFile({ path: '/projects/myapp/new.ts', content: '...' })
await filesystem.searchFiles({ path: '/projects/myapp', pattern: '**/*.vue' })
```

#### bestcase - Code Search
```typescript
await bestcase.searchFileCases({
  keywords: ['pagination', 'table'],
  fileRole: 'page'
})
```

#### guides - Documentation
```typescript
await guides.searchGuides({ keywords: ['grpc', 'api'], apiType: 'grpc' })
await guides.combineGuides({ ids: ['grpc.api.connection', 'error.handling'] })
```

#### metadata - Project Analysis
```typescript
await metadata.extractProjectContext('/projects/myapp')
```

---

## 🚀 Your First Task

Let's build a complete feature using MCP Code Mode.

### Scenario: Add Search to Member Management Page

**Project:** `frontend-admin`
**File:** `pages/memberManagement.vue`
**Goal:** Implement search, export, and pagination

### Step 1: Ask for Analysis

```
I'm working on pages/memberManagement.vue.
Can you analyze the current implementation and suggest improvements?
```

**What happens:**
1. LLM writes code to read and analyze the file
2. Sandbox executes with auto-context enabled
3. Returns analysis + similar code + best practices + guides

### Step 2: LLM Response Example

```markdown
## Current Analysis

✅ Has basic structure with `<template>` and `<script setup>`
❌ Missing search functionality
❌ Missing export to Excel
❌ Missing pagination

## Recommendations

Based on similar files in your project:
- Use `usePaging` composable for pagination
- Add `onSearch()` function with filters
- Use `downloadExcel()` for CSV export

I found 3 similar files:
1. pages/My/OrderHistory.vue (Score: 92/100)
   - Excellent pagination implementation
   - Good error handling
2. pages/Category/[id].vue (Score: 88/100)
   - Clean search filters
```

### Step 3: Request Implementation

```
Perfect! Please implement search, pagination, and export functionality.
```

**What LLM does:**
1. Writes code to read current file
2. Analyzes structure and dependencies
3. Generates improved version with all features
4. Returns diff or complete file

### Step 4: Review and Apply

```typescript
// LLM generates code like this:
const improved = `
<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { usePaging } from '~/composables/usePaging';

// Search filters
const filters = reactive({
  searchType: 'email',
  keyword: '',
});

// Pagination
const paging = usePaging(1, 10, members.value.length, loadPage);

function onSearch() {
  // Implementation
}

function downloadExcel() {
  // CSV export implementation
}
</script>
`;
```

You review, approve, and apply!

---

## 🔄 Understanding the Workflow

### Anthropic Code Mode Pattern

```mermaid
LLM Request
    ↓
Write Smart Code (TypeScript)
    ↓
execute({ code, autoRecommend })
    ↓
Sandbox Execution
  - Auto-loads context
  - Runs code safely
  - Processes files
    ↓
Returns Summary (10 lines)
    ↓
LLM Continues with Result
```

### Example: Find All gRPC API Calls

**Traditional MCP (❌ 150,000 tokens):**
```
1. read_file(file1.ts) → 50KB
2. read_file(file2.ts) → 60KB
3. read_file(file3.ts) → 45KB
... 100 files later ...
LLM processes 5MB of data
```

**Code Mode (✅ 2,000 tokens):**
```typescript
const files = await filesystem.searchFiles({
  path: '/projects/myapp',
  pattern: '**/*.ts',
  recursive: true
});

const grpcCalls = [];
for (const file of files.files.slice(0, 100)) {
  const content = await filesystem.readFile({ path: file });
  const matches = content.content.match(/grpcClient\.\w+\(/g);
  if (matches) {
    grpcCalls.push({ file, count: matches.length, methods: matches });
  }
}

return {
  totalFiles: files.files.length,
  filesWithGrpc: grpcCalls.length,
  topFiles: grpcCalls.slice(0, 5)  // Only top 5!
};
```

Result: `{ totalFiles: 342, filesWithGrpc: 28, topFiles: [...] }`

**Token savings: 98%** ✅

---

## 🎨 Advanced Features

### 1. Auto-Recommendation System

Enable automatic context loading:

```typescript
{
  code: "const result = await filesystem.readFile(...)",
  autoRecommend: {
    currentFile: "<full file content>",
    filePath: "pages/memberManagement.vue",
    description: "Implement search and pagination",
    maxGuides: 3,
    maxBestPractices: 3
  }
}
```

**What you get:**
- `context.recommendations` - Similar code (RAG search)
- `context.bestPracticeExamples` - High-quality examples
- `context.guides` - Relevant documentation
- `context.projectContext` - Project analysis

### 2. Multi-Dimensional Scoring

Files are scored across 8 dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| `apiConnection` | High | Proper API client usage |
| `errorHandling` | High | Try-catch, error states |
| `typeUsage` | Medium | TypeScript type coverage |
| `stateManagement` | Medium | Reactive state patterns |
| `designSystem` | Medium | UI component consistency |
| `structure` | Low | Code organization |
| `performance` | Low | Optimizations |
| `utilityUsage` | Low | Helper function usage |

**Find best practices by dimension:**

```typescript
// In your request:
autoRecommend: {
  ...,
  customKeywords: {
    errorHandling: ['try', 'catch', 'error', 'toast']
  },
  minScoreThreshold: {
    errorHandling: 80
  }
}
```

### 3. Design System Detection

Automatically detects and uses your UI framework:

**Supported Systems:**
- OpenERD Nuxt3 Components
- Element Plus
- Vuetify
- Ant Design
- Naive UI
- PrimeVue
- Quasar

**Usage:**
```typescript
const projectContext = await metadata.extractProjectContext('/projects/myapp');

console.log(projectContext.designSystemInfo.detected);
// ['openerd-nuxt3']

const tableComponent = metadata.getComponentForDesignSystem('openerd-nuxt3', 'table');
// { name: 'CommonTable', usage: '<CommonTable :data="items" />' }
```

### 4. Local Package Analysis

Automatically analyzes local dependencies:

```typescript
// package.json references:
{
  "dependencies": {
    "my-ui-lib": "workspace:*",           // Monorepo workspace
    "shared": "file:../shared",            // Local path
    "custom": "git+https://github.com/..." // Git URL
  }
}
```

**Auto-discovery:**
- Finds components/functions in local packages
- Extracts usage patterns
- Includes in recommendations

---

## 💡 Best Practices

### 1. **Process Data in Sandbox**

❌ **Bad** - Returning entire file:
```typescript
const file = await filesystem.readFile({ path: '/projects/huge.ts' });
return file.content;  // 50KB response!
```

✅ **Good** - Processing in sandbox:
```typescript
const file = await filesystem.readFile({ path: '/projects/huge.ts' });
const functions = file.content.match(/function \w+/g);
return { count: functions.length, names: functions.slice(0, 10) };
// 200 bytes response!
```

### 2. **Use Auto-Recommend**

Enable for better context:

```typescript
{
  autoRecommend: {
    currentFile: content,
    filePath: "pages/example.vue",
    description: "What you're building",
    maxGuides: 3,
    skipBestPracticeSearch: false  // Include best practices!
  }
}
```

### 3. **Leverage Project Context**

```typescript
// Always extract project context first
const ctx = await metadata.extractProjectContext('/projects/myapp');

// Use detected API type
if (ctx.apiInfo.type === 'grpc') {
  // Use gRPC-specific patterns
} else if (ctx.apiInfo.type === 'openapi') {
  // Use REST API patterns
}

// Use detected design system
const components = metadata.getComponentMap(ctx.designSystemInfo.detected[0]);
```

### 4. **Batch File Operations**

❌ **Bad** - Multiple tool calls:
```
// 100 separate read_file calls = 100 round trips
```

✅ **Good** - Single execute call:
```typescript
const results = [];
for (const file of files.files.slice(0, 100)) {
  const content = await filesystem.readFile({ path: file });
  results.push(analyzeFile(content));
}
return summary(results);  // One response!
```

### 5. **Return Structured Summaries**

```typescript
return {
  summary: "Found 28 API calls across 15 files",
  stats: {
    totalFiles: 342,
    filesWithAPI: 15,
    totalCalls: 28
  },
  topIssues: [
    { file: "x.ts", issue: "Missing error handling", severity: "high" }
  ],
  recommendations: [
    "Add try-catch to file x.ts line 42"
  ]
};
```

---

## 🔗 Next Steps

- **[WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)** - Detailed workflow examples
- **[SANDBOX_USAGE_GUIDE.md](./SANDBOX_USAGE_GUIDE.md)** - Complete API reference
- **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** - Understanding the scoring system
- **[MULTIDIMENSIONAL_SCORING.md](./MULTIDIMENSIONAL_SCORING.md)** - Advanced scoring features

---

## 🎓 Learn by Example

See **[EXECUTE_WORKFLOW_EXAMPLES.md](./EXECUTE_WORKFLOW_EXAMPLES.md)** for:

- Complete Vue CRUD implementation
- Multi-project analysis
- Type extraction from APIs
- Custom scoring dimensions
- And 10+ more examples

---

## ❓ FAQ

**Q: Do I need to learn the sandbox API?**
A: No! The LLM writes the sandbox code. You just describe what you want.

**Q: What if I want to read many files?**
A: Perfect use case! Process in sandbox, return summary. 98% token savings.

**Q: Can I use this with any project?**
A: Yes! Works with any language/framework. Auto-detects project structure.

**Q: How do I scan my project?**
A: See [QUICK_START_OTHER_PROJECTS.md](./QUICK_START_OTHER_PROJECTS.md)

**Q: What if something breaks?**
A: Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for solutions.
