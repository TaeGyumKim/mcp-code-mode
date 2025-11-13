/**
 * 메타데이터 추출 프롬프트 템플릿
 *
 * 점수 산출 대신 구조화된 메타데이터를 추출하여
 * 동적 지침 로딩 시스템의 키워드로 활용
 */

export class MetadataPrompts {
  /**
   * API/Composable 파일 메타데이터 추출
   */
  static extractFileMetadata(filePath: string, content: string): string {
    const shortContent = content.substring(0, 3000);
    const linesOfCode = content.split('\n').length;

    return `You are an expert code analyzer. Extract structured metadata from this code file.

File: ${filePath.split('\\').pop()}
Lines of Code: ${linesOfCode}

Code:
\`\`\`typescript
${shortContent}
\`\`\`

**Extract the following metadata:**

1. **Patterns**: Design patterns used (e.g., "interceptor", "queue", "state-machine", "factory", "singleton", "observer", "repository")
2. **Frameworks**: Libraries/frameworks detected (e.g., "vue", "nuxt3", "pinia", "@grpc/grpc-js", "axios", "zod")
3. **Design System**: UI design system detected (e.g., "openerd-nuxt3", "element-plus", "vuetify", "quasar", "primevue", "ant-design-vue", "naive-ui") - based on component naming patterns like CommonButton, ElButton, VBtn, etc.
4. **Utility Library**: Utility library detected (e.g., "vueuse", "lodash", "date-fns", "axios", "dayjs") - based on usage patterns like useLocalStorage, _.debounce, format(), etc.
5. **API Type**: API technology used ("grpc", "openapi", "rest", or "none")
6. **API Methods**: List of API method names (e.g., ["getUserList", "createUser", "updateUser"])
7. **Complexity**: Code complexity level
   - "trivial": < 10 lines, minimal logic
   - "low": 10-50 lines, simple logic
   - "medium": 50-100 lines, moderate logic
   - "high": 100-200 lines, complex logic
   - "very-high": 200+ lines, very complex logic
8. **Reusability**: How reusable is this code ("low", "medium", "high")
9. **Error Handling**: Error handling quality
   - "none": No error handling
   - "basic": Basic try-catch or if-checks
   - "comprehensive": Detailed error handling with types, logging, recovery
10. **Type Definitions**: TypeScript quality
   - "poor": Lots of 'any', no interfaces
   - "basic": Some types, some 'any'
   - "good": Proper types, minimal 'any'
   - "excellent": Full types, generics, type guards, no 'any'
11. **Dependencies**: External libraries imported
12. **Composables Used**: Composable functions called (e.g., ["useRoute", "useRouter", "usePaging", "useAlert"])
13. **Entities**: Domain entities handled (e.g., ["User", "Order", "Product", "Inquiry"])
14. **Features**: Main features implemented (e.g., ["pagination", "search", "CRUD", "authentication", "caching"])
15. **Has Documentation**: Does it have JSDoc or meaningful comments?
16. **Is Excellent**: Is this excellent reusable code worth extracting as a pattern?
17. **Excellent Reasons**: If excellent, why? (list of reasons)

**Response format (JSON only):**
\`\`\`json
{
  "patterns": ["interceptor", "error-recovery"],
  "frameworks": ["@grpc/grpc-js", "nuxt3"],
  "designSystem": "openerd-nuxt3",
  "utilityLibrary": "vueuse",
  "apiType": "grpc",
  "apiMethods": ["getUserList", "createUser"],
  "complexity": "high",
  "reusability": "high",
  "errorHandling": "comprehensive",
  "typeDefinitions": "excellent",
  "dependencies": ["@grpc/grpc-js", "@grpc/credentials"],
  "composablesUsed": ["useRoute", "useRuntimeConfig"],
  "entities": ["User"],
  "features": ["api-client", "interceptor", "error-handling"],
  "hasDocumentation": true,
  "isExcellent": true,
  "excellentReasons": ["Proper interceptor pattern", "Comprehensive error handling", "Full TypeScript types", "Well documented"]
}
\`\`\`

Respond with JSON only (no markdown, no explanation).`;
  }

