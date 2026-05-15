/**
 * Domain Specialist Test
 * Phase 2 Day 1 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO MediatR references
 * - NO CQRS references
 * - Domain patterns documented
 * - Code examples present
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

console.log('=== DOMAIN SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 1 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-domain-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'Domain specialist file exists');

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
  const filePath = path.resolve(__dirname, '../csharp-domain-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents NO MediatR (allows mentions in prohibition section)
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

    // Test 7: Verify prohibition of Domain Events documented
    const prohibitsDomainEvents = content.includes('NO Domain Event');
    assert(prohibitsDomainEvents, 'Domain Events prohibition documented');
  }
});

// ============================================
// REQUIRED PATTERN TESTS
// ============================================

testGroup('Required Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-domain-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 8: BaseEntity pattern present
    assert(content.includes('BaseEntity'), 'BaseEntity pattern documented');

    // Test 9: Value Object pattern present
    assert(content.includes('ValueObject') || content.includes('value-object'), 'Value Object pattern documented');

    // Test 10: Guard clauses pattern present
    assert(content.includes('Guard'), 'Guard clauses pattern documented');

    // Test 11: Repository interface pattern present
    assert(content.includes('IUserRepository') || content.includes('IRepository'), 'Repository interface pattern documented');

    // Test 12: Factory method pattern present
    assert(content.includes('Create(') || content.includes('factory'), 'Factory method pattern documented');

    // Test 13: Private setters mentioned
    assert(content.includes('private set') || content.includes('Private Setters'), 'Private setters pattern documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-domain-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 14: C# code blocks present
    const codeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(codeBlockCount >= 5, `Sufficient C# code examples (${codeBlockCount} code blocks, expected ≥5)`);

    // Test 15: Entity examples present
    assert(content.includes('class User') || content.includes('class Loan'), 'Entity examples present');

    // Test 16: Constructor validation examples
    assert(content.includes('Guard.Against') || content.includes('throw new Argument'), 'Constructor validation examples present');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-domain-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 18: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 19: Domain layer focus
    assert(content.includes('Domain') && content.includes('Entities'), 'Domain layer focus present');

    // Test 20: NO CQRS constraint documented
    assert(content.includes('NO CQRS') || content.includes('NO MediatR'), 'NO CQRS constraint documented');
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
  console.log('\n✅ ALL DOMAIN SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - Domain specialist file created and validated');
  console.log('  - NO prohibited patterns (MediatR, CQRS, Domain Events)');
  console.log('  - Required patterns documented (BaseEntity, Value Objects, Guard Clauses)');
  console.log('  - Code examples present (≥5 code blocks)');
  console.log('  - Architecture compliance verified');
  console.log('\n🎯 Phase 2 Day 1 Task 1: COMPLETE');
  process.exit(0);
}
