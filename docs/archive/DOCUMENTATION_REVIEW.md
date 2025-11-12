# 문서 구조 검토 및 정리 방안

## 📊 현재 문서 현황 (2025-11-11)

### 총 문서 수: 18개
- docs/ 디렉토리: 15개
- docs/deprecated/: 3개

---

## 📁 문서 분류 및 분석

### 1. 사용자 가이드 (4개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| **VSCODE_COPILOT_USAGE.md** | 1234 | ✅ 최신 | ⭐ 메인 가이드, 가장 완전함 |
| VSCODE_MCP_GUIDE.md | 327 | ⚠️ 검토 필요 | VSCode 연동 전용 |
| USAGE_GUIDE.md | 394 | ⚠️ 중복 가능성 | 일반 사용 가이드 |
| WEEKLY_SCAN_GUIDE.md | 224 | ✅ 유지 | 주간 스캔 전용 |

**분석:**
- **VSCODE_COPILOT_USAGE.md**: 최신 버전, API/타입 자동 감지 포함, memberManagement.vue 예시 포함
- **USAGE_GUIDE.md**: VSCODE_COPILOT_USAGE.md와 내용 중복 가능성 높음 → 통합 고려
- **VSCODE_MCP_GUIDE.md**: VSCode 설정만 다루므로 유지

---

### 2. 시스템 설계 문서 (3개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| **METADATA_SYSTEM.md** | 586 | ✅ 유지 | 메타데이터 시스템 상세 설명 |
| WORKFLOW_CORRECT.md | 729 | ⚠️ 중복 | PROCESS_SUMMARY와 겹침 |
| PROCESS_SUMMARY.md | 563 | ⚠️ 중복 | WORKFLOW_CORRECT와 겹침 |

**분석:**
- **WORKFLOW_CORRECT.md**: 워크플로우 중심, 코드 예시 많음
- **PROCESS_SUMMARY.md**: 아키텍처 중심, 시스템 개요
- **중복도**: 약 40-50% 겹침 → **WORKFLOW_CORRECT.md로 통합 권장**

---

### 3. BestCase 관련 (2개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| BESTCASE_PRIORITY_GUIDE.md | 241 | ✅ 유지 | BestCase 우선순위 전략 |
| BESTCASE_RULES_SUMMARY.md | 173 | ✅ 유지 | BestCase 규칙 요약 |

**분석:**
- 두 문서는 목적이 다름 (전략 vs 규칙) → 둘 다 유지

---

### 4. 가이드 시스템 (1개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| GUIDES_MCP_INTEGRATION.md | 255 | ✅ 유지 | 가이드 MCP 통합 설명 |

---

### 5. 설정/운영 (4개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| MCP_SETUP_GUIDE.md | 316 | ✅ 유지 | MCP 서버 설정 |
| PRODUCTION_GUIDE.md | 559 | ✅ 유지 | 프로덕션 배포 가이드 |
| PROJECT_STRUCTURE.md | 121 | ✅ 유지 | 프로젝트 구조 |
| PROJECT_PLAN.md | 124 | ⚠️ 오래됨 | 초기 계획서, 업데이트 필요 |

---

### 6. 인덱스 (1개)

| 파일 | 라인 수 | 상태 | 비고 |
|------|---------|------|------|
| README.md | 230 | ❌ 잘못됨 | 존재하지 않는 파일 참조 |

**문제점:**
- AI_CODE_ANALYZER.md (없음)
- DOCKER_SETUP_COMPLETE.md (없음)
- AUTO_UPDATE_GUIDE.md (없음)
- AI_QUICK_START.md (없음)
- TYPESCRIPT_MIGRATION.md (루트에 있음)

---

### 7. deprecated/ 폴더 (3개)

| 파일 | 상태 | 비고 |
|------|------|------|
| SCORING_SYSTEM.md | ✅ 정상 | 구 버전 점수 시스템 |
| AI-SCORING-GUIDE.md | ✅ 정상 | 구 버전 AI 가이드 |
| README.md | ✅ 정상 | deprecated 폴더 설명 |

---

## 🎯 정리 방안

### 즉시 조치 (HIGH)

#### 1. docs/README.md 수정 ⚡
**문제**: 존재하지 않는 파일 참조

**해결책**:
```markdown
# 문서 구조

## 🚀 시작하기
1. **[VSCODE_COPILOT_USAGE.md](./VSCODE_COPILOT_USAGE.md)** ⭐ - VSCode Copilot 사용 가이드 (메인)
2. **[VSCODE_MCP_GUIDE.md](./VSCODE_MCP_GUIDE.md)** - VSCode MCP 연동
3. **[WEEKLY_SCAN_GUIDE.md](./WEEKLY_SCAN_GUIDE.md)** - 주간 자동 스캔

## 📖 시스템 이해
1. **[METADATA_SYSTEM.md](./METADATA_SYSTEM.md)** - 메타데이터 시스템
2. **[WORKFLOW_CORRECT.md](./WORKFLOW_CORRECT.md)** - 올바른 워크플로우
3. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 프로젝트 구조

## 🔧 설정/운영
1. **[MCP_SETUP_GUIDE.md](./MCP_SETUP_GUIDE.md)** - MCP 서버 설정
2. **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** - 프로덕션 배포

## 📚 참고
1. **[BESTCASE_PRIORITY_GUIDE.md](./BESTCASE_PRIORITY_GUIDE.md)** - BestCase 우선순위
2. **[BESTCASE_RULES_SUMMARY.md](./BESTCASE_RULES_SUMMARY.md)** - BestCase 규칙
3. **[GUIDES_MCP_INTEGRATION.md](./GUIDES_MCP_INTEGRATION.md)** - 가이드 MCP 통합
```

