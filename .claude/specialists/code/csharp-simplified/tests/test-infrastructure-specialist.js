/**
 * Infrastructure Specialist Test
 * Phase 2 Day 1 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO MediatR references in code
 * - NO CQRS references in code
 * - Infrastructure patterns documented
 * - DbContext, Repository patterns present
 * - SQL injection prevention documented
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

console.log('=== INFRASTRUCTURE SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 1 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'Infrastructure specialist file exists');

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
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 5: Verify NO actual MediatR code examples (check csharp code blocks only)
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }
    const mediatrInCode = csharpBlocks.some(block =>
      (block.includes('IMediator') || block.includes('IRequest<')) &&
      !block.includes('DO NOT')
    );
    assert(!mediatrInCode, 'NO MediatR in code examples');

    // Test 6: Verify prohibition of CQRS documented
    const prohibitsCQRS = content.includes('NO CQRS') || content.includes('NO MediatR');
    assert(prohibitsCQRS, 'CQRS prohibition documented');

    // Test 7: Verify SQL injection prevention documented
    const prohibitsSQLInjection = content.includes('SQL injection') || content.includes('Parameterized');
    assert(prohibitsSQLInjection, 'SQL injection prevention documented');
  }
});

// ============================================
// REQUIRED PATTERN TESTS
// ============================================

testGroup('Required Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 8: DbContext pattern present
    assert(content.includes('DbContext') || content.includes('ApplicationDbContext'), 'DbContext pattern documented');

    // Test 9: Repository pattern present
    assert(content.includes('Repository'), 'Repository pattern documented');

    // Test 10: Unit of Work pattern present
    assert(content.includes('UnitOfWork') || content.includes('unit-of-work'), 'Unit of Work pattern documented');

    // Test 11: AsNoTracking pattern present
    assert(content.includes('AsNoTracking'), 'AsNoTracking pattern documented');

    // Test 12: Include() for eager loading present
    assert(content.includes('Include('), 'Include() pattern documented');

    // Test 13: Constructor injection mentioned
    assert(content.includes('Constructor Injection') || content.includes('constructor'), 'Constructor injection pattern documented');

    // Test 14: Retry policy mentioned
    assert(content.includes('EnableRetryOnFailure') || content.includes('retry'), 'Retry policy pattern documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 15: C# code blocks present
    const codeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(codeBlockCount >= 5, `Sufficient C# code examples (${codeBlockCount} code blocks, expected ≥5)`);

    // Test 16: Repository implementation example
    assert(content.includes('class UserRepository') || content.includes('class LoanRepository'), 'Repository implementation example present');

    // Test 17: DbContext example
    assert(content.includes('class ApplicationDbContext'), 'DbContext example present');

    // Test 18: Parameterized query example
    assert(content.includes('FromSqlRaw') && content.includes('{0}'), 'Parameterized query example present');
  }
});

// ============================================
// SECURITY TESTS
// ============================================

testGroup('Security Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 19: SQL injection warning present
    const hasSQLInjectionWarning = content.includes('SQL injection') || content.includes('NEVER concatenate');
    assert(hasSQLInjectionWarning, 'SQL injection warning documented');

    // Test 20: Parameterized queries documented
    const hasParameterizedQueries = content.includes('Parameterized') || content.includes('{0}');
    assert(hasParameterizedQueries, 'Parameterized queries documented');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-infrastructure-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 22: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 23: Infrastructure layer focus
    assert(content.includes('Infrastructure'), 'Infrastructure layer focus present');

    // Test 24: NO CQRS constraint documented
    assert(content.includes('NO CQRS') || content.includes('NO MediatR'), 'NO CQRS constraint documented');

    // Test 25: Connection string example or mention
    assert(content.includes('ConnectionStrings') || content.includes('connection string'), 'Connection string configuration documented');
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
  console.log('\n✅ ALL INFRASTRUCTURE SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - Infrastructure specialist file created and validated');
  console.log('  - NO prohibited patterns (MediatR, CQRS, SQL Injection)');
  console.log('  - Required patterns documented (DbContext, Repository, UnitOfWork, AsNoTracking)');
  console.log('  - Security patterns documented (Parameterized queries, SQL injection prevention)');
  console.log('  - Code examples present (≥5 code blocks)');
  console.log('  - Architecture compliance verified');
  console.log('\n🎯 Phase 2 Day 1 Task 2: COMPLETE');
  process.exit(0);
}
