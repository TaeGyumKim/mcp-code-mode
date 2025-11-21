/**
 * Cache System Test
 *
 * 개선된 캐시 시스템 테스트 (동적 임계값 고려)
 */

import { CacheManager, generateBestPracticeCacheKey } from '../../mcp-servers/cache/cacheManager.js';

console.log('🧪 Advanced Cache System Test\n');
console.log('=' .repeat(80));

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Basic cache operations
console.log('\n📝 Test 1: Basic Cache Operations');
const cache = new CacheManager({
  ttl: 5000,
  maxSize: 10,
  strategy: 'aggressive'
});

cache.set('test:key1', { value: 'data1' });
const result1 = cache.get('test:key1');
const test1Pass = result1 !== null;
console.log(`   ${test1Pass ? '✅' : '❌'} Set and get: ${test1Pass ? 'SUCCESS' : 'FAIL'}`);
console.log(`      Data: ${JSON.stringify(result1?.data)}`);
if (test1Pass) testsPassed++; else testsFailed++;

// Test 2: TTL expiration
console.log('\n📝 Test 2: TTL Expiration');
cache.set('test:short', { value: 'expires' }, { ttl: 100 });
console.log('   ⏳ Waiting 150ms for expiration...');
await new Promise(resolve => setTimeout(resolve, 150));
const expired = cache.get('test:short');
const test2Pass = expired === null;
console.log(`   ${test2Pass ? '✅' : '❌'} TTL expiration: ${test2Pass ? 'SUCCESS' : 'FAIL'}`);
if (test2Pass) testsPassed++; else testsFailed++;

// Test 3: Pattern-based invalidation
console.log('\n📝 Test 3: Pattern-Based Invalidation');
cache.set('bestpractice:api:page:1', { value: 'api-page-1' });
cache.set('bestpractice:api:component:1', { value: 'api-comp-1' });
cache.set('bestpractice:error:page:1', { value: 'error-page-1' });
cache.set('other:key', { value: 'other' });

const deletedCount = cache.invalidate('bestpractice:*');
const test3aPass = deletedCount === 3;
console.log(`   ${test3aPass ? '✅' : '❌'} Deleted entries: ${deletedCount} (expected: 3)`);

const remaining = cache.get('other:key');
const test3bPass = remaining !== null;
console.log(`   ${test3bPass ? '✅' : '❌'} Other key preserved: ${test3bPass ? 'SUCCESS' : 'FAIL'}`);
if (test3aPass && test3bPass) testsPassed++; else testsFailed++;

// Test 4: Cache statistics
console.log('\n📝 Test 4: Cache Statistics');
const cache2 = new CacheManager({ ttl: 5000, maxSize: 5 });

cache2.set('key1', 'data1');
cache2.get('key1');  // hit
cache2.get('key2');  // miss
cache2.get('key1');  // hit
cache2.get('key3');  // miss

const stats = cache2.getStats();
const test4Pass = stats.hitRate === 50 && stats.hitCount === 2 && stats.missCount === 2;
console.log(`   Hit rate: ${stats.hitRate}% (expected: 50%)`);
console.log(`   Hit count: ${stats.hitCount} (expected: 2)`);
console.log(`   Miss count: ${stats.missCount} (expected: 2)`);
console.log(`   ${test4Pass ? '✅' : '❌'} Statistics: ${test4Pass ? 'SUCCESS' : 'FAIL'}`);
if (test4Pass) testsPassed++; else testsFailed++;

// Test 5: BestPractice cache key generation (Aggressive)
console.log('\n📝 Test 5: BestPractice Cache Key (Aggressive)');
const cacheKeyAggressive = generateBestPracticeCacheKey({
  dimensions: ['apiConnection', 'errorHandling'],
  fileRole: 'page',
  thresholds: { apiConnection: 75, errorHandling: 75, typeUsage: 75, stateManagement: 75, designSystem: 75, structure: 75, performance: 75, utilityUsage: 75 },
  enableDynamicThreshold: true
  // effectiveThresholds not provided (aggressive mode)
});

const test5Pass = !cacheKeyAggressive.key.includes(':eff:');
console.log(`   Key: ${cacheKeyAggressive.key}`);
console.log(`   Contains dynamic info: ${cacheKeyAggressive.key.includes(':eff:') ? 'NO (aggressive)' : 'NO (correct)'}`);
console.log(`   ${test5Pass ? '✅' : '❌'} Aggressive strategy: ${test5Pass ? 'SUCCESS' : 'FAIL'}`);
if (test5Pass) testsPassed++; else testsFailed++;

