---
id: grpc-patterns-dynamic
version: 2025.11.21
scope: global
apiType: grpc
priority: 95
tags: [grpc, useBackendClient, proto, @connectrpc]
summary: gRPC API Integration - 실제 bestcase 패턴 기반 가이드
---

# gRPC API Integration

> **이 가이드는 1979개의 bestcase 파일에서 자동 추출된 실제 코드 패턴을 기반으로 합니다.**

## 📊 패턴 통계

- **분석된 bestcase**: 1979개 파일
- **추출된 예시**: 4개
- **키워드**: grpc, useBackendClient, proto, @connectrpc
- **평균 품질 점수**: 90점

---

## 🎯 실제 사용 패턴


### 패턴 1: gRPC Client Setup Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-Order-MakePayment-vue`
**품질 점수**: 90점

```typescript
const client = useBackendClient();
    const auth = await useSupabaseAuthOptionsAsync();

    await getUserInfoWithUser().then((info) => {
      userInfo.value = info?.user! as GetUserInfoResponse_Response_User;
      newUserInfo.value = copy(userInfo.value);
      console.log("userInfo", userInfo.value);
      if (userInfo.value && userInfo.value.phoneNumber) {
        phoneNumber.value = getPhoneNumberStringWithDash(userInfo.value.phoneNumber!);
        newPhoneNumber.value = phoneNumber.value;
      }
      checkOrderUserInfo
```


### 패턴 2: gRPC Client Setup Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-Order-NonMemberOrder-vue`
**품질 점수**: 90점

```typescript
const client = useBackendClient();
  const auth = await useSupabaseAuthOptionsAsync();

  await client.getOrderCartItems({}, auth).then(async (res: GetOrderCartItemsResponse) => {
    cartItem.value.orderItems = res.details?.orderCartItems.map((item) => {
      return {
        productId: item.productId,
        quantity: item.quantity,
        optionId: item.optionId,
      };
    }) as CalculateOrderRequest_OrderItem[];

    await client.calculateOrder(cartItem.value, auth).then((res) => {
      console.log("calculated", res);
```


### 패턴 3: gRPC Client Setup Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-Order-PaymentSuccess-vue`
**품질 점수**: 90점

```typescript
const client = useBackendClient();
    const auth = await useSupabaseAuthOptionsAsync();
    // TODO: 결제 성공시 처리.

    const query = {
      paymentId: paymentId.value,
    } as ConfirmPortOnePaymentRequest;

    await client
      .confirmPortOnePayment(query, auth)
      // .confirmTossPayment(query, auth)
      .then((res) => {
        orderPersonInfo.value = res.details;
        console.log("orderPersonInfo.value", orderPersonInfo.value);
      })
      .catch((err) => {
        Sentry.captureException(err);
        // toast.
```


### 패턴 4: gRPC Client Setup Pattern

**출처**: `00.luxurypanda-v2-frontend--pages-Pandastic-SubscribeSuccess-vue`
**품질 점수**: 90점

```typescript
const client = useBackendClient();
    const auth = await useSupabaseAuthOptionsAsync();
    // 빌링키 발급 및 최종 결제
    client
      .subscribeUserServiceSuccess(
        {
          serviceId: serviceId.value,
          customerKey: customerKey,
          authKey: authKey,
        },
        auth,
      )
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        // toast.error(err);
      });

    await navigateTo("/My/Pandastic");
  } catch (e: any) {
    console.log(e);
    try {
      //
```


---

## ✅ 체크리스트

- [ ] grpc 패턴 확인
- [ ] useBackendClient 패턴 확인
- [ ] proto 패턴 확인
- [ ] @connectrpc 패턴 확인

---

## 🔍 추가 bestcase 검색

이 패턴과 관련된 추가 bestcase를 검색하려면:

```typescript
const bestcases = await bestcase.search({
  keywords: ["grpc", "useBackendClient", "proto", "@connectrpc"]
});
```

---

**자동 생성일**: 2025-11-21T04:33:05.644Z
**소스**: 4개의 bestcase 파일에서 추출
