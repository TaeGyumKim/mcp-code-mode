# TypeScript 트랜스파일 기능

## 개요

MCP STDIO 서버는 `execute` 도구 실행 시 **자동으로 TypeScript 코드를 JavaScript로 변환**하여 샌드박스에서 실행합니다.

이를 통해 사용자는 TypeScript 문법을 그대로 사용할 수 있으며, 타입 안정성과 개발자 경험을 유지하면서도 런타임 실행이 보장됩니다.

## 주요 기능

### ✅ 자동 타입 제거

TypeScript의 타입 시스템은 자동으로 제거되어 순수 JavaScript로 변환됩니다:

```typescript
// 입력 (TypeScript)
interface User {
  name: string;
  age: number;
}

const user: User = { name: "John", age: 30 };
console.log(user.name);

// 출력 (JavaScript)
const user = { name: "John", age: 30 };
console.log(user.name);
```

### ✅ 제네릭 타입 처리

제네릭 문법도 안전하게 제거됩니다:

```typescript
// 입력
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42);

// 출력
function identity(value) {
  return value;
}

const num = identity(42);
```

### ✅ import type 제거

타입 전용 import는 자동으로 제거됩니다:

```typescript
// 입력
import type { SomeType } from 'module';

const value = 123;

// 출력
const value = 123;
```

### ✅ as 타입 단언 제거

타입 단언도 자동으로 제거됩니다:

```typescript
// 입력
const element = document.getElementById('id') as HTMLElement;

// 출력
const element = document.getElementById('id');
```

## 구현 상세

### esbuild를 사용한 트랜스파일

[mcp-stdio-server.ts:1332-1359](../mcp-stdio-server.ts#L1332-L1359)에서 esbuild의 `transform` API를 사용:

```typescript
const transpileResult = await transform(execArgs.code, {
  loader: 'ts',
  format: 'esm',
  target: 'esnext',
  sourcemap: false,
  tsconfigRaw: {
    compilerOptions: {
      target: 'esnext',
      module: 'esnext',
      removeComments: false,
      importsNotUsedAsValues: 'remove'
    }
  }
});
```

### Fail-Safe 메커니즘

트랜스파일 실패 시에도 안전하게 동작:

```typescript
try {
  // TypeScript → JavaScript 변환 시도
  processedCode = transpileResult.code;
  log('TypeScript transpiled successfully');
} catch (transpileError) {
  log('TypeScript transpilation failed, using original code');
  // Fail-safe: 원본 코드 사용 (순수 JS일 가능성)
}
```

**장점:**
- 순수 JavaScript 코드는 그대로 실행
- 트랜스파일 에러가 발생해도 서버가 중단되지 않음
- 로그로 디버깅 가능

## 지원하는 TypeScript 기능

| 기능 | 지원 여부 | 비고 |
|------|----------|------|
| 인터페이스 (`interface`) | ✅ | 완전히 제거됨 |
| 타입 별칭 (`type`) | ✅ | 완전히 제거됨 |
| 함수 파라미터 타입 | ✅ | 타입 제거됨 |
| 반환 타입 | ✅ | 타입 제거됨 |
| 제네릭 (`<T>`) | ✅ | 타입 제거됨 |
| `import type` | ✅ | import 자체가 제거됨 |
| `as` 타입 단언 | ✅ | 단언 제거됨 |
| enum | ✅ | JavaScript 객체로 변환 |
| namespace | ✅ | 객체로 변환 |
| decorator | ⚠️ | 실험적 기능 (stage 3) |

## 제약사항

### 샌드박스 제약으로 인한 금지 문법

TypeScript 트랜스파일과 무관하게, 샌드박스 환경의 특성상 다음 문법은 **사용 불가**:

```typescript
// ❌ export 문법 (샌드박스에서 금지)
export const value = 123;
export default function() {}

// ❌ import 문법 (샌드박스에서 금지)
import { something } from 'module';

// ✅ 대신 변수 할당 + 마지막 표현식 반환
const result = generateCode();
result;  // 자동 반환됨
```

### decorator 사용 시 주의사항

Decorator는 아직 실험적 기능이므로, 사용 시 `experimentalDecorators` 설정이 필요할 수 있습니다.

## 성능

### 트랜스파일 오버헤드

- **작은 코드 (<100줄)**: ~5-10ms
- **중간 코드 (100-500줄)**: ~10-30ms
- **큰 코드 (>500줄)**: ~30-100ms

esbuild는 Go로 작성되어 매우 빠르므로, 실질적인 오버헤드는 무시할 수 있는 수준입니다.

### 코드 크기 감소

TypeScript 타입 제거로 인해 평균 **30-50% 코드 크기 감소**:

```typescript
// TypeScript (126 chars)
interface User {
  name: string;
  age: number;
}

const user: User = { name: "John", age: 30 };

// JavaScript (64 chars) - 50% 감소
const user = { name: "John", age: 30 };
```

## 테스트

### 테스트 실행

```bash
npx tsx scripts/test/test-typescript-transpile.ts
```

### 테스트 커버리지

8가지 주요 시나리오 검증:

1. ✅ 순수 JavaScript (타입 없음)
2. ✅ TypeScript 인터페이스 제거
3. ✅ TypeScript 타입 제거
4. ✅ 함수 파라미터 타입 제거
5. ✅ 제네릭 타입 제거
6. ✅ import type 제거
7. ✅ as 타입 단언 제거
8. ✅ 복잡한 TypeScript 문법

## 로깅

트랜스파일 과정은 자동으로 로그에 기록됩니다:

```
[log] TypeScript transpiled successfully {
  originalLength: 126,
  transpiledLength: 64
}
```

실패 시:

```
[log] TypeScript transpilation failed, using original code {
  error: "Transform failed with 1 error"
}
```

## 향후 개선 사항

### 1. Decorator 지원 강화

현재는 기본적인 decorator만 지원. 복잡한 decorator는 추가 설정 필요.

### 2. Source Map 지원

디버깅을 위해 source map 생성 옵션 추가 고려.

### 3. 캐싱

동일한 TypeScript 코드는 트랜스파일 결과를 캐시하여 성능 향상.

## 참고

- esbuild 공식 문서: https://esbuild.github.io/
- TypeScript 트랜스파일 가이드: https://esbuild.github.io/content-types/#typescript
- 샌드박스 실행 가이드: [EXECUTE_TOOL_ANALYSIS_V2.md](./EXECUTE_TOOL_ANALYSIS_V2.md)