  /**
   * Vue 컴포넌트 메타데이터 추출
   */
  static extractComponentMetadata(
    filePath: string,
    templateContent: string,
    scriptContent: string
  ): string {
    const shortTemplate = templateContent.substring(0, 2000);
    const shortScript = scriptContent.substring(0, 2000);
    const templateLines = templateContent.split('\n').length;
    const scriptLines = scriptContent.split('\n').length;
    const totalLines = templateLines + scriptLines;

    return `You are an expert Vue.js analyzer. Extract structured metadata from this component.

File: ${filePath.split('\\').pop()}
Template Lines: ${templateLines}
Script Lines: ${scriptLines}
Total Lines: ${totalLines}

Template:
\`\`\`vue
${shortTemplate}
\`\`\`

Script:
\`\`\`typescript
${shortScript}
\`\`\`

**Extract the following metadata:**

1. **Patterns**: Component patterns (e.g., "slot-forwarding", "v-model", "provide-inject", "renderless", "scoped-slots")
2. **Frameworks**: UI libraries (e.g., "tailwind", "openerd-nuxt3", "headlessui")
3. **Design System**: UI design system detected (e.g., "openerd-nuxt3", "element-plus", "vuetify", "quasar", "primevue", "ant-design-vue", "naive-ui") - based on component naming patterns
4. **Utility Library**: Utility library detected (e.g., "vueuse", "lodash", "date-fns", "axios", "dayjs") - based on usage patterns
5. **Components Used**: Child components (e.g., ["CommonTable", "CommonButton", "CommonInput"])
6. **Composables Used**: Composables called (e.g., ["usePaging", "useRoute", "useAsyncData", "useAlert"])
7. **v-Model Bindings**: Analyze v-model usage
   - name: variable name
   - component: component using v-model
   - hasWatch: is there a watch for this variable?
   - hasValidation: is there validation logic?
   - hasTypeDefinition: is it properly typed?
8. **Complexity**: Component complexity
   - "trivial": Empty or placeholder
   - "low": Simple display component
   - "medium": Some logic, few composables
   - "high": Multiple composables, complex logic
   - "very-high": Full CRUD page with many features
9. **Reusability**: Reusability level
10. **Error Handling**: Error handling quality
11. **Type Definitions**: TypeScript quality
12. **Features**: Features implemented (e.g., ["CRUD", "search", "pagination", "filtering", "export", "drag-drop"])
13. **Entities**: Entities handled (e.g., ["User", "Order"])
14. **Has Loading States**: Does it handle loading states (pending, loading, etc)?
15. **Has Error States**: Does it handle error states?
16. **Is Excellent**: Is this excellent component worth reusing?
17. **Excellent Reasons**: If excellent, why?
18. **Excellent Patterns**: Specific excellent patterns found

**Response format (JSON only):**
\`\`\`json
{
  "patterns": ["slot-forwarding", "v-model"],
  "frameworks": ["tailwind", "openerd-nuxt3"],
  "designSystem": "openerd-nuxt3",
  "utilityLibrary": "vueuse",
  "componentsUsed": ["CommonTable", "CommonButton"],
  "composablesUsed": ["usePaging", "useRoute", "useAsyncData"],
  "vModelBindings": [
    {
      "name": "searchQuery",
      "component": "CommonInput",
      "hasWatch": true,
      "hasValidation": false,
      "hasTypeDefinition": true
    }
  ],
  "complexity": "high",
  "reusability": "medium",
  "errorHandling": "comprehensive",
  "typeDefinitions": "good",
  "features": ["CRUD", "search", "pagination"],
  "entities": ["User"],
  "hasLoadingStates": true,
  "hasErrorStates": true,
  "isExcellent": true,
  "excellentReasons": ["Proper composition API usage", "Loading and error states handled", "Clean separation of concerns"],
  "excellentPatterns": ["useAsyncData integration", "usePaging pattern", "error toast handling"]
}
\`\`\`

Respond with JSON only (no markdown, no explanation).`;
  }

  /**
   * 우수 코드 패턴 감지
   */
  static detectExcellentPatterns(filePath: string, content: string): string {
    const shortContent = content.substring(0, 4000);

    return `You are an expert at identifying reusable code patterns. Find excellent code snippets in this file.

File: ${filePath.split('\\').pop()}

Code:
\`\`\`typescript
${shortContent}
\`\`\`

**Identify excellent code snippets that are:**
- Reusable across projects
- Demonstrate best practices
- Well-structured and documented
- Solve common problems elegantly

**For each excellent snippet, provide:**
1. **Lines**: Line range (e.g., "15-42")
2. **Patterns**: Patterns used (e.g., ["interceptor", "error-recovery"])
3. **Reason**: Why it's excellent (concise)
4. **Usage Context**: When to use this pattern
5. **Reusable**: Is it reusable? (true/false)
6. **Tags**: Keywords for searching (e.g., ["grpc", "error-handling", "nuxt3"])

**Response format (JSON only):**
\`\`\`json
{
  "hasExcellentCode": true,
  "snippets": [
    {
      "lines": "15-42",
      "patterns": ["interceptor", "error-logging"],
      "reason": "Clean interceptor pattern with proper error handling and logging",
      "usageContext": "Use for gRPC client setup with request/response interception",
      "reusable": true,
      "tags": ["grpc", "interceptor", "error-handling", "nuxt3"]
    }
  ]
}
\`\`\`

If no excellent code found:
\`\`\`json
{
  "hasExcellentCode": false,
  "snippets": []
}
\`\`\`

Respond with JSON only (no markdown, no explanation).`;
  }

  /**
   * 빠른 분류 (lightweight)
   */
  static quickClassification(filePath: string, content: string): string {
    const shortContent = content.substring(0, 1000);

    return `Quickly classify this code file.

File: ${filePath.split('\\').pop()}
Code (first 1000 chars):
\`\`\`
${shortContent}
\`\`\`

Respond with JSON only:
{
  "category": "composable" | "component" | "api" | "utility" | "page" | "other",
  "hasAPI": true/false,
  "hasComponents": true/false,
  "worthDeepAnalysis": true/false,
  "estimatedComplexity": "trivial" | "low" | "medium" | "high" | "very-high"
}`;
  }
}
