# 🤖 Dynamic AI Coding Agent Instructions

> **핵심 원칙**: 이 가이드는 **완전히 동적**입니다. 프로젝트 타입, 사용 가능한 bestcase, API 타입 등을 자동으로 감지하고 적응합니다.

---

## 🎯 핵심 철학: Pattern-Driven Development

1. **Never Code from Scratch** - Always find and use existing patterns first
2. **Bestcase-First Approach** - Search bestcases before writing any code
3. **Context-Aware** - Auto-detect project type, API style, framework
4. **Validate Before Deploy** - Use sandbox to test patterns
5. **Adapt Dynamically** - Adjust to what's actually available

---

## 📋 Universal Workflow (모든 작업에 적용)

### Step 1: Auto-Detect Project Context

```bash
# MCP Code Mode가 자동으로 감지하는 정보:
- API Type: gRPC, OpenAPI, REST, GraphQL, or mixed
- Framework: Nuxt 3, Next.js, Vue 3, React, etc.
- UI Library: openerd-nuxt3, element-plus, vuetify, etc.
- State Management: Pinia, Vuex, Redux, etc.
- Available Bestcases: 1979+ reference patterns
```

**Action**: MCP Code Mode의 `metadata.extractProjectContext()` 사용

### Step 2: Search Relevant Bestcases

```typescript
// 예시: 로그인 페이지 작성 시
// 1. "Login" 관련 bestcase 검색
// 2. 프로젝트와 유사한 패턴 찾기
// 3. API 타입 일치 확인
// 4. 컴포넌트 라이브러리 일치 확인
```

**Available**: 1979 bestcase files in `D:/01.Work/01.Projects/.bestcases`

**Search Patterns:**
- Management pages: `*Management*.json` (100+ files)
- Forms/Register: `*Register*.json`, `*Form*.json`
- Authentication: `*Login*.json`, `*Auth*.json`, `*middleware*.json`
- Tables/Lists: `*List*.json`, `*Table*.json`
- Composables: `*composables*.json` (200+ files)
- API Integration: `*grpc*.json`, `*api*.json`

### Step 3: Analyze & Extract Patterns

```typescript
// Bestcase 파일 구조:
{
  "id": "project-path--file-path",
  "projectName": "00.common/frontend_work-dir",
  "filePath": "middleware/auth.ts",
  "fileType": "ts|vue|js",
  "content": "실제 코드 내용",
  "metadata": {
    "patterns": ["authentication", "jwt", "middleware"],
    "frameworks": ["nuxt3"],
    "apiType": "grpc"
  }
}
```

**Key Extraction Points:**
1. Import statements → Dependencies & API types
2. Composable usage → Framework patterns
3. Component usage → UI library patterns
4. Error handling → Standard practices
5. Type definitions → API contracts

### Step 4: Apply Patterns with Context

**ALWAYS apply these filters:**

```typescript
// ✅ Pattern Matching Checklist
1. API Type Match
   - If project uses gRPC → Use gRPC bestcases
   - If project uses OpenAPI → Use OpenAPI bestcases

2. Component Library Match
   - If using openerd-nuxt3 → Use CommonTable, CommonButton
   - If using element-plus → Use el-table, el-button
   - If using custom → Find project-specific components

3. Framework Version Match
   - Nuxt 3 → Use Composition API, auto-imports
   - Vue 3 → Use Composition API explicitly
   - Older versions → Check for compatibility

4. Project Structure Match
   - Check folder structure (pages/, composables/, middleware/)
   - Follow existing naming conventions
   - Match import path patterns
```

### Step 5: Validate in Sandbox

```typescript
// MCP Code Mode Sandbox를 사용하여 검증
// - TypeScript 문법 검증
// - Import 해결 검증
// - 런타임 에러 사전 감지

const result = await runInSandbox(generatedCode);
if (!result.ok) {
  console.error("Fix required:", result.error);
}
```

---

## 🔍 Dynamic Pattern Detection

### Auto-Detect API Type

```typescript
// package.json에서 자동 감지
const apiType = detectApiType();

if (apiType === 'grpc') {
  // gRPC 패턴 사용
  // - proto types import
  // - useBackendClient("")
  // - Plain objects for requests
}
else if (apiType === 'openapi') {
  // OpenAPI 패턴 사용
  // - @~/openapi types
  // - API service classes
}
else if (apiType === 'mixed') {
  // 프로젝트 컨텍스트에 따라 적응
}
```

### Auto-Detect Component Library

