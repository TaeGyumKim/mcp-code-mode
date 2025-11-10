/**
 * 코드 분석 프롬프트 템플릿
 */

export class PromptTemplates {
  /**
   * 코드 품질 분석 프롬프트 (실제 프로젝트 기반 정교한 버전)
   */
  static apiQualityAnalysis(filePath: string, content: string): string {
    const shortContent = content.substring(0, 3000);
    
    return `You are an expert code reviewer analyzing real-world production code. Provide a PRECISE score from 0-100 based on ACTUAL complexity and quality.

File: ${filePath.split('\\').pop()}
Code:
\`\`\`typescript
${shortContent}
\`\`\`

**CRITICAL: Use the FULL 0-100 range. Most code is NOT 75-85!**

**90-100 (Exceptional - Rare!):**
Real examples from production:
- "paging.ts" (95/100): 200+ lines, computed/watch/onMounted, router sync, edge case handling, dual mode (local/remote), complex pagination algorithm, proper TypeScript generics
- "useAlert.ts" (92/100): Queue system with overflow control, TemplatePromise pattern, error parser, JSDoc comments, createInjectionState pattern, proper async handling
- "grpc.ts" (90/100): Interceptor pattern, context keys, fast-redact security, proper error types (ConnectError), loading state management

**Key traits for 90+:**
- 150+ lines of meaningful logic
- Multiple advanced patterns (interceptors, queues, state machines)
- Comprehensive error handling with specific types
- Proper TypeScript (generics, type guards, no 'any')
- JSDoc documentation
- Edge cases handled
- Production-grade patterns

**75-89 (Good Quality):**
Real examples:
- "auth.ts" (76/100): Multiple functions, data processing, API integration, BUT has repetitive code, missing error handling, no JSDoc
- Basic gRPC client setup with interceptors
- Token manager with refresh logic but missing edge cases

**Key traits for 75-89:**
- 50-150 lines
- Good structure, proper types
- Basic error handling
- Some patterns but not exceptional
- Functional but has minor issues

**55-74 (Average):**
Real examples:
- Simple utility functions with types (60-65)
- Basic composable with ref/reactive only (62-68)
- API wrapper without error handling (58-64)

**Key traits for 55-74:**
- 20-50 lines
- Works correctly but simple
- Basic TypeScript, some 'any'
- Minimal error handling
- No advanced patterns

**35-54 (Below Average):**
Real examples:
- "auth.ts" with lots of duplication (48/100)
- Functions missing validation (42/100)
- API calls with no error handling (45/100)

**Key traits for 35-54:**
- Poor structure, mixed concerns
- Missing types, using 'any'
- No error handling
- Code duplication

**0-34 (Poor):**
Real examples:
- "dark.ts" (28/100): Only 2 lines, just wraps vueuse, zero complexity
- "index.vue" (25/100): Empty page with commented code
- "Maintenance.vue" (15/100): Just "COMING SOON" text

**Key traits for 0-34:**
- < 10 lines of actual code
- No meaningful logic
- Placeholder/skeleton code
- Anti-patterns

**SCORING FORMULA:**
Base score by complexity:
- Trivial (< 10 lines): 0-30
- Simple (10-30 lines): 30-50
- Basic (30-80 lines): 50-70
- Moderate (80-150 lines): 60-80
- Complex (150+ lines): 70-90

Then adjust for quality:
- Full TypeScript, no 'any': +5-10
- Comprehensive error handling: +5-10
- Advanced patterns (interceptors, queues, etc): +10-15
- JSDoc/comments: +3-5
- Edge cases handled: +5-8
- Missing error handling: -10 to -15
- Using 'any': -5 to -10
- Code duplication: -8 to -12
- No validation: -5 to -10

**Examples:**
- 2-line wrapper = 25-30
- 15-line utility with types = 55-60
- 50-line composable with validation = 70-75
- 120-line with patterns + errors = 85-90
- 200-line with multiple patterns = 92-95

Respond with JSON only:
{
  "score": 67,
  "strengths": ["Proper TypeScript", "Clean structure"],
  "weaknesses": ["No error handling", "Missing validation", "Could use better patterns"],
  "recommendations": ["Add try-catch blocks", "Validate inputs", "Consider using interceptors"]
}`;
  }

