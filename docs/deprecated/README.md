# Deprecated Documentation

이 디렉토리의 문서들은 **더 이상 사용되지 않습니다**.

## ⚠️ 중요

점수 기반 시스템은 **메타데이터 기반 시스템**으로 완전히 대체되었습니다.

---

## 🔄 마이그레이션 가이드

### 기존 방식 (점수 기반) ❌

```typescript
{
  score: 85,
  strengths: ["Good API integration", "Clean code"],
  weaknesses: ["Needs better error handling"],
  tier: "A"
}
```

**문제점**:
- 주관적 점수 (0-100)
- 활용도 낮음
- 비교 어려움

---

### 새로운 방식 (메타데이터 기반) ✅

```typescript
{
  metadata: {
    patterns: ["interceptor", "error-recovery"],
    frameworks: ["@grpc/grpc-js", "nuxt3"],
    apiType: "grpc",
    apiMethods: ["getUserList", "createUser"],
    complexity: "high",
    reusability: "high",
    errorHandling: "comprehensive",
    typeDefinitions: "excellent",
    entities: ["User"],
    features: ["api-client", "pagination"],
    isExcellent: true,
    excellentReasons: [
      "Proper interceptor pattern",
      "Comprehensive error handling"
    ]
  },
  excellentReasons: [...]
}
```

**장점**:
- 객관적 정보
- 동적 지침 로딩과 통합
- 패턴 라이브러리 구축
- BestCase 비교 가능

---

## 📚 새로운 문서

점수 기반 시스템 대신 다음 문서를 참고하세요:

1. **[WORKFLOW_CORRECT.md](../WORKFLOW_CORRECT.md)** - 올바른 워크플로우
   - Anthropic MCP Code Mode 기반
   - 메타데이터 추출 → BestCase 비교 → TODO 생성
   - 94% 토큰 절감

2. **[METADATA_SYSTEM.md](../METADATA_SYSTEM.md)** - 메타데이터 시스템
   - 메타데이터 타입 정의
   - MetadataAnalyzer 사용법
   - 활용 사례

3. **[GUIDES_MCP_INTEGRATION.md](../GUIDES_MCP_INTEGRATION.md)** - 가이드 시스템
   - Sandbox API로 guides 제공
   - 동적 지침 로딩

---

## 🗑️ Deprecated 파일 목록

### SCORING_SYSTEM.md
- **내용**: 점수 시스템 구현 설명
- **대체**: METADATA_SYSTEM.md
- **마이그레이션**: `patterns.metadata` 필드 사용

### AI-SCORING-GUIDE.md
- **내용**: AI 기반 점수 분석 가이드
- **대체**: MetadataAnalyzer (packages/llm-analyzer)
- **마이그레이션**: `analyzer.analyzeProject()` 사용

---

## ⏰ Deprecated 날짜

**2025-11-11**: 메타데이터 시스템으로 완전 전환

---

**참고**: 기존 BestCase 데이터는 하위 호환성을 유지합니다. `patterns` 필드에 점수 기반 데이터가 있어도 정상 작동합니다.