```bash
# Dependencies를 분석하여 자동 감지:
- openerd-nuxt3 → CommonTable, CommonButton, CommonLayout
- element-plus → el-table, el-button, el-form
- vuetify → v-data-table, v-btn, v-form
- custom → Search bestcases for project patterns
```

### Auto-Detect Page Patterns

```typescript
// Bestcase에서 패턴 추출:
const patterns = await analyzeBestcases({
  type: 'page',
  features: ['search', 'table', 'pagination', 'crud']
});

// Common patterns found:
// 1. Management Page Pattern (검색 + 목록 + CRUD)
// 2. Form Page Pattern (입력 폼 + 검증 + 제출)
// 3. Detail Page Pattern (상세 조회 + 수정)
// 4. Dashboard Pattern (통계 + 차트 + 위젯)
```

---

## 📚 Bestcase Categories (1979 files)

### 1. **Framework Patterns** (200+ files)

**Middleware:**
- `*middleware-auth*.json` - JWT authentication
- `*middleware-maintenance*.json` - Maintenance mode

**Composables:**
- `*composables-grpc*.json` - gRPC client setup
- `*composables-api*.json` - REST API clients
- `*composables-*.json` - Custom business logic

**Layouts:**
- `*layouts*.json` - Page layout patterns

### 2. **Page Patterns** (1500+ files)

**Management Pages:**
```
*Management*.json files include:
- BrandManagement, CategoryManagement, GoodsManagement
- UserManagement, OrderManagement, etc.
- Pattern: Search filters + Table + CRUD buttons
```

**Form Pages:**
```
*Register*.json, *Edit*.json files include:
- Form validation patterns
- API submission patterns
- Error handling
```

**Detail Pages:**
```
*Detail*.json files include:
- Data loading patterns
- Display formatting
- Action buttons
```

### 3. **Component Patterns** (100+ files)

```
*components*.json files include:
- Reusable UI components
- Business logic components
- Layout components
```

### 4. **Utility Patterns** (50+ files)

```
*utils*.json, *helpers*.json files include:
- Format functions
- Validation helpers
- Common utilities
```

---

## 🎨 Standard Patterns by Feature Type

### Pattern A: Management Page (CRUD List)

**When to use:** 목록 조회 + 검색 + 수정/삭제 기능

**Bestcase Search:**
```bash
# Find: *Management*.json files
# Filter by: API type, component library
# Extract: Search form + Table + Pagination + CRUD patterns
```

**Required Elements:**
1. Search/Filter Section
2. Table with Pagination
3. CRUD Action Buttons
4. Route Query Sync
5. API Integration

**Dynamic Adaptation:**
```typescript
// API Type에 따라 자동 적응
if (apiType === 'grpc') {
  // Use proto types
  // Use useBackendClient("")
  // Plain object requests
}

// Component Library에 따라 자동 적응
if (hasComponent('CommonPaginationTable')) {
  // Use openerd-nuxt3 pattern
}
else if (hasComponent('el-table')) {
  // Use element-plus pattern
}
else {
  // Search bestcase for project-specific pattern
}
```

### Pattern B: Form Page (Create/Edit)

**When to use:** 데이터 입력/수정 폼

**Bestcase Search:**
```bash
# Find: *Register*.json, *Edit*.json, *Form*.json
# Extract: Form structure + Validation + Submit patterns
```

**Required Elements:**
1. Form Fields with Validation
2. Submit/Cancel Buttons
3. Error Handling
4. Success Redirect

### Pattern C: Detail Page (Read)

**When to use:** 상세 정보 조회

**Bestcase Search:**
```bash
# Find: *Detail*.json files
# Extract: Data loading + Display + Actions
```

### Pattern D: Dashboard Page

**When to use:** 통계/차트/위젯 페이지

**Bestcase Search:**
```bash
# Find: *Dashboard*.json, *Main*.json
# Extract: Widget layout + Chart integration
```

---

## 🔧 Dynamic Code Generation Rules

### Rule 1: Never Guess - Always Find

```typescript
// ❌ BAD: Guessing component names
<Table :data="list" />

// ✅ GOOD: Search bestcase for actual component
// 1. Search: grep "Table" in bestcases
// 2. Find: <CommonPaginationTable> in 50+ files
// 3. Use: The actual pattern found
<CommonPaginationTable :list="list" :headers="headers" />
```

### Rule 2: Match API Type Exactly