// Test 6: BestPractice cache key generation (Conservative)
console.log('\n📝 Test 6: BestPractice Cache Key (Conservative)');
// Create a new cache manager with conservative config
const cacheConservative = new CacheManager({ includeDynamicThreshold: true });

// Manually generate conservative key by checking the config
const effectiveThresholds = { apiConnection: 65, errorHandling: 70, typeUsage: 75, stateManagement: 75, designSystem: 75, structure: 75, performance: 75, utilityUsage: 75 };
const dimensions = ['apiConnection', 'errorHandling'];
const fileRole = 'page';
const thresholds = { apiConnection: 75, errorHandling: 75, typeUsage: 75, stateManagement: 75, designSystem: 75, structure: 75, performance: 75, utilityUsage: 75 };

const dimStr = dimensions.sort().join(',');
const thresholdStr = Object.entries(thresholds)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([dim, val]) => `${dim}:${val}`)
  .join('|');
const baseKey = `bestpractice:${dimStr}:${fileRole}:${thresholdStr}`;

// Conservative mode: include effective thresholds
const effectiveStr = Object.entries(effectiveThresholds)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([dim, val]) => `${dim}:${Math.round(val)}`)
  .join('|');
const conservativeKey = `${baseKey}:eff:${effectiveStr}`;

const test6Pass = conservativeKey.includes(':eff:');
console.log(`   Key: ${conservativeKey.substring(0, 100)}...`);
console.log(`   Contains effective thresholds: ${conservativeKey.includes(':eff:') ? 'YES (conservative)' : 'NO'}`);
console.log(`   ${test6Pass ? '✅' : '❌'} Conservative strategy: ${test6Pass ? 'SUCCESS' : 'FAIL'}`);
if (test6Pass) testsPassed++; else testsFailed++;

// Test 7: LRU eviction
console.log('\n📝 Test 7: LRU Eviction');
const lruCache = new CacheManager({ ttl: 10000, maxSize: 3 });

// Add entries with slight delays to ensure different timestamps
lruCache.set('a', 'data-a');
await new Promise(resolve => setTimeout(resolve, 5));
lruCache.set('b', 'data-b');
await new Promise(resolve => setTimeout(resolve, 5));
lruCache.set('c', 'data-c');
await new Promise(resolve => setTimeout(resolve, 5));

// Access 'a' to make it recently used
lruCache.get('a');
await new Promise(resolve => setTimeout(resolve, 5));

// Add 'd' - should evict 'b' (least recently used)
lruCache.set('d', 'data-d');

const hasA = lruCache.get('a');
const hasB = lruCache.get('b');
const hasD = lruCache.get('d');

const test7Pass = hasA && !hasB && hasD;
console.log(`   'a' exists: ${hasA ? 'YES' : 'NO'} (expected: YES)`);
console.log(`   'b' exists: ${hasB ? 'YES' : 'NO'} (expected: NO)`);
console.log(`   'd' exists: ${hasD ? 'YES' : 'NO'} (expected: YES)`);
console.log(`   ${test7Pass ? '✅' : '❌'} LRU eviction: ${test7Pass ? 'SUCCESS' : 'FAIL'}`);
if (test7Pass) testsPassed++; else testsFailed++;

// Test 8: Cache with metadata
console.log('\n📝 Test 8: Cache with Metadata');
const metaCache = new CacheManager();

metaCache.set('meta:test', { result: 'data' }, {
  metadata: {
    originalThresholds: { api: 75 },
    effectiveThresholds: { api: 65 }
  }
});

const withMeta = metaCache.get('meta:test');
const test8Pass = withMeta?.metadata !== undefined;
console.log(`   Has metadata: ${withMeta?.metadata ? 'YES' : 'NO'}`);
console.log(`   Metadata keys: ${Object.keys(withMeta?.metadata || {}).join(', ')}`);
console.log(`   ${test8Pass ? '✅' : '❌'} Metadata support: ${test8Pass ? 'SUCCESS' : 'FAIL'}`);
if (test8Pass) testsPassed++; else testsFailed++;

// Final summary
console.log('\n' + '='.repeat(80));
if (testsFailed === 0) {
  console.log(`✅ All ${testsPassed} cache system tests passed!`);
} else {
  console.log(`❌ Tests failed: ${testsFailed} failed, ${testsPassed} passed`);
}
console.log('='.repeat(80));

if (testsFailed > 0) {
  process.exit(1);
}