  /**
   * Vue 컴포넌트 품질 분석 프롬프트 (실제 프로젝트 기반 정교한 버전)
   */
  static componentBindingAnalysis(filePath: string, templateContent: string, scriptContent: string): string {
    const shortTemplate = templateContent.substring(0, 2000);
    const shortScript = scriptContent.substring(0, 2000);
    
    return `You are an expert Vue.js reviewer analyzing real production components. Provide a PRECISE score from 0-100 based on ACTUAL complexity and quality.

File: ${filePath.split('\\').pop()}

Template:
\`\`\`vue
${shortTemplate}
\`\`\`

Script:
\`\`\`typescript
${shortScript}
\`\`\`

**CRITICAL: Use the FULL 0-100 range. Most components are NOT 70-80!**

**90-100 (Exceptional - Rare!):**
Real production examples:
- "ragManagement.vue" (92/100): 300+ lines, full CRUD page, search + pagination, API integration, composable usage (usePaging, useModalState), watch/computed, error handling with toast, loading states, multiple template slots, proper TypeScript
- "Table.vue" (90/100): 400+ lines, advanced reusable component, draggable headers/rows, resizable columns, dynamic slots, checkbox/radio selection, TypeScript interfaces, event handlers, refs manipulation
- "PaginationTable.vue" (85/100): Wrapper component with slot forwarding, v-model binding, watch for reactivity, composable integration, clean separation of concerns

**Key traits for 90+:**
- 150+ lines (template + script)
- Multiple slots with dynamic binding
- Composable usage (usePaging, useApi, useModal)
- API integration with error handling
- Loading/error/empty states
- watch/computed for reactivity
- Proper TypeScript with interfaces
- Event handling and state management

**70-89 (Good Component):**
Real examples:
- "PromiseAlert.vue" (74/100): Template promise pattern, conditional rendering (v-if), slots usage, computed props, BUT simple logic, no API calls, no validation
- Form with v-model, basic validation, API submission
- List component with v-for, slots, basic pagination

**Key traits for 70-89:**
- 60-150 lines
- Composition API with ref/reactive/computed
- Some slots or reusable patterns
- Basic state management
- Clean template structure
- Missing advanced features (loading states, comprehensive validation)

**45-69 (Average Component):**
Real examples:
- "login.vue" (52/100): 80 lines, v-model for form inputs, @click handlers, watchEffect, API calls (login/signup), BUT NO validation, NO error display in template, NO loading state, NO input sanitization
- Simple list rendering with v-for, no state management
- Basic form without validation or error handling

**Key traits for 45-69:**
- 30-80 lines
- Basic Vue features (v-model, v-for, @click, v-if)
- ref/reactive usage
- Missing validation, error handling, loading states
- No composables, simple reactive data only

**20-44 (Below Average):**
Real examples:
- "index.vue" (35/100): Almost empty page, just commented code and definePageMeta
- Component with mixed concerns, no separation
- Form with inline handlers, no structure

**Key traits for 20-44:**
- 10-30 lines
- Minimal functionality
- No proper structure
- Missing basic Vue patterns
- No TypeScript or very poor typing

**0-19 (Poor/Empty):**
Real examples:
- "Maintenance.vue" (15/100): Just "<div>COMING SOON</div>", no script logic, placeholder only
- Broken component, incomplete code
- No Vue features used

**Key traits for 0-19:**
- < 10 lines of actual code
- No meaningful logic
- Placeholder content only

**SCORING FORMULA:**
Base score by complexity:
- Empty/placeholder (< 10 lines): 0-20
- Minimal (10-40 lines): 20-45
- Simple (40-80 lines): 40-65
- Moderate (80-150 lines): 55-75
- Complex (150-300 lines): 70-88
- Very Complex (300+ lines): 85-95

Then adjust for features:
- Proper v-model usage: +5
- Form validation implemented: +10-15
- Error states/display in template: +8-12
- Loading states (spinner, skeleton): +5-8
- Composable integration: +8-12
- Multiple slots with bindings: +8-15
- API integration with error handling: +10-15
- watch/computed for reactivity: +5-8
- TypeScript with proper interfaces: +5-8
- Empty state handling: +3-5

Penalties:
- Missing validation in forms: -15 to -20
- No error handling in API calls: -12 to -18
- No loading states for async ops: -8 to -12
- Direct DOM manipulation: -15 to -20
- No TypeScript or many 'any': -8 to -12
- Inline styles instead of classes: -5 to -8
- No error display in template: -10 to -15

**Examples:**
- Empty placeholder = 10-20
- Simple form without validation = 45-55
- Form with v-model + validation + error display = 70-78
- List with pagination + composable = 72-80
- Full CRUD page with API + validation + states = 88-93
- Advanced reusable component with slots + draggable = 90-95

Respond with JSON only:
{
  "score": 58,
  "strengths": ["Uses Composition API", "Clean template structure", "Proper v-model"],
  "weaknesses": ["No form validation", "Missing error states in template", "No loading indicators", "No input sanitization", "No error boundary"],
  "recommendations": ["Add validation rules with vuelidate or zod", "Display API errors in template", "Add loading spinner for async operations", "Sanitize user inputs", "Add empty state handling"]
}`;
  }

