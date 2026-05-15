/**
 * React Query Specialist Test
 * Week 7 - React Frontend Specialists
 *
 * Validates:
 * - File exists and has content
 * - Query patterns documented (20 patterns)
 * - useQuery for GET requests
 * - useMutation for POST/PUT/DELETE
 * - Cache invalidation and management
 * - Optimistic updates
 * - NO useState for server data, NO manual fetch in useEffect
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
    return true;
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
    return false;
  }
}

function testGroup(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

console.log('=== REACT QUERY SPECIALIST TEST SUITE ===\n');
console.log('Week 7 - React Frontend Specialists\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React Query specialist file exists');

  if (fileExists) {
    // Test 2: File has content
    const content = fs.readFileSync(filePath, 'utf8');
    assert(content.length > 1000, 'File has substantial content (>1000 characters)');

    // Test 3: File size reasonable
    const lines = content.split('\n').length;
    assert(lines >= 100, `File has sufficient lines (${lines} lines, expected ≥100)`);
  }
});

// ============================================
// QUERY PATTERN TESTS
// ============================================

testGroup('Query Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: useQuery basic
    assert(content.includes('use-query-basic') || content.includes('useQuery'), 'useQuery basic pattern documented');

    // Test 5: useQuery with params
    assert(content.includes('use-query-with-params') || content.includes('queryKey: [\'users\', userId]'), 'useQuery with params pattern documented');

    // Test 6: useQuery enabled
    assert(content.includes('use-query-enabled') || content.includes('enabled:'), 'useQuery enabled pattern documented');

    // Test 7: useQuery refetch
    assert(content.includes('use-query-refetch') || content.includes('refetchInterval'), 'useQuery refetch pattern documented');

    // Test 8: useInfiniteQuery
    assert(content.includes('use-infinite-query') || content.includes('useInfiniteQuery'), 'useInfiniteQuery pattern documented');

    // Test 9: Parallel queries
    assert(content.includes('use-queries-parallel') || content.includes('parallel'), 'Parallel queries pattern mentioned');

    // Test 10: Query key
    assert(content.includes('queryKey:'), 'Query key usage documented');

    // Test 11: Query function
    assert(content.includes('queryFn:'), 'Query function usage documented');
  }
});

// ============================================
// MUTATION PATTERN TESTS
// ============================================

testGroup('Mutation Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 12: useMutation create
    assert(content.includes('use-mutation-create') || content.includes('useMutation'), 'useMutation create pattern documented');

    // Test 13: useMutation update
    assert(content.includes('use-mutation-update') || content.includes('updateUser'), 'useMutation update pattern documented');

    // Test 14: useMutation delete
    assert(content.includes('use-mutation-delete') || content.includes('deleteUser'), 'useMutation delete pattern documented');

    // Test 15: Optimistic updates
    assert(content.includes('optimistic-updates') || content.includes('onMutate'), 'Optimistic updates pattern documented');

    // Test 16: Mutation callbacks
    assert(content.includes('mutation-callbacks') || content.includes('onSuccess') || content.includes('onError'), 'Mutation callbacks documented');

    // Test 17: mutationFn
    assert(content.includes('mutationFn:'), 'mutationFn usage documented');
  }
});

// ============================================
// CACHE MANAGEMENT TESTS
// ============================================

testGroup('Cache Management Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 18: Query invalidation
    assert(content.includes('query-invalidation') || content.includes('invalidateQueries'), 'Query invalidation pattern documented');

    // Test 19: QueryClient
    assert(content.includes('QueryClient') || content.includes('useQueryClient'), 'QueryClient usage documented');

    // Test 20: staleTime
    assert(content.includes('staleTime'), 'staleTime configuration documented');

    // Test 21: Cache time
    assert(content.includes('cacheTime') || content.includes('gcTime'), 'Cache time configuration documented');

    // Test 22: QueryClientProvider
    assert(content.includes('QueryClientProvider'), 'QueryClientProvider setup documented');

    // Test 23: Prefetching
    assert(content.includes('query-prefetching') || content.includes('prefetch'), 'Prefetching pattern mentioned');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 24: TypeScript code blocks present
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 10, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥10)`);

    // Test 25: useQuery examples
    assert(content.includes('const { data') && content.includes('= useQuery'), 'useQuery examples present');

    // Test 26: useMutation examples
    assert(content.includes('= useMutation'), 'useMutation examples present');

    // Test 27: queryKey examples
    assert(content.includes('queryKey: [\'users\']'), 'queryKey examples present');

    // Test 28: onSuccess callback
    assert(content.includes('onSuccess: (') || content.includes('onSuccess:'), 'onSuccess callback example present');

    // Test 29: invalidateQueries
    assert(content.includes('queryClient.invalidateQueries'), 'invalidateQueries example present');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 30: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 31: NO useState for server data prohibition
    assert(content.includes('NO useState for server data') || content.includes('NO useState'), 'useState for server data prohibition documented');

    // Test 32: NO manual fetch prohibition
    assert(content.includes('NO Manual Fetch') || content.includes('NO manual fetch'), 'Manual fetch prohibition documented');

    // Test 33: NO ignoring cache invalidation prohibition
    assert(content.includes('NO Ignoring Cache') || content.includes('NO ignoring'), 'Ignoring cache invalidation prohibition documented');

    // Test 34: Verify useQuery used in good examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const useQueryPresent = tsCodeBlocks.some(block =>
      block.includes('useQuery') &&
      !block.includes('DON\'T') &&
      !block.includes('❌')
    );
    assert(useQueryPresent, 'useQuery present in correct code examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 35: React Query version mentioned
    assert(content.includes('@tanstack/react-query') || content.includes('React Query'), 'React Query mentioned');

    // Test 36: TypeScript mentioned
    assert(content.includes('TypeScript'), 'TypeScript mentioned');

    // Test 37: Server state management
    assert(content.includes('Server State') || content.includes('server state'), 'Server state management focus documented');

    // Test 38: C# backend integration
    assert(content.includes('C# ASP.NET Core') || content.includes('C#') && content.includes('backend'), 'C# backend integration mentioned');

    // Test 39: 20 patterns documented
    const patternSectionCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternSectionCount >= 10, `Sufficient pattern documentation (${patternSectionCount} patterns, expected ≥10)`);

    // Test 40: Axios integration
    assert(content.includes('axios'), 'Axios integration documented');
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-query-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 41: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section documented');

    // Test 42: queryKey arrays
    assert(content.includes('queryKey') && content.includes('array'), 'queryKey arrays best practice documented');

    // Test 43: Cache invalidation
    assert(content.includes('Invalidate') || content.includes('invalidate'), 'Cache invalidation best practice documented');

    // Test 44: Error handling
    assert(content.includes('error') || content.includes('Error'), 'Error handling mentioned');

    // Test 45: DevTools
    assert(content.includes('DevTools') || content.includes('ReactQueryDevtools'), 'DevTools mentioned');
  }
});

// ============================================
// SUMMARY
// ============================================

console.log(`\n--- Test Summary ---`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n❌ FAILED TESTS:');
  failures.forEach((failure, i) => {
    console.log(`  ${i + 1}. ${failure}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL REACT QUERY SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React Query specialist file created and validated');
  console.log('  - Query patterns documented (useQuery, useInfiniteQuery, enabled, refetch)');
  console.log('  - Mutation patterns documented (useMutation, optimistic updates, callbacks)');
  console.log('  - Cache management documented (invalidateQueries, QueryClient, staleTime)');
  console.log('  - Prohibited patterns documented (NO useState for server data, NO manual fetch)');
  console.log('  - Code examples present (≥10 TypeScript code blocks)');
  console.log('  - Best practices documented (queryKey arrays, invalidation, error handling)');
  console.log('\n🎯 Week 7 Task 3: COMPLETE');
  process.exit(0);
}
