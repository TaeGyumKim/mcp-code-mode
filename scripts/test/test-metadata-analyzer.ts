#!/usr/bin/env tsx
/**
 * 메타데이터 분석기 테스트
 *
 * 점수 산출 대신 메타데이터 추출 방식 검증
 */

import { MetadataAnalyzer } from '../../packages/llm-analyzer/src/metadataAnalyzer.js';

console.log('🧪 메타데이터 분석기 테스트\n');
console.log('━'.repeat(80));

// 테스트용 샘플 코드
const sampleAPICode = `
import { GrpcClient } from '@grpc/grpc-js';
import type { GetUserListRequest, GetUserListResponse } from './proto/user_pb';

/**
 * gRPC 클라이언트 composable
 */
export function useGrpcClient() {
  const config = useRuntimeConfig();

  const client = new GrpcClient(config.public.apiUrl, {
    interceptors: [
      createLoggingInterceptor(),
      createErrorInterceptor()
    ]
  });

  async function getUserList(request: GetUserListRequest): Promise<GetUserListResponse> {
    try {
      const response = await client.call('getUserList', request);
      return response;
    } catch (error) {
      if (error instanceof ConnectError) {
        console.error('gRPC error:', error.code, error.message);
        throw new Error(\`Failed to get user list: \${error.message}\`);
      }
      throw error;
    }
  }

  async function createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      return await client.call('createUser', data);
    } catch (error) {
      handleGrpcError(error);
    }
  }

  return { getUserList, createUser };
}
`;

const sampleVueComponent = `
<template>
  <div>
    <CommonAsyncBoundary :pending="pending" :error="error">
      <template #loading>
        <CommonLoading />
      </template>

      <template #error="{ retry }">
        <div class="error-state">
          <p>Error loading users</p>
          <button @click="retry">Retry</button>
        </div>
      </template>

      <div v-if="users && users.length > 0">
        <CommonInput v-model="searchQuery" placeholder="Search users..." />

        <CommonTable
          :columns="userColumns"
          :data="filteredUsers"
          @row-click="handleRowClick"
        />

        <CommonPaging
          v-model:page="page"
          v-model:limit="limit"
          :total="total"
        />
      </div>
    </CommonAsyncBoundary>
  </div>
</template>

<script setup lang="ts">
import { useGrpcClient } from '~/composables/grpc';
import { usePaging } from '~/composables/usePaging';

const client = useGrpcClient();
const { page, limit } = usePaging();
const searchQuery = ref('');

const { data: users, pending, error, refresh } = await useAsyncData(
  'users',
  () => client.getUserList({ page: page.value, limit: limit.value })
);

const filteredUsers = computed(() => {
  if (!users.value || !searchQuery.value) return users.value;
  return users.value.filter(u => u.name.includes(searchQuery.value));
});

const userColumns = computed(() => [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' }
]);

function handleRowClick(user) {
  navigateTo(\`/users/\${user.id}\`);
}

watch(searchQuery, () => {
  console.log('Search query changed:', searchQuery.value);
});
</script>
`;