  /**
   * 우수 코드 패턴 발견 프롬프트
   */
  static excellenceDetection(filePath: string, content: string): string {
    return `You are an expert code reviewer finding exceptional code patterns for BestCase examples.

Find excellent code patterns in this file that can serve as BestCase examples:

File: ${filePath}
\`\`\`typescript
${content}
\`\`\`

Look for:
- Exceptionally clean, readable code
- Innovative solutions
- Perfect implementations (error handling, type safety, performance)
- Reusable patterns
- Best practices examples

Extract top 3 code snippets (if any exist) with score >= 85:

Respond ONLY with valid JSON in this exact format:
{
  "hasExcellentCode": true,
  "snippets": [
    {
      "lines": "45-67",
      "category": "error-handling",
      "score": 95,
      "reason": "Comprehensive error interceptor with retry logic and user-friendly messages",
      "code": "actual code here",
      "usageContext": "When implementing gRPC error handling with retry",
      "reusable": true,
      "tags": ["error-handling", "grpc", "retry", "interceptor"]
    }
  ]
}`;
  }

  /**
   * 프로젝트 전체 품질 분석 프롬프트
   */
  static projectQualityAnalysis(
    projectName: string,
    fileAnalyses: Array<{ filePath: string; score: number; category: string }>
  ): string {
    const summary = fileAnalyses
      .map(f => `- ${f.filePath}: ${f.score}/100 (${f.category})`)
      .join('\n');

    return `You are a software architect analyzing overall project quality.

Project: ${projectName}

File analysis results:
${summary}

Provide overall assessment:

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": 75,
  "breakdown": {
    "apiQuality": 80,
    "componentQuality": 70,
    "codeExcellence": 75,
    "consistency": 80
  },
  "tier": "A",
  "tierByCategory": {
    "api": "A",
    "component": "B",
    "patterns": "A"
  },
  "strengths": [
    "Excellent API integration patterns",
    "Consistent error handling",
    "Good TypeScript usage"
  ],
  "weaknesses": [
    "Inconsistent component binding patterns",
    "Missing validation in some forms"
  ],
  "topFiles": [
    {
      "path": "composables/grpc.ts",
      "score": 95,
      "reason": "Perfect gRPC integration example"
    }
  ],
  "recommendations": [
    "Standardize v-model validation patterns",
    "Add more unit tests"
  ]
}`;
  }

  /**
   * 간단한 코드 분류 프롬프트 (빠른 필터링용)
   */
  static quickClassification(filePath: string, content: string): string {
    return `Classify this file quickly:

File: ${filePath}
Content (first 500 chars):
\`\`\`
${content.substring(0, 500)}
\`\`\`

Respond ONLY with valid JSON:
{
  "category": "composable" | "component" | "api" | "utility" | "page" | "other",
  "hasAPI": true,
  "hasComponents": true,
  "worthDeepAnalysis": true,
  "estimatedComplexity": "low" | "medium" | "high"
}`;
  }
}
