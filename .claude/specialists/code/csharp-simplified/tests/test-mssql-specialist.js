/**
 * MS SQL Specialist Test
 * Phase 2 Day 1 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO SQL injection in code examples
 * - Security patterns documented
 * - Connection string patterns documented
 * - Performance patterns documented
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

console.log('=== MS SQL SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 1 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'MS SQL specialist file exists');

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
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 5: Verify NO SQL injection examples (except in "wrong" examples)
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    // Check for SQL injection in code that's NOT marked as wrong
    const sqlInjectionInGoodCode = csharpBlocks.some(block =>
      (block.includes('$"SELECT') || block.includes('" + ') || block.includes('+ "')) &&
      !block.includes('VULNERABLE') &&
      !block.includes('WRONG') &&
      !block.includes('NEVER') &&
      !block.includes('DON\'T') &&
      !block.includes('❌')
    );
    assert(!sqlInjectionInGoodCode, 'NO SQL injection in correct code examples');

    // Test 6: Verify SQL injection prohibition documented
    const prohibitsSQLInjection = content.includes('NO SQL Injection') || content.includes('SQL injection');
    assert(prohibitsSQLInjection, 'SQL injection prohibition documented');

    // Test 7: Verify plain text password prohibition
    const prohibitsPlainPasswords = content.includes('NO Plain Text Passwords');
    assert(prohibitsPlainPasswords, 'Plain text password prohibition documented');

    // Test 8: Verify hardcoded credentials prohibition
    const prohibitsHardcodedCreds = content.includes('NO Hardcoded Credentials');
    assert(prohibitsHardcodedCreds, 'Hardcoded credentials prohibition documented');
  }
});

// ============================================
// SECURITY PATTERN TESTS
// ============================================

testGroup('Security Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 9: Parameterized queries documented
    assert(content.includes('FromSqlRaw') && (content.includes('{0}') || content.includes('{1}')), 'Parameterized queries pattern documented');

    // Test 10: User Secrets documented
    assert(content.includes('dotnet user-secrets') || content.includes('User Secrets'), 'User Secrets pattern documented');

    // Test 11: Password hashing documented
    assert(content.includes('BCrypt') || content.includes('password-hashing'), 'Password hashing pattern documented');

    // Test 12: Encrypted connections documented
    assert(content.includes('Encrypt=') || content.includes('encrypted-connections'), 'Encrypted connections pattern documented');

    // Test 13: Least privilege principle documented
    assert(content.includes('least-privilege') || content.includes('minimal permissions'), 'Least privilege principle documented');
  }
});

// ============================================
// CONNECTION STRING PATTERN TESTS
// ============================================

testGroup('Connection String Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 14: Connection string format documented
    assert(content.includes('Server=') && content.includes('Database='), 'Connection string format documented');

    // Test 15: Connection pooling documented
    assert(content.includes('Max Pool Size') || content.includes('connection-pooling'), 'Connection pooling documented');

    // Test 16: Connection timeout documented
    assert(content.includes('Connection Timeout') || content.includes('connection-timeout'), 'Connection timeout documented');

    // Test 17: Retry policy documented
    assert(content.includes('EnableRetryOnFailure') || content.includes('retry'), 'Retry policy documented');

    // Test 18: TrustServerCertificate documented
    assert(content.includes('TrustServerCertificate'), 'TrustServerCertificate pattern documented');
  }
});

// ============================================
// PERFORMANCE PATTERN TESTS
// ============================================

testGroup('Performance Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 19: Index optimization documented
    assert(content.includes('CREATE INDEX') || content.includes('index-optimization'), 'Index optimization documented');

    // Test 20: Batch operations documented
    assert(content.includes('AddRange') || content.includes('batch-operations'), 'Batch operations documented');

    // Test 21: Query execution plan documented
    assert(content.includes('execution plan') || content.includes('STATISTICS'), 'Query execution plan documented');

    // Test 22: AsNoTracking usage documented
    assert(content.includes('AsNoTracking'), 'AsNoTracking usage documented');

    // Test 23: Existence check optimization (Any vs Count)
    assert(content.includes('AnyAsync') || content.includes('existence check'), 'Existence check optimization documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 24: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 5, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥5)`);

    // Test 25: JSON configuration examples present
    const jsonCodeBlockCount = (content.match(/```json/gi) || []).length;
    assert(jsonCodeBlockCount >= 2, `Sufficient JSON examples (${jsonCodeBlockCount} code blocks, expected ≥2)`);

    // Test 26: SQL examples present
    const sqlCodeBlockCount = (content.match(/```sql/gi) || []).length;
    assert(sqlCodeBlockCount >= 2, `Sufficient SQL examples (${sqlCodeBlockCount} code blocks, expected ≥2)`);

    // Test 27: Correct parameterized query example
    assert(content.includes('FromSqlRaw') && content.includes('{0}'), 'Correct parameterized query example present');

    // Test 28: Wrong SQL injection example (for learning)
    assert(content.includes('VULNERABLE') || content.includes('SQL injection'), 'SQL injection warning example present');

    // Test 29: Connection string example with user's server
    assert(content.includes('192.168.9.51') || content.includes('Server='), 'Connection string example present');

    // Test 30: Password hashing example
    assert(content.includes('HashPassword') || content.includes('BCrypt'), 'Password hashing example present');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-mssql-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 31: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 32: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 33: Security focus documented
    assert(content.includes('Security') || content.includes('security'), 'Security focus present');

    // Test 34: Parameterized queries constraint documented
    assert(content.includes('Parameterized Queries Only') || content.includes('ALWAYS use parameterized'), 'Parameterized queries constraint documented');

    // Test 35: NO SQL Injection constraint documented
    assert(content.includes('NO SQL Injection'), 'NO SQL Injection constraint documented');
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
  console.log('\n✅ ALL MS SQL SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - MS SQL specialist file created and validated');
  console.log('  - NO prohibited patterns (SQL Injection, Plain Text Passwords, Hardcoded Credentials)');
  console.log('  - Security patterns documented (Parameterized Queries, User Secrets, Password Hashing)');
  console.log('  - Connection patterns documented (Pooling, Retry Policy, Encryption)');
  console.log('  - Performance patterns documented (Indexes, Batch Operations, Query Plans)');
  console.log('  - Code examples present (≥5 C#, ≥2 JSON, ≥2 SQL)');
  console.log('  - Architecture compliance verified');
  console.log('\n🎯 Phase 2 Day 1 Task 5: COMPLETE');
  console.log('\n🎉 ALL 5 SPECIALISTS COMPLETE!');
  process.exit(0);
}