```typescript
// Auto-detect from package.json
const apiType = detectApiType();

// ❌ BAD: Using wrong API pattern
if (apiType === 'grpc') {
  // Don't use REST patterns
  await axios.get('/api/users'); // WRONG!
}

// ✅ GOOD: Using correct pattern from bestcase
if (apiType === 'grpc') {
  // Find gRPC pattern from bestcase
  const client = useBackendClient("");
  await client.getUsers(req); // CORRECT!
}
```

### Rule 3: Preserve UI Structure

```typescript
// ❌ BAD: Changing UI positions without reason
<CommonLayout title="Title">
  <template #btns>
    <!-- Moving buttons to different slot -->
  </template>
</CommonLayout>

// ✅ GOOD: Keep original UI structure from bestcase
// Check bestcase for exact slot usage and positions
```

### Rule 4: Handle Missing APIs Gracefully

```typescript
// If API is not implemented yet:

// ❌ BAD: Empty implementation
async function deleteItem() {
  // Empty - confusing!
}

// ✅ GOOD: Clear TODO with intended pattern
async function deleteItem() {
  // TODO: Delete API 구현 필요 (proto에 정의되어 있지 않음)
  // const confirmed = await useModal?.confirm("삭제하시겠습니까?");
  // if (!confirmed) return;
  // await client.deleteFAQ({ id })
  //   .then(() => { loadPage(); })
  //   .catch(async (error) => {
  //     await useModal?.error(error, "deleteFAQ");
  //   });
}
```

### Rule 5: Format All Display Values

```typescript
// Always use formatting utilities from ~/utils/format

// ❌ BAD: Raw values
{{ item.createdAt }}           // Shows timestamp object
{{ item.price }}               // Shows 1234567
{{ item.phone }}               // Shows 01012345678

// ✅ GOOD: Formatted values
{{ formatDateTime(item.createdAt) }}  // 2024-01-15 14:30:25
{{ formatNumber(item.price) }}        // 1,234,567
{{ formatPhoneNumber(item.phone) }}   // 010-1234-5678

// Import from project utils (not openerd-nuxt3)
import { formatNumber, formatDate, formatDateTime, formatPhoneNumber } from "~/utils/format";
```

---

## 🚀 Advanced: Multi-Project Adaptation

### Scenario: Working on Multiple Projects

```typescript
// MCP Code Mode automatically adapts to each project

Project A (Nuxt 3 + gRPC + openerd-nuxt3):
- Bestcases: Search "00.common-frontend_work-dir*"
- API Pattern: gRPC with proto types
- Components: CommonTable, CommonButton

Project B (Vue 3 + REST + element-plus):
- Bestcases: Search different project prefix
- API Pattern: Axios with OpenAPI
- Components: el-table, el-button

Project C (Next.js + GraphQL):
- Bestcases: Search Next.js patterns
- API Pattern: Apollo Client
- Components: Custom components
```

**Auto-Detection Process:**
1. Read `package.json` → Framework + API type
2. Search bestcases → Available patterns
3. Check components → UI library
4. Extract patterns → Exact code patterns
5. Apply with validation → Sandbox testing

---

## 📖 Common Patterns Reference

### gRPC Integration Pattern

```typescript
// From bestcase: *grpc*.json

// 1. Client Setup
const client = useBackendClient(""); // Empty string = global loading

// 2. Request (Plain Object)
const req = {
  page: 1,
  limit: 10,
  title: "search keyword"
};

// 3. API Call with Error Handling
await client.methodName(req)
  .then((response) => {
    list.value = response.items;
    paging.total.value = response.totalCount;
  })
  .catch(async (error) => {
    await useModal?.error(error, "methodName");
  });

// 4. Proto Timestamp Handling (automatic in formatDate)
const date = formatDate(item.createdAt); // Handles { seconds: number }
```

### CommonPaginationTable Pattern

```typescript
// From bestcase: *Management*.json files

// 1. Headers (value = actual field name)
const headers: CommonTableHeader[] = [
  { title: "순번", value: "index" },        // Custom field
  { title: "제목", value: "title" },        // item.title
  { title: "작성일", value: "createdAt" }   // item.createdAt
];

// 2. Data
const list = ref<ResponseType[]>([]);
const selectedItems = ref<ResponseType[]>([]);

// 3. Pagination (local=false for auto-load)
const paging = usePaging(1, 10, 0, loadPage, false, [
  { title: "10개", value: "10", isDefault: true },
  { title: "50개", value: "50" }
]);

// 4. Template
<CommonPaginationTable
  v-model:selected="selectedItems"
  :list="list"
  :headers="headers"
  :paging="paging"
  check-type="checkbox"
>
  <template #index="{ index }">
    <td class="text-center">
      {{ (paging.page.value - 1) * paging.limit.value + index + 1 }}
    </td>
  </template>
  <template #createdAt="{ element }">
    <td>{{ formatDateTime(element.createdAt) }}</td>
  </template>
</CommonPaginationTable>
```

