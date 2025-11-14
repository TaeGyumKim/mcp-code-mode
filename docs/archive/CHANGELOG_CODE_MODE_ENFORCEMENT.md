# CHANGELOG: Code Mode 워크플로우 강제 적용 (2025.11.11)

## 📋 변경 개요

**목적**: AI가 자동으로 Code Mode 워크플로우를 따르도록 지침 강화

**배경**: 
- 기존 지침은 "권장사항" 형태 → AI가 무시하고 수동 작업
- 실제 대화에서 5단계 워크플로우 0% 준수
- Proto 파일 수동 grep, trial & error 반복, 로그 없음

**해결책**:
- default.instructions.md에 "필수 작업 시작 프로토콜" 추가
- main-ultra-compact.md에 "필수 실행 순서" 강제
- 모든 금지 사항을 ❌ 아이콘과 함께 명시

## 🔄 변경된 파일

### 1. `.github/instructions/default.instructions.md`

**변경 내용**:
- 파일 시작 부분에 "🚨 필수 작업 시작 프로토콜" 섹션 추가
- 6단계 필수 프로토콜 명시 (로그 → BestCase → guides → 로드 → 코드 생성 → 완료 로그)
- "❌ 절대 금지 사항" 섹션 추가 (5가지)
- 모든 단계에 `console.log` 예제 포함

**추가된 필수 프로토콜**:
```typescript
// 1단계: 작업 컨텍스트 로그 (필수!)
console.log('[작업 시작]', { file, task, workflow });

// 2단계: BestCase 로드 (필수!)
const bestCase = await bestcase.loadBestCase({ projectName });

// 3단계: 리스크 분석 + guides 검색 (필수!)
const { guides: results } = await guides.searchGuides({ 
  keywords, apiType, mandatoryIds 
});

// 4단계: 지침 로드 (필수!)
const { guide } = await guides.loadGuide({ id });

// 5단계: 지침 기반 코드 생성 (필수!)
// guide.content 참조

// 6단계: 작업 완료 로그 (필수!)
console.log('[작업 완료]', { usedGuides, protoTypes, methods });
```

### 2. `.github/instructions/main-ultra-compact.md`

**변경 내용**:
- "🎯 실행 방법" → "🚨 필수 실행 순서 (절대 생략 불가!)"로 변경
- 6단계 실행 순서를 코드 블록으로 명시
- "❌ 절대 금지 사항" 섹션 추가 (5가지)
- 각 단계에 "❌ 생략 금지!" 경고 표시

**강조된 부분**:
```typescript
// ===================================================
// 🔴 모든 작업은 이 순서를 반드시 따라야 합니다
// ===================================================
```

### 3. `.github/instructions/guides/api/grpc-api-connection.md`

**이미 2025.11.11에 업데이트됨**:
- "🚨 핵심 원칙: Proto 타입 직접 사용" 섹션 추가
- "📋 작업 컨텍스트 로깅 (필수)" 섹션 추가
- interface 재정의 금지 명시
- 모든 작업 시 로그 예제 포함

### 4. `.github/instructions/main.instructions.md`

**이미 2025.11.11에 업데이트됨**:
- 핵심 원칙 11, 12 추가
  - 11. Proto/OpenAPI 타입 직접 사용
  - 12. 작업 컨텍스트 로깅

## 📊 변경 전/후 비교

### 변경 전 (2025.11.10)

**지침 스타일**: "권장사항"
```markdown
## 워크플로우

1. BestCase 로드
2. guides 검색
3. 코드 생성

✅ 올바른 패턴:
...
```

**AI 동작**:
- ❌ BestCase 로드 안 함
- ❌ guides 로드 안 함
- ❌ proto 파일 직접 grep (10+ 번)
- ❌ trial & error 반복
- ❌ 로그 없음

**결과**: 5단계 워크플로우 0% 준수

### 변경 후 (2025.11.11)

**지침 스타일**: "필수 프로토콜"
```markdown
## 🚨 필수 작업 시작 프로토콜

**모든 코딩 작업 시작 시 반드시 다음 순서를 따르세요:**

// 1단계: 작업 컨텍스트 로그 (필수!)
console.log('[작업 시작]', ...);

// ❌ BestCase 없이 추측으로 작업 금지!
```

**기대 효과**:
- ✅ AI가 프로토콜을 "지시사항"으로 인식
- ✅ 각 단계마다 로그 출력 → 워크플로우 준수 검증 가능
- ✅ BestCase + guides 사용 강제
- ✅ Proto 타입 직접 사용 강제

## 🎯 핵심 개선 사항

### 1. 언어 강화

| 변경 전 | 변경 후 |
|---------|---------|
| "워크플로우" | "🚨 필수 작업 시작 프로토콜" |
| "올바른 패턴" | "❌ 절대 금지 사항" |
| "권장" | "필수!" |
| "사용하세요" | "반드시 따라야 합니다" |

### 2. 로그 강제

**모든 단계에 `console.log` 필수**:
- 작업 시작
- BestCase 로드
- guides 검색
- guides 로드
- 작업 완료

**목적**: 워크플로우 준수 여부 검증 가능

### 3. 금지 사항 명시

**5가지 절대 금지**:
1. ❌ BestCase 없이 작업 시작
2. ❌ guides 없이 코드 작성
3. ❌ Proto 타입 재정의
4. ❌ 작업 로그 생략
5. ❌ trial & error 반복

### 4. 시각적 강조

- 🚨 (경고)
- 🔴 (필수)
- ❌ (금지)
- ✅ (올바른 방법)

## 📈 기대 효과

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **워크플로우 준수율** | 0% | 목표: 80%+ |
| **BestCase 사용** | 안 함 | 필수 |
| **guides 로드** | 안 함 | 필수 |
| **Proto 타입 재정의** | 발생 | 금지 |
| **작업 로그** | 없음 | 모든 단계 |
| **파일 수동 검색** | 10+ 번 | 0번 (BestCase 사용) |
| **토큰 낭비** | ~2400 | ~700 (71% 절감) |

## 🔍 검증 방법

**다음 외부 프로젝트 작업 시 확인**:

1. ✅ 작업 시작 로그 있는가?
2. ✅ BestCase 로드 로그 있는가?
3. ✅ guides 검색/로드 로그 있는가?
4. ✅ Proto 파일 직접 grep 안 하는가?
5. ✅ interface 재정의 안 하는가?
6. ✅ 작업 완료 로그 (usedGuides, protoTypes) 있는가?

## 📚 관련 문서

- `main.instructions.md` - 내부 프로젝트용 (12가지 핵심 원칙)
- `main-ultra-compact.md` - 외부 프로젝트용 (필수 실행 순서)
- `default.instructions.md` - 필수 작업 시작 프로토콜
- `guides/api/grpc-api-connection.md` - Proto 타입 직접 사용 + 작업 로깅

## 🔗 참조

- [Anthropic: Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Simon Willison: Code execution with MCP](https://simonwillison.net/2025/Nov/4/code-execution-with-mcp/)
- [AI Sparkup: 코드 모드 완전 가이드](https://aisparkup.com/posts/6318)

---

**핵심 메시지**: AI가 "권장사항"을 무시할 수 없도록 "필수 프로토콜"로 강화했습니다.
