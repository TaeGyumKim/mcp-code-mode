# 🚀 외부 프로젝트에서 Ultra Compact 지침 사용하기

## ✅ 올바른 설정 방법 (2024년 11월 기준)

### 1단계: `.vscode/settings.json` 생성

외부 프로젝트 루트에 다음 파일 생성:

**파일: `.vscode/settings.json`**

```json
{
  "github.copilot.chat.instructionFiles": [
    "d:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/main-ultra-compact.md"
  ]
}
```

### 2단계: VS Code 재시작

설정 적용을 위해 VS Code 창을 완전히 닫고 다시 열기

### 3단계: Copilot Chat에서 확인

```
@workspace 현재 적용된 지침이 뭐야?
```

또는

```
상품 목록 페이지 만들어줘
```

→ AI가 BestCase, Guides 우선순위를 언급하면 성공!

---

## 📋 프로젝트별 설정 예시

### 예시 1: frontend-airspace (Nuxt3 + OpenAPI)

**파일: `D:/01.Work/01.Projects/49.airian/frontend-airspace/.vscode/settings.json`**

```json
{
  "github.copilot.chat.instructionFiles": [
    "d:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/main-ultra-compact.md"
  ]
}
```

### 예시 2: 지침 파일 복사 방식 (권장)

```bash
# 1. 지침 파일들을 프로젝트로 복사
mkdir -p .github/instructions
cp d:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/main-ultra-compact.md .github/instructions/

# 2. 상대 경로로 설정
```

**파일: `.vscode/settings.json`**

```json
{
  "github.copilot.chat.instructionFiles": [
    ".github/instructions/main-ultra-compact.md"
  ]
}
```

---

## 🔍 제대로 동작하는지 확인하는 방법

### 방법 1: Chat에서 직접 테스트

```
@workspace executeWorkflow가 뭐야?
```

**올바른 응답:**
> "executeWorkflow는 5단계 파이프라인을 실행하는 함수입니다..."

**잘못된 응답:**
> "그런 함수에 대해 잘 모르겠습니다..."

### 방법 2: 실제 코딩 요청

```
상품 상세 페이지를 Nuxt3로 만들어줘. OpenAPI 사용.
```

**지침이 적용되면:**
- BestCase 우선순위 언급
- OpenAPI 가이드라인 참조
- `pages/products/[id].vue` 생성
- OpenAPI 클라이언트 자동 설정

**지침이 없으면:**
- 일반적인 Nuxt 페이지만 생성
- API 연동 없음

---

## 🚨 문제 해결

### 문제: "지침이 적용되지 않는 것 같아요"

#### 체크리스트

1. **파일 경로 확인**
```bash
# PowerShell
Test-Path "d:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/main-ultra-compact.md"
# → True 나와야 함
```

2. **settings.json 문법 확인**
```json
{
  "github.copilot.chat.instructionFiles": [
    "경로는 문자열 배열"
  ]
}
```

3. **VS Code 재시작**
- 완전히 종료 후 재시작
- Copilot Chat 창 새로고침

4. **Copilot 확장 버전 확인**
- 최신 버전인지 확인 (v0.12.0 이상 권장)

### 문제: "MCP 서버는 연결되는데 지침은 안 보여요"

**이해해야 할 점:**

MCP 서버와 지침 파일은 **별개**입니다:

```
┌─────────────────────────────────────┐
│ VS Code Copilot Chat                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 지침 파일 (main-ultra-compact) │ │
│ │ → AI에게 작업 가이드 제공      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ MCP 서버 (mcp.json)            │ │
│ │ → 프로젝트 파일 읽기/검색      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**지침 파일만 있어도 작동합니다!**

MCP 서버는 선택 사항입니다.

---

## 📊 비교: 지침 있음 vs 없음

### 지침 없을 때

```
사용자: "상품 목록 페이지 만들어줘"

AI:
pages/products/index.vue 생성...
<template>
  <div>상품 목록</div>
</template>
```

### Ultra Compact 지침 적용 시

```
사용자: "상품 목록 페이지 만들어줘"

AI:
1. BestCase 확인 → frontend-airspace는 OpenAPI 사용 중
2. 가이드라인 검색 → openapi-integration 적용
3. 코드 생성:

// composables/useProducts.ts (OpenAPI 클라이언트)
export const useProducts = () => {
  const { $api } = useNuxtApp()
  return {
    getProducts: () => $api.products.list()
  }
}

// pages/products/index.vue (Tailwind 스타일)
<template>
  <div class="container mx-auto px-4">
    <h1 class="text-2xl font-bold mb-4">상품 목록</h1>
    <div v-for="product in products" :key="product.id" 
         class="border rounded-lg p-4 mb-4">
      {{ product.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { getProducts } = useProducts()
const { data: products } = await useAsyncData('products', getProducts)
</script>
```

---

## ✅ 최종 체크

### 현재 프로젝트 (mcp-code-mode-starter)

- [x] `.vscode/settings.json` 생성 ✅
- [x] `main-ultra-compact.md` 존재 ✅
- [x] Docker MCP 서버 실행 중 ✅

### 외부 프로젝트 적용

```json
// D:/01.Work/01.Projects/49.airian/frontend-airspace/.vscode/settings.json
{
  "github.copilot.chat.instructionFiles": [
    "d:/01.Work/08.rf/mcp-code-mode-starter/.github/instructions/main-ultra-compact.md"
  ]
}
```

**이제 VS Code를 재시작하고 Copilot Chat에서 테스트해보세요!** 🎉
