---
id: form-page-pattern
version: 2025.11.21
scope: global
apiType: any
priority: 85
tags: [form, register, edit, validation, submit]
summary: Form 페이지 패턴 - 데이터 입력/수정 폼 표준 패턴
---

# Form/Register 페이지 패턴

> **실제 20개의 Form 페이지 bestcase에서 추출된 공통 패턴입니다.**

## 📊 패턴 분석

Form 페이지는 다음과 같은 공통 구조를 가집니다:

1. **Form State** - ref로 폼 데이터 관리
2. **Validation** - 입력 검증
3. **Submit** - API 호출 및 에러 처리
4. **Navigation** - 성공 시 목록 페이지로 이동

---

## 🎯 필수 구성 요소

### 1. Form State

```typescript
const form = ref({
  title: "",
  content: "",
  // ... 기타 필드
});
```

### 2. Validation

```typescript
function validate(): boolean {
  if (!form.value.title) {
    alert("제목을 입력하세요");
    return false;
  }
  if (!form.value.content) {
    alert("내용을 입력하세요");
    return false;
  }
  return true;
}
```

### 3. Submit

```typescript
async function submit() {
  if (!validate()) return;

  await client.createItem(form.value)
    .then((response) => {
      navigateTo("/management/list");
    })
    .catch(async (error) => {
      await useModal?.error(error, "createItem");
    });
}
```

---

## 📋 완전한 예시

```vue
<template>
  <CommonLayout title="등록">
    <template #btns>
      <button @click="submit">저장</button>
      <button @click="cancel">취소</button>
    </template>

    <form @submit.prevent="submit">
      <div class="field">
        <label>제목</label>
        <input v-model="form.title" required />
      </div>

      <div class="field">
        <label>내용</label>
        <textarea v-model="form.content" required></textarea>
      </div>
    </form>
  </CommonLayout>
</template>

<script lang="ts" setup>
const route = useRoute();
const client = useBackendClient("");

// Form state
const form = ref({
  title: "",
  content: ""
});

// Validation
function validate(): boolean {
  if (!form.value.title) {
    alert("제목을 입력하세요");
    return false;
  }
  if (!form.value.content) {
    alert("내용을 입력하세요");
    return false;
  }
  return true;
}

// Submit
async function submit() {
  if (!validate()) return;

  await client.createItem(form.value)
    .then((response) => {
      navigateTo("/management/list");
    })
    .catch(async (error) => {
      await useModal?.error(error, "createItem");
    });
}

// Cancel
function cancel() {
  navigateTo("/management/list");
}
</script>
```

---

## ✅ 체크리스트

- [ ] Form state 정의
- [ ] Validation 구현
- [ ] Submit 함수 구현
- [ ] 에러 처리
- [ ] 성공 시 navigateTo
- [ ] Cancel 버튼

---

**자동 생성일**: 2025-11-21T04:35:03.129Z
**분석된 파일**: 20개