#### 2. 중복 문서 통합 ⚡

**방안 A (권장)**: PROCESS_SUMMARY.md를 WORKFLOW_CORRECT.md에 통합
- WORKFLOW_CORRECT.md가 더 완전하고 코드 예시 많음
- PROCESS_SUMMARY.md 삭제 후 WORKFLOW_CORRECT.md에 아키텍처 섹션 추가

**방안 B**: WORKFLOW_CORRECT.md를 PROCESS_SUMMARY.md로 이름 변경
- PROCESS_SUMMARY.md가 더 일반적인 이름
- 하지만 WORKFLOW_CORRECT.md가 더 구체적

**권장**: 방안 A (WORKFLOW_CORRECT.md 유지)

#### 3. USAGE_GUIDE.md 처리 ⚡

**확인 필요**: VSCODE_COPILOT_USAGE.md와 중복도 체크

**방안**:
- 중복도 70% 이상 → USAGE_GUIDE.md 삭제
- 중복도 50% 미만 → USAGE_GUIDE.md를 "일반 CLI 사용법"으로 특화

---

### 중기 조치 (MEDIUM)

#### 1. PROJECT_PLAN.md 업데이트
- 현재 상태 반영
- 완료된 기능 체크
- 향후 로드맵 업데이트

#### 2. 문서 일관성 검토
- 모든 문서에서 docker-compose.yml 참조 확인
- 올바른 경로: `docker-compose up -d` (기본)
- 틀린 경로: `docker-compose -f docker-compose.ai.yml up -d` (이제 불필요)

---

### 장기 조치 (LOW)

#### 1. 문서 자동 링크 체크
- CI/CD에 링크 검증 추가
- 깨진 내부 링크 자동 감지

#### 2. 문서 버전 관리
- 각 문서에 "최종 업데이트" 날짜 추가
- deprecated 폴더 관리 정책 수립

---

## 📋 액션 아이템 (우선순위별)

### 🔴 HIGH (즉시)
- [ ] docs/README.md 수정 (존재하는 파일만 참조)
- [ ] PROCESS_SUMMARY.md → WORKFLOW_CORRECT.md 통합
- [ ] USAGE_GUIDE.md vs VSCODE_COPILOT_USAGE.md 중복도 체크

### 🟡 MEDIUM (이번 세션)
- [ ] PROJECT_PLAN.md 업데이트
- [ ] 모든 문서의 docker-compose 참조 수정
- [ ] 루트 README.md 최종 검증

### 🟢 LOW (향후)
- [ ] 문서 자동 링크 체크 CI 추가
- [ ] 문서 버전 관리 정책 수립

---

## 🎯 최종 문서 구조 (권장)

```
docs/
├── README.md                      (✅ 업데이트 필요)
├── VSCODE_COPILOT_USAGE.md        (⭐ 메인 가이드)
├── VSCODE_MCP_GUIDE.md            (✅ 유지)
├── WEEKLY_SCAN_GUIDE.md           (✅ 유지)
├── METADATA_SYSTEM.md             (✅ 유지)
├── WORKFLOW_CORRECT.md            (✅ 유지, PROCESS_SUMMARY 통합)
├── PROJECT_STRUCTURE.md           (✅ 유지)
├── PROJECT_PLAN.md                (⚠️ 업데이트)
├── MCP_SETUP_GUIDE.md             (✅ 유지)
├── PRODUCTION_GUIDE.md            (✅ 유지)
├── BESTCASE_PRIORITY_GUIDE.md     (✅ 유지)
├── BESTCASE_RULES_SUMMARY.md      (✅ 유지)
├── GUIDES_MCP_INTEGRATION.md      (✅ 유지)
├── USAGE_GUIDE.md                 (⚠️ 중복 체크 후 결정)
└── deprecated/
    ├── README.md
    ├── SCORING_SYSTEM.md
    ├── AI-SCORING-GUIDE.md
    └── PROCESS_SUMMARY.md         (NEW - WORKFLOW_CORRECT로 통합)
```

**최종 문서 수**: 13개 (현재 15개 → 2개 감소)

---

## 🧪 검증 사항

### Docker 설정
- [ ] docker-compose.yml 실행 테스트
- [ ] ollama 컨테이너 정상 작동
- [ ] cron-scheduler 정상 작동
- [ ] MCP 서버 VSCode 연결 테스트

### 문서 링크
- [ ] 모든 내부 링크 유효성 확인
- [ ] 예시 코드 실행 가능 여부
- [ ] 파일 경로 정확성

### 일관성
- [ ] docker-compose 참조 통일
- [ ] 메타데이터 시스템 설명 일관성
- [ ] 용어 통일 (BestCase, Sandbox API, Code Mode 등)

---

## 📊 개선 효과 (예상)

| 항목 | 현재 | 개선 후 | 효과 |
|------|------|---------|------|
| **문서 수** | 15개 | 13개 | 13% 감소 |
| **중복 내용** | ~40% | ~10% | 75% 감소 |
| **깨진 링크** | 5개 | 0개 | 100% 해결 |
| **최신성** | 60% | 95% | 58% 향상 |

---

**다음 단계**: HIGH 우선순위 액션 아이템 실행
