---
id: error.handling
scope: global
apiType: any
tags: [error, exception, try-catch, logging]
priority: 90
version: 2025.11.11
summary: "에러 처리 패턴 및 로깅 가이드"
---

# 에러 처리 패턴

## 기본 원칙

1. **명시적 에러 처리**: 모든 API 호출/파일 작업에 try-catch
2. **타입 안전 에러**: `unknown` → 타입 가드 → 구체적 처리
3. **컨텍스트 보존**: 스택 트레이스 + 사용자 입력 + 시스템 상태
4. **graceful degradation**: 에러 발생 시 폴백 로직

## 패턴

### 1. API 호출 에러

```typescript
try {
  const response = await grpcClient.call(request);
  return response.data;
} catch (error: unknown) {
  if (error instanceof GrpcError) {
    if (error.code === StatusCode.NOT_FOUND) {
      return null;  // 404는 정상 케이스
    }
    throw new Error(`gRPC 호출 실패: ${error.message}`);
  }
  throw error;
}
```

### 2. 파일 시스템 에러

```typescript
import { promises as fs } from 'fs';

try {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
} catch (error: unknown) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    console.error(`파일 없음: ${filePath}`);
    return null;  // 파일 없음은 null 반환
  }
  throw new Error(`파일 읽기 실패: ${filePath} - ${(error as Error).message}`);
}
```

### 3. 샌드박스 실행 에러

```typescript
import { VM } from 'vm2';

try {
  const vm = new VM({ timeout: 30000, sandbox });
  const result = await vm.run(wrappedCode);
  return result;
} catch (error: unknown) {
  const err = error as Error;
  
  if (err.message.includes('timeout')) {
    throw new Error('실행 시간 초과 (30초)');
  }
  
  if (err.message.includes('SyntaxError')) {
    throw new Error(`코드 구문 오류: ${err.message}`);
  }
  
  throw new Error(`샌드박스 실행 실패: ${err.message}`);
}
```

## 로깅 규칙

### console.error vs console.log

```typescript
// ✅ 올바른 사용
console.error('[functionName] 에러 발생:', error.message);  // 에러/경고
console.log({ result, metadata });  // 정상 결과

// ❌ 잘못된 사용
console.log('Error:', error);  // 에러는 console.error
console.error({ data });       // 정상 데이터는 console.log
```

### 구조화된 로그

```typescript
console.error('[saveBestCase] Failed:', {
  projectName: input.projectName,
  category: input.category,
  error: (error as Error).message,
  timestamp: new Date().toISOString()
});
```

## 에러 메시지 작성

```typescript
// ✅ 좋은 에러 메시지: 컨텍스트 + 원인 + 해결책
throw new Error(
  `BestCase 저장 실패: ${sanitizedProjectName} (카테고리: ${input.category})\n` +
  `원인: ${error.message}\n` +
  `해결책: 디렉토리 권한 확인 또는 디스크 공간 확보`
);

// ❌ 나쁜 에러 메시지
throw new Error('Failed');
throw error;  // 원본 에러 그대로 던지기
```

## 환경별 처리

### Docker 환경

```typescript
const isDocker = process.env.NODE_ENV === 'production';

try {
  const result = await executeTask();
  return result;
} catch (error: unknown) {
  if (isDocker) {
    // Docker: 로그만 남기고 null 반환
    console.error('[Docker] Task failed:', (error as Error).message);
    return null;
  } else {
    // 로컬: 에러 던지기
    throw error;
  }
}
```

## BestCase 저장 에러

```typescript
// BestCase ID sanitization 필수
const sanitizedProjectName = input.projectName
  .replace(/\//g, '-')
  .replace(/\\/g, '-');

const id = `${sanitizedProjectName}-${input.category}-${Date.now()}`;

try {
  await storage.save(id, bestCase);
} catch (error: unknown) {
  // 슬래시 포함 체크
  if (input.projectName.includes('/') || input.projectName.includes('\\')) {
    throw new Error(
      `프로젝트 이름에 슬래시 포함: ${input.projectName}\n` +
      `Sanitized: ${sanitizedProjectName}`
    );
  }
  throw error;
}
```
