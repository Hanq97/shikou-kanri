/**
 * Service Layer Specialist Test
 * Phase 2 Day 2 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO MediatR patterns (IMediator, IRequest, IRequestHandler)
 * - NO CQRS patterns
 * - NO field injection
 * - Constructor injection enforced
 * - Service patterns documented
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

console.log('=== SERVICE LAYER SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 2 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-service-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'Service specialist file exists');

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
  const filePath = path.resolve(__dirname, '../csharp-service-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 5: Verify NO IMediator in code examples (except in "wrong" examples)
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const mediatorInGoodCode = csharpBlocks.some(block =>
      block.includes('IMediator') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG') &&
      !block.includes('NO MediatR')
    );
    assert(!mediatorInGoodCode, 'NO IMediator in correct code examples');

    // Test 6: Verify NO CQRS patterns in code examples
    const cqrsInGoodCode = csharpBlocks.some(block =>
      (block.includes('IRequest<') || block.includes('IRequestHandler<')) &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!cqrsInGoodCode, 'NO CQRS patterns in correct code examples');

    // Test 7: Verify NO field injection in code examples
    const fieldInjectionInGoodCode = csharpBlocks.some(block =>
      block.includes('[Inject]') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!fieldInjectionInGoodCode, 'NO field injection in correct code examples');

    // Test 8: Verify NO MediatR prohibition documented
    const prohibitsMediatR = content.includes('NO MediatR') || content.includes('NO IMediator');
    assert(prohibitsMediatR, 'MediatR prohibition documented');

    // Test 9: Verify NO CQRS prohibition documented
    const prohibitsCQRS = content.includes('NO CQRS');
    assert(prohibitsCQRS, 'CQRS prohibition documented');

    // Test 10: Verify NO field injection prohibition documented
    const prohibitsFieldInjection = content.includes('NO Field Injection');
    assert(prohibitsFieldInjection, 'Field injection prohibition documented');
  }
});

// ============================================
// REQUIRED PATTERN TESTS
// ============================================

testGroup('Required Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-service-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 11: Service interface pattern documented
    assert(content.includes('service-interface-pattern') || content.includes('IUserService'), 'Service interface pattern documented');

    // Test 12: Service implementation pattern documented
    assert(content.includes('service-implementation-pattern') || content.includes('UserService'), 'Service implementation pattern documented');

    // Test 13: Constructor injection documented
    assert(content.includes('Constructor injection') || content.includes('Constructor Injection'), 'Constructor injection documented');

    // Test 14: Async methods documented
    assert(content.includes('async-service-methods') || content.includes('async Task'), 'Async service methods documented');

    // Test 15: CancellationToken support documented
    assert(content.includes('CancellationToken'), 'CancellationToken support documented');

    // Test 16: Business validation documented
    assert(content.includes('business-validation-in-service') || content.includes('Business validation'), 'Business validation documented');

    // Test 17: Exception handling documented
    assert(content.includes('exception-handling-service') || content.includes('NotFoundException'), 'Exception handling documented');

    // Test 18: Soft delete pattern documented
    assert(content.includes('soft-delete') || content.includes('IsActive = false'), 'Soft delete pattern documented');

    // Test 19: Pagination pattern documented
    assert(content.includes('pagination-in-service') || content.includes('PaginatedResult'), 'Pagination pattern documented');

    // Test 20: AutoMapper usage documented
    assert(content.includes('IMapper') || content.includes('AutoMapper'), 'AutoMapper usage documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-service-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 10, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥10)`);

    // Test 22: IUserService interface example
    assert(content.includes('IUserService'), 'IUserService interface example present');

    // Test 23: UserService implementation example
    assert(content.includes('UserService') && content.includes('class UserService'), 'UserService implementation example present');

    // Test 24: GetByIdAsync method example
    assert(content.includes('GetByIdAsync'), 'GetByIdAsync method example present');

    // Test 25: CreateAsync method example
    assert(content.includes('CreateAsync'), 'CreateAsync method example present');

    // Test 26: UpdateAsync method example
    assert(content.includes('UpdateAsync'), 'UpdateAsync method example present');

    // Test 27: DeleteAsync method example
    assert(content.includes('DeleteAsync'), 'DeleteAsync method example present');

    // Test 28: Repository injection example
    assert(content.includes('IUserRepository') && content.includes('_userRepository'), 'Repository injection example present');

    // Test 29: AutoMapper injection example
    assert(content.includes('IMapper') && content.includes('_mapper'), 'AutoMapper injection example present');

    // Test 30: Wrong MediatR example (for learning)
    assert(content.includes('IMediator') || content.includes('MediatR'), 'MediatR warning example present');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-service-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 31: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 32: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 33: Service layer focus documented
    assert(content.includes('Service Layer') || content.includes('service layer'), 'Service layer focus documented');

    // Test 34: Constructor injection constraint documented
    assert(content.includes('Constructor Injection ONLY') || content.includes('Constructor injection'), 'Constructor injection constraint documented');

    // Test 35: NO MediatR constraint documented
    assert(content.includes('NO MediatR') || content.includes('NO IMediator'), 'NO MediatR constraint documented');

    // Test 36: NO CQRS constraint documented
    assert(content.includes('NO CQRS'), 'NO CQRS constraint documented');

    // Test 37: Scoped lifetime documented
    assert(content.includes('Scoped') || content.includes('AddScoped'), 'Service lifetime (Scoped) documented');

    // Test 38: IRepository injection (NOT IMediator) documented
    assert(content.includes('IRepository') && content.includes('NOT IMediator'), 'IRepository injection (NOT IMediator) documented');
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
  console.log('\n✅ ALL SERVICE LAYER SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - Service specialist file created and validated');
  console.log('  - NO prohibited patterns (MediatR, CQRS, Field Injection)');
  console.log('  - Required patterns documented (Service Interface, Implementation, Async, Validation)');
  console.log('  - Code examples present (≥10 C# code blocks)');
  console.log('  - Architecture compliance verified (NO MediatR, NO CQRS, Constructor Injection)');
  console.log('\n🎯 Phase 2 Day 2 Task 6: COMPLETE');
  process.exit(0);
}