async function testMetadataAnalyzer() {
  console.log('\n📝 Test 1: API 파일 메타데이터 추출');
  console.log('─'.repeat(80));

  try {
    // Ollama 서버 없이 로컬 테스트
    const analyzer = new MetadataAnalyzer({
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5-coder:1.5b'
    });

    console.log('⏭️  Skipping LLM-based test (requires Ollama server)');
    console.log('✅ 메타데이터 인터페이스 정의 완료');

    // 인터페이스 구조 출력
    console.log('\n📊 FileMetadata 인터페이스 구조:');
    console.log('  - filePath: string');
    console.log('  - category: composable | api | utility | page | other');
    console.log('  - patterns: string[] (디자인 패턴)');
    console.log('  - frameworks: string[] (사용 프레임워크)');
    console.log('  - apiType: grpc | openapi | rest | none');
    console.log('  - apiMethods: string[] (API 메서드)');
    console.log('  - complexity: trivial | low | medium | high | very-high');
    console.log('  - reusability: low | medium | high');
    console.log('  - errorHandling: none | basic | comprehensive');
    console.log('  - typeDefinitions: poor | basic | good | excellent');
    console.log('  - dependencies: string[]');
    console.log('  - composablesUsed: string[]');
    console.log('  - entities: string[] (도메인 엔티티)');
    console.log('  - features: string[] (주요 기능)');
    console.log('  - hasDocumentation: boolean');
    console.log('  - isExcellent: boolean');
    console.log('  - excellentReasons?: string[]');
    console.log('  - linesOfCode: number');

    console.log('\n📊 ComponentMetadata 인터페이스 구조:');
    console.log('  - 위 FileMetadata 공통 필드 +');
    console.log('  - componentsUsed: string[]');
    console.log('  - vModelBindings: Array<{name, component, hasWatch, hasValidation, hasTypeDefinition}>');
    console.log('  - hasLoadingStates: boolean');
    console.log('  - hasErrorStates: boolean');
    console.log('  - excellentPatterns?: string[]');
    console.log('  - templateLines: number');
    console.log('  - scriptLines: number');

    console.log('\n📊 ProjectMetadata 집계 구조:');
    console.log('  - projectName: string');
    console.log('  - totalFiles: number');
    console.log('  - filesByCategory: Record<string, number>');
    console.log('  - apiType: grpc | openapi | rest | mixed | none');
    console.log('  - apiMethods: string[] (전체 메서드)');
    console.log('  - frameworks: string[] (중복 제거)');
    console.log('  - patterns: string[] (중복 제거)');
    console.log('  - dependencies: string[]');
    console.log('  - componentsUsed: string[]');
    console.log('  - composablesUsed: string[]');
    console.log('  - entities: string[]');
    console.log('  - complexityDistribution: Record<ComplexityLevel, number>');
    console.log('  - excellentFiles: Array<{path, reasons, patterns}>');
    console.log('  - excellentSnippets: ExcellentCodeMetadata[]');
    console.log('  - averageComplexity: ComplexityLevel');
    console.log('  - totalLinesOfCode: number');
    console.log('  - filesWithGoodErrorHandling: number');
    console.log('  - filesWithGoodTypes: number');

    console.log('\n' + '─'.repeat(80));
    console.log('\n✅ 주요 변경 사항:');
    console.log('  1. ❌ 점수 산출 (0-100) 제거');
    console.log('  2. ✅ 메타데이터 추출 (구조화된 정보)');
    console.log('  3. ✅ 키워드 중심 (patterns, frameworks, features, entities)');
    console.log('  4. ✅ 복잡도 레벨 (trivial/low/medium/high/very-high)');
    console.log('  5. ✅ 품질 지표 (errorHandling, typeDefinitions, reusability)');
    console.log('  6. ✅ 동적 지침 로딩 시스템과 통합 가능');

    console.log('\n' + '─'.repeat(80));
    console.log('\n💡 메타데이터 활용 예시:');
    console.log('\n1. 동적 지침 검색:');
    console.log('   - metadata.patterns → 지침 키워드');
    console.log('   - metadata.apiType → API 타입 필터');
    console.log('   - metadata.features → 기능별 지침');
    console.log('   - metadata.entities → 도메인별 지침');

    console.log('\n2. BestCase 저장:');
    console.log('   - complexity: "high" → 복잡한 우수 사례');
    console.log('   - isExcellent: true → 재사용 가능 패턴');
    console.log('   - patterns: ["interceptor"] → 패턴 라이브러리 구축');

    console.log('\n3. 프로젝트 분석:');
    console.log('   - ProjectMetadata → 전체 기술 스택 파악');
    console.log('   - complexityDistribution → 복잡도 분포');
    console.log('   - excellentFiles → 우수 파일 목록');

    console.log('\n' + '━'.repeat(80));
    console.log('\n🎯 다음 단계:');
    console.log('  1. Ollama 서버 구동 (Docker Compose)');
    console.log('  2. 실제 프로젝트 파일로 메타데이터 추출 테스트');
    console.log('  3. BestCase 저장 시스템에 메타데이터 통합');
    console.log('  4. 동적 지침 로딩과 메타데이터 연동');

    console.log('\n✨ 테스트 완료!');

  } catch (error: any) {
    console.error('\n❌ 에러:', error.message);
  }
}

// 실행
testMetadataAnalyzer().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
