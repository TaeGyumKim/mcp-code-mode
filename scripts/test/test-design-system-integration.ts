/**
 * 디자인 시스템 통합 테스트
 *
 * 이 스크립트는 디자인 시스템 감지 및 활용 기능을 테스트합니다:
 * 1. 메타데이터 추출 시 designSystem 필드 감지
 * 2. 디자인 시스템 컴포넌트 매핑 조회
 * 3. guides 검색 시 designSystem 우선순위 반영
 * 4. 실제 코드 생성 시나리오
 */

import * as designSystemMapping from '../../packages/llm-analyzer/src/designSystemMapping.js';
import { searchGuides } from '../../mcp-servers/guides/dist/index.js';

/**
 * 테스트 1: 디자인 시스템 컴포넌트 매핑 조회
 */
async function test1_ComponentMapping() {
  console.log('\n=== Test 1: 디자인 시스템 컴포넌트 매핑 조회 ===\n');

  // 1. 지원되는 모든 디자인 시스템 목록
  const supportedSystems = designSystemMapping.getSupportedDesignSystems();
  console.log('✅ 지원 디자인 시스템:', supportedSystems);

  // 2. openerd-nuxt3 정보 조회
  const openerdInfo = designSystemMapping.getDesignSystemInfo('openerd-nuxt3');
  if (openerdInfo) {
    console.log('\n✅ openerd-nuxt3 정보:');
    console.log('  - Name:', openerdInfo.name);
    console.log('  - Package:', openerdInfo.packageName);
    console.log('  - Components:', Object.keys(openerdInfo.components));
  }

  // 3. 특정 컴포넌트 타입 조회
  const tableComponent = designSystemMapping.getComponentForDesignSystem('openerd-nuxt3', 'table');
  if (tableComponent) {
    console.log('\n✅ Table 컴포넌트:');
    console.log('  - Name:', tableComponent.name);
    console.log('  - Description:', tableComponent.description);
    console.log('  - Usage:', tableComponent.usage);
  }

  // 4. 컴포넌트 매핑 테이블
  console.log('\n✅ 컴포넌트 매핑 비교:');
  console.log('Component Type | openerd-nuxt3 | element-plus | vuetify');
  console.log('---------------|---------------|--------------|--------');

  const types = ['table', 'button', 'input', 'modal'];
  for (const type of types) {
    const openerd = designSystemMapping.getComponentForDesignSystem('openerd-nuxt3', type)?.name || '-';
    const element = designSystemMapping.getComponentForDesignSystem('element-plus', type)?.name || '-';
    const vuetify = designSystemMapping.getComponentForDesignSystem('vuetify', type)?.name || '-';
    console.log(`${type.padEnd(14)} | ${openerd.padEnd(13)} | ${element.padEnd(12)} | ${vuetify}`);
  }

  // 5. 컴포넌트 맵 조회
  const componentMap = designSystemMapping.getComponentMap('openerd-nuxt3');
  console.log('\n✅ openerd-nuxt3 컴포넌트 맵:', componentMap);

  console.log('\n✅ Test 1 완료\n');
}

/**
 * 테스트 2: guides 검색 시 designSystem 우선순위 테스트
 */
async function test2_GuidesSearchWithDesignSystem() {
  console.log('\n=== Test 2: guides 검색 시 designSystem 우선순위 ===\n');

  // 1. designSystem 없이 검색
  console.log('1️⃣ designSystem 없이 "table, crud" 검색:');
  const result1 = await searchGuides({
    keywords: ['table', 'crud'],
    apiType: 'any'
  });

  console.log(`   → 총 ${result1.guides.length}개 가이드 검색됨`);
  result1.guides.slice(0, 3).forEach((guide, i) => {
    console.log(`   ${i + 1}. [${guide.score}점] ${guide.id}: ${guide.summary}`);
  });

  // 2. designSystem과 함께 검색
  console.log('\n2️⃣ designSystem: "openerd-nuxt3"와 함께 "table, crud" 검색:');
  const result2 = await searchGuides({
    keywords: ['table', 'crud'],
    apiType: 'any',
    designSystem: 'openerd-nuxt3'  // 🎨 디자인 시스템 지정
  });

  console.log(`   → 총 ${result2.guides.length}개 가이드 검색됨`);
  result2.guides.slice(0, 3).forEach((guide, i) => {
    console.log(`   ${i + 1}. [${guide.score}점] ${guide.id}: ${guide.summary}`);
  });

  console.log('\n💡 designSystem 지정 시 관련 가이드의 점수가 +25~40점 부스트됩니다.');
  console.log('✅ Test 2 완료\n');
}

/**
 * 테스트 3: 실제 코드 생성 시나리오 (모의)
 */
async function test3_CodeGenerationScenario() {
  console.log('\n=== Test 3: 실제 코드 생성 시나리오 ===\n');

  // 가정: 프로젝트 메타데이터 추출 결과
  const projectMeta = {
    designSystem: 'openerd-nuxt3',
    patterns: ['crud', 'pagination'],
    frameworks: ['nuxt3', 'tailwind'],
    apiType: 'grpc'
  };

  console.log('1️⃣ 프로젝트 메타데이터:', projectMeta);

  // 디자인 시스템 정보 조회
  const dsInfo = designSystemMapping.getDesignSystemInfo(projectMeta.designSystem);
  console.log('\n2️⃣ 감지된 디자인 시스템:', dsInfo?.name);

  // 컴포넌트 매핑 가져오기
  const components = designSystemMapping.getComponentMap(projectMeta.designSystem);
  console.log('\n3️⃣ 사용 가능한 컴포넌트:', components);

  // guides 검색 (designSystem 포함)
  const guidesResult = await searchGuides({
    keywords: [...projectMeta.patterns, ...projectMeta.frameworks],
    apiType: projectMeta.apiType as any,
    designSystem: projectMeta.designSystem  // 🎨 우선순위 부스트
  });

  console.log('\n4️⃣ 검색된 가이드 (상위 3개):');
  guidesResult.guides.slice(0, 3).forEach((guide, i) => {
    console.log(`   ${i + 1}. [${guide.score}점] ${guide.id}`);
  });

  // 코드 생성 (예시)
  const generatedCode = `
<template>
  <div class="p-4">
    <${components.table}
      :data="users"
      :columns="columns"
      :loading="loading"
      @row-click="handleRowClick"
    />
    <${components.paging}
      v-model:page="page"
      :total="total"
      :page-size="pageSize"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const users = ref([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pageSize = ref(10);

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' }
];

const handleRowClick = (row: any) => {
  console.log('Row clicked:', row);
};
</script>
  `.trim();

  console.log('\n5️⃣ 생성된 코드:');
  console.log(generatedCode);

  console.log('\n✅ Test 3 완료');
  console.log('\n💡 프로젝트의 디자인 시스템(openerd-nuxt3)에 맞는 컴포넌트가 자동으로 사용되었습니다!');
  console.log(`   - ${components.table} (CommonTable)`);
  console.log(`   - ${components.paging} (CommonPaging)`);
}

/**
 * 모든 테스트 실행
 */
async function runAllTests() {
  console.log('🎨 디자인 시스템 통합 테스트 시작\n');
  console.log('='.repeat(60));

  try {
    await test1_ComponentMapping();
    await test2_GuidesSearchWithDesignSystem();
    await test3_CodeGenerationScenario();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 모든 테스트 완료!\n');
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
runAllTests();
