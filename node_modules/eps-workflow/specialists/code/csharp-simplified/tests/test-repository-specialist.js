/**
 * Repository Specialist Test
 * Phase 2 Day 2 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - Repository interface pattern (Domain layer)
 * - Repository implementation pattern (Infrastructure layer)
 * - Generic repository pattern
 * - NO lazy loading
 * - NO business logic in repositories
 * - NO MediatR in repositories
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

console.log('=== REPOSITORY SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 2 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'Repository specialist file exists');

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
// REPOSITORY PATTERN TESTS
// ============================================

testGroup('Repository Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Repository interface pattern
    assert(content.includes('repository-interface') || content.includes('IUserRepository'), 'Repository interface pattern documented');

    // Test 5: Repository implementation pattern
    assert(content.includes('repository-implementation') || content.includes('UserRepository'), 'Repository implementation pattern documented');

    // Test 6: Generic repository interface
    assert(content.includes('generic-repository-interface') || content.includes('IRepository<T>'), 'Generic repository interface documented');

    // Test 7: Generic repository implementation
    assert(content.includes('generic-repository-implementation') || content.includes('Repository<T>'), 'Generic repository implementation documented');

    // Test 8: Interfaces in Domain layer documented
    assert(content.includes('Domain/Interfaces') || content.includes('Interfaces in Domain'), 'Repository interfaces in Domain layer documented');

    // Test 9: Implementations in Infrastructure layer documented
    assert(content.includes('Infrastructure/Repositories') || content.includes('Implementations in Infrastructure'), 'Repository implementations in Infrastructure layer documented');
  }
});

// ============================================
// QUERY PATTERN TESTS
// ============================================

testGroup('Query Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 10: AsNoTracking pattern
    assert(content.includes('AsNoTracking'), 'AsNoTracking pattern documented');

    // Test 11: Include for eager loading
    assert(content.includes('Include(') || content.includes('eager loading'), 'Include for eager loading documented');

    // Test 12: Pagination with Skip/Take
    assert(content.includes('Skip(') && content.includes('Take('), 'Pagination pattern documented');

    // Test 13: Where filtering
    assert(content.includes('Where(') || content.includes('filtering-where'), 'Where filtering documented');

    // Test 14: OrderBy sorting
    assert(content.includes('OrderBy(') || content.includes('sorting-order-by'), 'OrderBy sorting documented');

    // Test 15: Any for existence check
    assert(content.includes('AnyAsync') || content.includes('exists-check'), 'Any for existence check documented');

    // Test 16: Count pattern
    assert(content.includes('CountAsync'), 'Count pattern documented');

    // Test 17: AddRange for bulk insert
    assert(content.includes('AddRangeAsync') || content.includes('bulk-insert'), 'Bulk insert pattern documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 18: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 15, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥15)`);

    // Test 19: IUserRepository interface example
    assert(content.includes('IUserRepository') && content.includes('interface'), 'IUserRepository interface example present');

    // Test 20: UserRepository implementation example
    assert(content.includes('UserRepository') && content.includes('class UserRepository'), 'UserRepository implementation example present');

    // Test 21: IRepository<T> generic interface
    assert(content.includes('IRepository<T>'), 'Generic repository interface example present');

    // Test 22: Repository<T> generic implementation
    assert(content.includes('Repository<T>') && content.includes('class Repository'), 'Generic repository implementation example present');

    // Test 23: ApplicationDbContext usage
    assert(content.includes('ApplicationDbContext'), 'ApplicationDbContext usage present');

    // Test 24: GetByIdAsync method
    assert(content.includes('GetByIdAsync'), 'GetByIdAsync method example present');

    // Test 25: GetAllAsync method
    assert(content.includes('GetAllAsync'), 'GetAllAsync method example present');

    // Test 26: FindAsync with predicate
    assert(content.includes('FindAsync') || content.includes('Expression<Func'), 'FindAsync with predicate example present');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 27: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 28: NO lazy loading prohibition
    assert(content.includes('NO Lazy Loading') || content.includes('NO lazy loading'), 'Lazy loading prohibition documented');

    // Test 29: NO business logic in repositories
    assert(content.includes('NO Business Logic') || content.includes('NO business logic'), 'Business logic prohibition documented');

    // Test 30: NO MediatR in repositories
    assert(content.includes('NO MediatR'), 'MediatR prohibition documented');

    // Test 31: Verify NO lazy loading in good code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const lazyLoadingInGoodCode = csharpBlocks.some(block =>
      block.includes('UseLazyLoadingProxies()') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!lazyLoadingInGoodCode, 'NO lazy loading in correct code examples');

    // Test 32: Verify NO MediatR in good code examples
    const mediatorInGoodCode = csharpBlocks.some(block =>
      block.includes('IMediator') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!mediatorInGoodCode, 'NO IMediator in correct code examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-repository-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 33: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 34: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 35: Repository pattern focus documented
    assert(content.includes('Repository Pattern') || content.includes('Repository pattern'), 'Repository pattern focus documented');

    // Test 36: Domain/Infrastructure separation documented
    assert(content.includes('Domain layer') && content.includes('Infrastructure layer'), 'Layer separation documented');

    // Test 37: AsNoTracking for performance documented
    assert(content.includes('AsNoTracking') && (content.includes('performance') || content.includes('read-only')), 'AsNoTracking for performance documented');

    // Test 38: Include for eager loading (NOT lazy loading) documented
    assert(content.includes('Include') && content.includes('eager loading'), 'Eager loading strategy documented');
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
  console.log('\n✅ ALL REPOSITORY SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - Repository specialist file created and validated');
  console.log('  - Repository interface pattern (Domain layer) documented');
  console.log('  - Repository implementation pattern (Infrastructure layer) documented');
  console.log('  - Generic repository pattern present');
  console.log('  - Query patterns documented (AsNoTracking, Include, Pagination, Where, OrderBy)');
  console.log('  - Prohibited patterns documented (NO lazy loading, NO business logic, NO MediatR)');
  console.log('  - Code examples present (≥15 C# code blocks)');
  console.log('\n🎯 Phase 2 Day 2 Task 8: COMPLETE');
  process.exit(0);
}
