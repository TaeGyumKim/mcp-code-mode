---
id: formatting-dynamic
version: 2025.11.21
scope: global
apiType: any
priority: 70
tags: [formatDate, formatNumber, formatPhoneNumber, ~/utils/format]
summary: Formatting Utilities - 실제 bestcase 패턴 기반 가이드
---

# Formatting Utilities

> **이 가이드는 1979개의 bestcase 파일에서 자동 추출된 실제 코드 패턴을 기반으로 합니다.**

## 📊 패턴 통계

- **분석된 bestcase**: 1979개 파일
- **추출된 예시**: 3개
- **키워드**: formatDate, formatNumber, formatPhoneNumber, ~/utils/format
- **평균 품질 점수**: 85점

---

## 🎯 실제 사용 패턴


### 패턴 1: Format Usage in Template

**출처**: `00.luxurypanda-v2-frontend-admin--pages-ConsumerBotManagement-vue`
**품질 점수**: 85점

```typescript
{{ formatNumber(index + 1) }}
```


### 패턴 2: Format Usage in Template

**출처**: `00.luxurypanda-v2-frontend-admin--pages-ProviderOrder-vue`
**품질 점수**: 85점

```typescript
{{ formatNumber(page.totalPage) }}
```


### 패턴 3: Format Usage in Template

**출처**: `00.luxurypanda-v2-frontend-admin--pages-ProviderOrderHistory-vue`
**품질 점수**: 85점

```typescript
{{ formatNumber(page.totalPage) }}
```


---

## ✅ 체크리스트

- [ ] formatDate 패턴 확인
- [ ] formatNumber 패턴 확인
- [ ] formatPhoneNumber 패턴 확인
- [ ] ~/utils/format 패턴 확인

---

## 🔍 추가 bestcase 검색

이 패턴과 관련된 추가 bestcase를 검색하려면:

```typescript
const bestcases = await bestcase.search({
  keywords: ["formatDate", "formatNumber", "formatPhoneNumber", "~/utils/format"]
});
```

---

**자동 생성일**: 2025-11-21T04:33:05.649Z
**소스**: 3개의 bestcase 파일에서 추출
