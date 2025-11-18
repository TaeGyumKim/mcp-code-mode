# Workflow Guide

> **Master the MCP Code Mode workflow with practical examples**

This guide shows you the correct workflow patterns and common examples.

---

## 📋 Table of Contents

1. [The Correct Workflow](#the-correct-workflow)
2. [Common Workflow Patterns](#common-workflow-patterns)
3. [Complete Examples](#complete-examples)
4. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
5. [Advanced Workflows](#advanced-workflows)

---

## ✅ The Correct Workflow

### Overview

```
User Request
    ↓
LLM Analyzes Task
    ↓
LLM Writes TypeScript Code
    ↓
execute({ code, autoRecommend })
    ↓
Sandbox Execution
  • Auto-loads context (RAG + guides + project info)
  • Runs code safely
  • Processes files/data
  • Returns summary
    ↓
LLM Receives Summary (10-50 lines)
    ↓
LLM Generates Response
    ↓
User Reviews & Approves
```

### Key Principles

1. **LLM writes code, not you** - Describe what you want in natural language
2. **Process data in sandbox** - Never return entire files
3. **Return summaries** - 10-50 lines maximum
4. **Use auto-recommend** - Get context automatically
5. **Iterate if needed** - Refine based on results

---

## 🔄 Common Workflow Patterns

### Pattern 1: Analysis → Recommendation

**Use Case:** Analyze existing code and suggest improvements

```
Step 1: User Request
"Analyze pages/memberManagement.vue and suggest improvements"

Step 2: LLM Writes Analysis Code
execute({
  code: `
    const file = await filesystem.readFile({
      path: '/projects/myapp/pages/memberManagement.vue'
    });

    // Analysis logic
    const issues = [];
    if (!file.content.includes('try')) issues.push('No error handling');
    if (!file.content.includes('usePaging')) issues.push('Missing pagination');

    return { issues, recommendations: ['Add try-catch', 'Use usePaging'] };
  `,
  autoRecommend: {
    currentFile: '<file content>',
    filePath: 'pages/memberManagement.vue',
    description: 'Analyze and improve member management page'
  }
})

Step 3: Sandbox Returns Summary
{
  issues: ['No error handling', 'Missing pagination'],
  recommendations: ['Add try-catch', 'Use usePaging'],
  context: {
    recommendations: [/* similar files */],
    bestPracticeExamples: [/* high-quality examples */]
  }
}

Step 4: LLM Generates Recommendations
Based on analysis and similar files in your project,
I recommend:
1. Add error handling with try-catch
2. Implement pagination using usePaging composable
3. Add export to Excel functionality
```

### Pattern 2: Search → Extract → Summarize

**Use Case:** Find and summarize information across multiple files

```
Step 1: User Request
"Find all gRPC API calls in the project"

Step 2: LLM Writes Search Code
execute({
  code: `
    const files = await filesystem.searchFiles({
      path: '/projects/myapp',
      pattern: '**/*.ts',
      recursive: true
    });

    const apiCalls = [];
    for (const file of files.files.slice(0, 100)) {
      const content = await filesystem.readFile({ path: file });
      const matches = content.content.match(/grpcClient\.\w+\(/g);
      if (matches) {
        apiCalls.push({
          file,
          count: matches.length,
          methods: [...new Set(matches)]
        });
      }
    }

    return {
      totalFiles: files.files.length,
      filesWithGrpc: apiCalls.length,
      topFiles: apiCalls.sort((a,b) => b.count - a.count).slice(0, 10)
    };
  `
})

Step 3: Sandbox Returns Summary
{
  totalFiles: 342,
  filesWithGrpc: 28,
  topFiles: [
    { file: 'services/api.ts', count: 15, methods: ['listUsers', 'getUser'] },
    ...
  ]
}

Step 4: LLM Formats Response
Found 28 files with gRPC calls across 342 total files.

Top files by API call count:
1. services/api.ts (15 calls): listUsers, getUser, updateUser
2. pages/users.vue (8 calls): listUsers, deleteUser
...
```

### Pattern 3: Generate → Validate → Apply

**Use Case:** Create new code based on project patterns

```
Step 1: User Request
"Create a new CRUD page for Products"

Step 2: LLM Analyzes Project
execute({
  code: `
    // Find similar CRUD pages
    const similarPages = await bestcase.searchFileCases({
      keywords: ['crud', 'list', 'table'],
      fileRole: 'page',
      limit: 5
    });

    // Extract project context
    const ctx = await metadata.extractProjectContext('/projects/myapp');

    return {
      designSystem: ctx.designSystemInfo.detected,
      apiType: ctx.apiInfo.type,
      similarPages: similarPages.map(p => ({
        file: p.filePath,
        score: p.scores.total
      }))
    };
  `,
  autoRecommend: {
    currentFile: '',
    filePath: 'pages/products.vue',
    description: 'Create CRUD page for products',
    maxBestPractices: 3
  }
})

Step 3: LLM Generates Code
Based on your project patterns (Element Plus + OpenAPI):

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue';
import { usePaging } from '~/composables/usePaging';

const products = ref([]);
const paging = usePaging(1, 10, 0, loadPage);

async function loadPage(page: number, limit: number) {
  try {
    const response = await apiClient.listProducts({ page, limit });
    products.value = response.data;
    paging.total.value = response.total;
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

onMounted(() => loadPage(1, 10));
</script>

Step 4: User Reviews & Applies
```

---

## 💼 Complete Examples

### Example 1: Implement Search Functionality

**Task:** Add search to member management page

**Workflow:**

```typescript
// Step 1: Read and analyze current file
execute({
  code: `
    const file = await filesystem.readFile({
      path: '/projects/myapp/pages/memberManagement.vue'
    });

    // Check current implementation
    const hasSearch = /function.*search/i.test(file.content);
    const hasFilters = /filters.*reactive/.test(file.content);
    const hasPaging = /usePaging/.test(file.content);

    return {
      currentState: { hasSearch, hasFilters, hasPaging },
      recommendation: 'Add search with filters and integrate with pagination'
    };
  `,
  autoRecommend: {
    currentFile: '<member management content>',
    filePath: 'pages/memberManagement.vue',
    description: 'Add search functionality with filters',
    maxGuides: 3
  }
})

// Step 2: LLM generates implementation
// Step 3: User applies changes
```

### Example 2: Migrate to New API

**Task:** Replace REST API with gRPC

**Workflow:**

```typescript
// Step 1: Find all API calls
execute({
  code: `
    const files = await filesystem.searchFiles({
      path: '/projects/myapp/services',
      pattern: '*.ts',
      recursive: true
    });

    const apiCalls = {};
    for (const file of files.files) {
      const content = await filesystem.readFile({ path: file });
      const restCalls = content.content.match(/axios\.(get|post|put|delete)\(/g);
      if (restCalls) {
        apiCalls[file] = {
          count: restCalls.length,
          methods: restCalls
        };
      }
    }

    return {
      totalFiles: Object.keys(apiCalls).length,
      migrationPlan: Object.entries(apiCalls).map(([file, data]) => ({
        file,
        callsToMigrate: data.count
      }))
    };
  `,
  autoRecommend: {
    description: 'Migrate from REST to gRPC',
    customKeywords: { apiConnection: ['grpc', 'proto'] }
  }
})

// Step 2: LLM generates migration guide
// Step 3: Implement file by file
```

### Example 3: Extract Types from API

**Task:** Generate TypeScript types from gRPC proto definitions

**Workflow:**

```typescript
execute({
  code: `
    // Find proto files
    const protoFiles = await filesystem.searchFiles({
      path: '/projects/myapp',
      pattern: '**/*.proto',
      recursive: true
    });

    const types = [];
    for (const file of protoFiles.files) {
      const content = await filesystem.readFile({ path: file });

      // Extract message definitions
      const messages = content.content.matchAll(/message (\\w+) \\{([^}]+)\\}/g);
      for (const match of messages) {
        types.push({
          name: match[1],
          fields: match[2].split(';').filter(Boolean)
        });
      }
    }

    return {
      protoFiles: protoFiles.files.length,
      messageTypes: types.length,
      types: types.slice(0, 5)  // Sample
    };
  `
})
```

---

## ❌ Anti-Patterns to Avoid

### Anti-Pattern 1: Returning Entire Files

**❌ Wrong:**
```typescript
const file = await filesystem.readFile({ path: '/projects/huge.ts' });
return file.content;  // 50KB!
```

**✅ Correct:**
```typescript
const file = await filesystem.readFile({ path: '/projects/huge.ts' });
const summary = {
  linesOfCode: file.content.split('\n').length,
  functions: file.content.match(/function \w+/g)?.length || 0,
  imports: file.content.match(/^import .* from/gm)?.length || 0
};
return summary;  // 100 bytes
```

### Anti-Pattern 2: Multiple Tool Calls

**❌ Wrong:**
```
read_file(file1)
read_file(file2)
read_file(file3)
... 100 times
```

**✅ Correct:**
```typescript
const files = ['file1', 'file2', 'file3', ...];
const results = [];
for (const file of files) {
  const content = await filesystem.readFile({ path: file });
  results.push(analyze(content));
}
return summary(results);  // One call!
```

### Anti-Pattern 3: No Auto-Recommend

**❌ Wrong:**
```typescript
execute({ code: '...' })
// No context loaded
```

**✅ Correct:**
```typescript
execute({
  code: '...',
  autoRecommend: {
    currentFile: content,
    filePath: 'pages/example.vue',
    description: 'What you are building'
  }
})
// Auto-loads: recommendations + guides + project context
```

### Anti-Pattern 4: Ignoring Project Context

**❌ Wrong:**
```typescript
// Hardcoding component names
const code = `<ElTable ...>`;  // What if they use Vuetify?
```

**✅ Correct:**
```typescript
const ctx = await metadata.extractProjectContext('/projects/myapp');
const tableComponent = metadata.getComponentForDesignSystem(
  ctx.designSystemInfo.detected[0],
  'table'
);
// Uses correct component: <CommonTable> or <VDataTable> or <ElTable>
```

---

## 🚀 Advanced Workflows

### Workflow 1: Progressive Enhancement

Add features incrementally based on analysis:

```
1. Analyze current state
2. Identify missing features
3. Check best practices
4. Implement feature 1
5. Validate feature 1
6. Implement feature 2
7. ...
```

### Workflow 2: Multi-Project Analysis

Analyze patterns across multiple projects:

```typescript
execute({
  code: `
    const projects = ['project-a', 'project-b', 'project-c'];
    const patterns = {};

    for (const project of projects) {
      const files = await filesystem.searchFiles({
        path: \`/projects/\${project}\`,
        pattern: '**/*.vue',
        recursive: true
      });

      patterns[project] = {
        fileCount: files.files.length,
        // Analyze common patterns
      };
    }

    return {
      totalProjects: projects.length,
      patterns,
      commonPatterns: findCommonPatterns(patterns)
    };
  `
})
```

### Workflow 3: Guided Refactoring

Step-by-step refactoring with validation:

```
1. Scan codebase for issues
2. Categorize by severity
3. Generate refactoring plan
4. Execute highest priority
5. Validate changes
6. Repeat for next priority
```

---

## 📊 Workflow Metrics

### Token Efficiency

| Workflow | Traditional MCP | Code Mode | Savings |
|----------|----------------|-----------|---------|
| Analyze 100 files | 150,000 tokens | 3,000 tokens | 98% |
| Extract types | 80,000 tokens | 2,500 tokens | 97% |
| Find API calls | 120,000 tokens | 2,800 tokens | 98% |

### Time Efficiency

| Task | Manual | Code Mode | Speedup |
|------|--------|-----------|---------|
| Analyze codebase | 2 hours | 5 minutes | 24x |
| Generate CRUD | 1 hour | 2 minutes | 30x |
| Migrate APIs | 8 hours | 30 minutes | 16x |

---

## 🎯 Workflow Checklist

Before executing, verify:

- [ ] Task is clear and specific
- [ ] Processing happens in sandbox
- [ ] Returns summary, not raw data
- [ ] Auto-recommend enabled
- [ ] Leverages project context
- [ ] Uses design system detection
- [ ] Batch operations when possible
- [ ] Error handling included

---

## 📚 Related Documentation

- **[EXECUTE_WORKFLOW_EXAMPLES.md](./EXECUTE_WORKFLOW_EXAMPLES.md)** - 15+ detailed examples
- **[SANDBOX_USAGE_GUIDE.md](./SANDBOX_USAGE_GUIDE.md)** - Complete API reference
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Basics and core concepts
- **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** - Understanding scoring

---

## ❓ Workflow FAQ

**Q: How many execute calls per task?**
A: Usually 1-3. First for analysis, second for implementation, third for validation (if needed).

**Q: Should I read all files at once?**
A: No! Use searchFiles to find relevant ones, then process in batches.

**Q: How do I handle large responses?**
A: Process in sandbox, return only summaries. Never return entire files.

**Q: When should I use auto-recommend?**
A: Almost always! It provides valuable context automatically.

**Q: How do I debug failed executions?**
A: Check sandbox logs in Docker: `docker-compose logs -f mcp-code-mode-server`
