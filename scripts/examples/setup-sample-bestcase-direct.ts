#!/usr/bin/env tsx
/**
 * 샘플 BestCase 직접 생성 스크립트
 *
 * Storage API를 직접 사용하여 BestCase를 생성합니다.
 */

import { BestCaseStorage } from '../../packages/bestcase-db/src/storage.js';
import { calculateWeightedScore, getExcellentCategories } from '../../packages/bestcase-db/src/types.js';

const storage = new BestCaseStorage();

async function setupSampleBestCase() {
  console.log('📦 샘플 BestCase 생성\n');

  const scores = {
    structure: 85,
    apiConnection: 90,
    designSystem: 88,
    utilityUsage: 75,
    errorHandling: 85,
    typeUsage: 92,
    stateManagement: 80,
    performance: 78
  };

  const totalScore = calculateWeightedScore(scores);
  const excellentIn = getExcellentCategories(scores);

  const bestCase = {
    id: `sample-ecommerce-list-${Date.now()}`,
    projectName: 'sample-ecommerce',
    category: 'list',
    description: '상품 목록 페이지 - 필터링, 정렬, 페이지네이션 지원',
    files: [
      {
        path: 'pages/products/index.vue',
        content: `<template>
  <div class="product-list-page">
    <CommonPageHeader title="상품 목록" />
    <CommonFilter v-model="filters" :options="filterOptions" @change="handleFilterChange" />
    <CommonTable
      :data="products"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      @sort="handleSort"
      @page-change="handlePageChange"
    >
      <template #empty>
        <CommonEmptyState message="상품이 없습니다" />
      </template>
    </CommonTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useProductList } from '~/composables/useProductList';
import type { ProductFilter } from '~/types/product';

const { products, loading, pagination, fetchProducts, handleSort, handlePageChange } = useProductList();

const filters = ref<ProductFilter>({ category: '', minPrice: 0, maxPrice: 10000, inStock: true });
const filterOptions = [
  { key: 'category', label: '카테고리', type: 'select' },
  { key: 'minPrice', label: '최소 가격', type: 'number' },
  { key: 'maxPrice', label: '최대 가격', type: 'number' },
  { key: 'inStock', label: '재고 있음', type: 'checkbox' }
];
const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: '상품명', sortable: true },
  { key: 'price', label: '가격', sortable: true },
  { key: 'stock', label: '재고', sortable: true }
];

const handleFilterChange = async () => await fetchProducts({ filters: filters.value });
onMounted(() => fetchProducts());
</script>`,
        purpose: '상품 목록 페이지 - 필터링, 정렬, 페이지네이션 지원'
      },
      {
        path: 'composables/useProductList.ts',
        content: `import { ref } from 'vue';
import { useGrpcClient } from './useGrpcClient';

export function useProductList() {
  const { client, callWithRetry } = useGrpcClient();
  const products = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const pagination = ref({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const currentSort = ref(null);
  const currentFilters = ref({});

  const fetchProducts = async (options = {}) => {
    loading.value = true;
    error.value = null;

    try {
      if (options.filters) currentFilters.value = options.filters;
      if (options.sort) currentSort.value = options.sort;
      if (options.page) pagination.value.page = options.page;

      const request = {
        filters: currentFilters.value,
        sort: currentSort.value,
        page: pagination.value.page,
        pageSize: pagination.value.pageSize
      };

      const response = await callWithRetry(() => client.listProducts(request), 3);

      products.value = response.products;
      pagination.value = {
        ...pagination.value,
        total: response.total,
        totalPages: Math.ceil(response.total / pagination.value.pageSize)
      };
    } catch (err) {
      error.value = err;
      console.error('[useProductList] Error:', err);
    } finally {
      loading.value = false;
    }
  };

  const handleSort = async (sort) => await fetchProducts({ sort });
  const handlePageChange = async (page) => await fetchProducts({ page });

  return { products, loading, error, pagination, fetchProducts, handleSort, handlePageChange };
}`,
        purpose: 'gRPC API 연동 및 목록 상태 관리 컴포저블'
      },
      {
        path: 'composables/useGrpcClient.ts',
        content: `import { ref } from 'vue';

export function useGrpcClient(options = {}) {
  const timeout = options.timeout || 30000;
  const defaultRetryCount = options.retryCount || 3;

  const client = {
    listProducts: async (request) => ({ products: [], total: 0 })
  };

  const callWithRetry = async (fn, retryCount = defaultRetryCount) => {
    let lastError = null;
    for (let i = 0; i < retryCount; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        console.warn(\`[useGrpcClient] Retry \${i + 1}/\${retryCount} failed:\`, err.message);
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
    throw lastError || new Error('All retries failed');
  };

  return { client, callWithRetry };
}`,
        purpose: 'gRPC 클라이언트 래퍼 - 재시도 로직 포함'
      },
      {
        path: 'types/product.ts',
        content: `export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  searchQuery?: string;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}`,
        purpose: '상품 관련 타입 정의'
      }
    ],
    scores,
    totalScore,
    excellentIn,
    patterns: {
      metadata: {
        projectName: 'sample-ecommerce',
        apiType: 'grpc',
        designSystem: 'openerd-nuxt3',
        frameworks: ['vue3', 'pinia', 'nuxt3'],
        patterns: ['composition-api', 'retry-logic', 'pagination', 'filtering', 'sorting'],
        entities: ['product'],
        totalFiles: 4,
        averageComplexity: 'medium',
        filesWithGoodErrorHandling: 3,
        filesWithGoodTypes: 4,
        apiMethods: ['listProducts'],
        componentsUsed: ['CommonTable', 'CommonFilter', 'CommonPageHeader', 'CommonEmptyState']
      },
      scores,
      excellentReasons: [
        'gRPC 클라이언트 재시도 로직이 우수함',
        '타입 정의가 완벽함',
        '디자인 시스템 컴포넌트를 일관되게 사용'
      ]
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['vue3', 'grpc', 'nuxt3', 'pagination', 'filtering', 'sorting', 'list']
    }
  };

  await storage.save(bestCase);

  console.log('✅ BestCase 저장 완료');
  console.log(`ID: ${bestCase.id}`);
  console.log(`Project: ${bestCase.projectName}`);
  console.log(`Category: ${bestCase.category}`);
  console.log(`Total Score: ${totalScore}`);
  console.log(`Excellent In: ${excellentIn.join(', ')}`);
  console.log(`Files: ${bestCase.files.length}개`);
  console.log(`Tags: ${bestCase.metadata.tags.join(', ')}`);
}

setupSampleBestCase().catch(console.error);
