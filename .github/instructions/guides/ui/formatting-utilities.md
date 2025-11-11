---
id: utils.formatting
scope: project
apiType: any
tags: [utils, format, number, date, phone, nuxt3]
priority: 70
version: 2025.11.10
requires: []
excludes: []
summary: "데이터 포맷팅 유틸리티 - formatNumber, formatDate, formatDateTime, formatPhoneNumber"
---

# 데이터 포맷팅 가이드

## 필수 규칙

**모든 숫자/날짜는 포맷팅하여 표시**

### 1. formatNumber - 숫자 포맷팅

```typescript
import { formatNumber } from "~/utils/format";

// 1,234,567 형식 (한국 로케일)
{{ formatNumber(1234567) }}  // "1,234,567"
{{ formatNumber(element.price) }}  // "50,000"
```

**처리:**
- null/undefined 안전 처리
- number, bigint 타입 지원
- 한국 로케일 (쉼표 구분)

### 2. formatDate - 날짜 포맷팅

```typescript
import { formatDate } from "~/utils/format";

// 기본: yyyy-MM-dd
{{ formatDate(element.createdAt) }}  // "2025-11-10"

// 커스텀 포맷
{{ formatDate(date, "yyyy/MM/dd") }}  // "2025/11/10"
```

**지원 형식:**
- Proto Timestamp
- DateTime
- ISO strings
- numbers (Unix timestamp)

### 3. formatDateTime - 날짜+시간

```typescript
import { formatDateTime } from "~/utils/format";

// 기본: yyyy-MM-dd HH:mm:ss
{{ formatDateTime(element.updatedAt) }}  // "2025-11-10 13:45:30"

// 커스텀 포맷
{{ formatDateTime(date, "yyyy-MM-dd HH:mm") }}  // "2025-11-10 13:45"
```

### 4. formatPhoneNumber - 전화번호

```typescript
import { formatPhoneNumber } from "~/utils/format";

// 자동 하이픈 추가
{{ formatPhoneNumber("01012345678") }}  // "010-1234-5678"
{{ formatPhoneNumber("0212345678") }}   // "02-1234-5678"
```

## Import 위치

**항상 `~/utils/format`에서 import**

```typescript
import { formatNumber, formatDate, formatDateTime, formatPhoneNumber } from "~/utils/format";
```

**❌ openerd-nuxt3에서 import 금지**
- Format 함수가 있지만 distribution build에서 export 안됨

## 체크리스트

- [ ] 모든 숫자에 `formatNumber()` 사용
- [ ] 모든 날짜에 `formatDate()` 사용
- [ ] 날짜+시간에 `formatDateTime()` 사용
- [ ] 전화번호에 `formatPhoneNumber()` 사용
- [ ] `~/utils/format`에서 import