### Route Query Sync Pattern

```typescript
// From bestcase: Multiple *Management*.json files

// 1. Request State
const request = ref({
  page: 1,
  limit: 10,
  keyword: ""
});

// 2. Watch Route (immediate: true)
watch(
  () => route.query,
  () => {
    request.value = {
      page: Number(route.query.page ?? 1),
      limit: Number(route.query.limit ?? 10),
      keyword: String(route.query.keyword ?? "")
    };
  },
  { immediate: true }
);

// 3. Search Updates URL
function search() {
  const query: Record<string, any> = {
    page: 1,
    limit: request.value.limit
  };
  if (request.value.keyword) {
    query.keyword = request.value.keyword;
  }
  return navigateTo({ path: route.path, query });
}
```

---

## ⚡ Quick Reference

### DO's ✅

1. **ALWAYS search bestcases first** before writing code
2. **ALWAYS match API type** (gRPC vs OpenAPI vs REST)
3. **ALWAYS use project utilities** (`~/utils/format`)
4. **ALWAYS preserve UI structure** from original patterns
5. **ALWAYS use navigateTo()** instead of router.push()
6. **ALWAYS format display values** (numbers, dates, phones)
7. **ALWAYS handle errors** with useModalState()
8. **ALWAYS use TODO comments** for unimplemented APIs

### DON'Ts ❌

1. **NEVER guess component names** - Search bestcases
2. **NEVER use wrong API pattern** - Match detected type
3. **NEVER move UI elements** - Preserve structure
4. **NEVER leave empty implementations** - Use TODO comments
5. **NEVER use router.push()** - Use navigateTo()
6. **NEVER show raw values** - Always format
7. **NEVER call loadPage in route.query watch** - usePaging does it
8. **NEVER import from openerd-nuxt3/utils** - Use ~/utils

---

## 🎓 Learning from Bestcases

### How to Extract Patterns

```typescript
// Example: Need to implement user management page

// 1. Search similar bestcases
const similarFiles = findBestcases({
  pattern: "*UserManagement*.json",
  fallback: "*Management*.json"
});

// 2. Read and compare
for (const file of similarFiles) {
  const content = readBestcase(file);

  // Extract:
  // - Import statements → Dependencies
  // - Component usage → UI patterns
  // - API calls → Integration patterns
  // - Error handling → Standard practices
  // - Formatting → Display patterns
}

// 3. Identify common patterns
const commonPatterns = {
  imports: [...],
  components: [...],
  apiCalls: [...],
  errorHandling: [...],
  formatting: [...]
};

// 4. Apply to current work
// Use the most common pattern across all similar bestcases
```

---

## 📝 Final Checklist

Before submitting any code:

- [ ] Searched bestcases for similar feature?
- [ ] Matched API type (gRPC/OpenAPI/REST)?
- [ ] Used correct component library?
- [ ] Preserved UI structure?
- [ ] All display values formatted?
- [ ] Error handling implemented?
- [ ] Route navigation uses navigateTo()?
- [ ] Unimplemented APIs have TODO comments?
- [ ] Tested pattern in sandbox if possible?
- [ ] Followed project naming conventions?

---

## 🔗 Resources

- **Bestcases**: `D:/01.Work/01.Projects/.bestcases` (1979 files)
- **MCP Config**: `.mcp/` directory
- **API Type Detection**: Automatic from package.json
- **Sandbox Testing**: Built-in TypeScript validation
- **Pattern Validation**: 93.9% success rate with real code

---

## 💡 Pro Tips

1. **Use MCP metadata API** to extract project context automatically
2. **Search bestcases by keywords** instead of exact file names
3. **Combine multiple bestcases** to get complete pattern
4. **Validate in sandbox** before deploying to project
5. **Update guide** when discovering new patterns
6. **Share bestcases** from successfully implemented features
7. **Track pattern success** using sandbox test results

---

*이 가이드는 MCP Code Mode의 메타데이터 분석과 bestcase 패턴 추출을 기반으로 동적으로 동작합니다. 새로운 프로젝트나 패턴이 추가되면 자동으로 적응합니다.*
