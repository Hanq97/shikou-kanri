/**
 * API Controller Specialist Test
 * Phase 2 Day 2 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - Controller patterns documented
 * - HTTP verbs (GET, POST, PUT, DELETE) documented
 * - Action results documented (OK, Created, NotFound, BadRequest)
 * - NO MediatR injection
 * - NO repository injection (inject services)
 * - NO business logic in controllers
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

console.log('=== API CONTROLLER SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 2 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'API specialist file exists');

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
// CONTROLLER PATTERN TESTS
// ============================================

testGroup('Controller Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: ApiController attribute documented
    assert(content.includes('[ApiController]') || content.includes('api-controller-attribute'), 'ApiController attribute documented');

    // Test 5: Route attribute documented
    assert(content.includes('[Route(') || content.includes('route-attribute'), 'Route attribute documented');

    // Test 6: Controller base class
    assert(content.includes('ControllerBase'), 'ControllerBase documented');

    // Test 7: IService injection (NOT IMediator)
    assert(content.includes('IUserService') || content.includes('IService'), 'Service injection documented');

    // Test 8: Constructor injection
    assert(content.includes('Constructor injection') || content.includes('constructor'), 'Constructor injection documented');
  }
});

// ============================================
// HTTP VERB PATTERN TESTS
// ============================================

testGroup('HTTP Verb Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 9: HttpGet documented
    assert(content.includes('[HttpGet]') || content.includes('http-get-action'), 'HttpGet action documented');

    // Test 10: HttpPost documented
    assert(content.includes('[HttpPost]') || content.includes('http-post-action'), 'HttpPost action documented');

    // Test 11: HttpPut documented
    assert(content.includes('[HttpPut]') || content.includes('http-put-action'), 'HttpPut action documented');

    // Test 12: HttpDelete documented
    assert(content.includes('[HttpDelete]') || content.includes('http-delete-action'), 'HttpDelete action documented');

    // Test 13: FromBody binding
    assert(content.includes('[FromBody]') || content.includes('from-body-binding'), 'FromBody binding documented');

    // Test 14: FromQuery binding
    assert(content.includes('[FromQuery]') || content.includes('from-query-binding'), 'FromQuery binding documented');
  }
});

// ============================================
// ACTION RESULT PATTERN TESTS
// ============================================

testGroup('Action Result Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 15: Ok() - 200
    assert(content.includes('Ok(') || content.includes('200 OK'), 'Ok action result documented');

    // Test 16: CreatedAtAction() - 201
    assert(content.includes('CreatedAtAction') || content.includes('201 Created'), 'CreatedAtAction documented');

    // Test 17: NoContent() - 204
    assert(content.includes('NoContent()') || content.includes('204 No Content'), 'NoContent action result documented');

    // Test 18: NotFound() - 404
    assert(content.includes('NotFound()') || content.includes('404 Not Found'), 'NotFound action result documented');

    // Test 19: BadRequest() - 400
    assert(content.includes('BadRequest(') || content.includes('400 Bad Request'), 'BadRequest action result documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 20: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 15, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥15)`);

    // Test 21: UsersController example
    assert(content.includes('UsersController') && content.includes('class UsersController'), 'UsersController example present');

    // Test 22: GetByIdAsync method
    assert(content.includes('GetByIdAsync'), 'GetByIdAsync method example present');

    // Test 23: CreateAsync method
    assert(content.includes('CreateAsync'), 'CreateAsync method example present');

    // Test 24: UpdateAsync method
    assert(content.includes('UpdateAsync'), 'UpdateAsync method example present');

    // Test 25: DeleteAsync method
    assert(content.includes('DeleteAsync'), 'DeleteAsync method example present');

    // Test 26: ActionResult return type
    assert(content.includes('ActionResult<'), 'ActionResult return type documented');

    // Test 27: CancellationToken parameter
    assert(content.includes('CancellationToken'), 'CancellationToken parameter documented');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 28: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 29: NO MediatR prohibition
    assert(content.includes('NO MediatR') || content.includes('NO IMediator'), 'MediatR prohibition documented');

    // Test 30: NO business logic in controllers
    assert(content.includes('NO Business Logic') || content.includes('NO business logic'), 'Business logic prohibition documented');

    // Test 31: NO repository injection
    assert(content.includes('NO Repository Injection') || content.includes('NO repository'), 'Repository injection prohibition documented');

    // Test 32: Verify NO IMediator in good code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const mediatorInGoodCode = csharpBlocks.some(block =>
      block.includes('IMediator') &&
      block.includes('_mediator') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!mediatorInGoodCode, 'NO IMediator in correct code examples');

    // Test 33: Verify NO IRepository in good controller code
    const repositoryInGoodCode = csharpBlocks.some(block =>
      block.includes('IUserRepository') &&
      block.includes('_userRepository') &&
      block.includes('UsersController') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!repositoryInGoodCode, 'NO IRepository injection in correct controller examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-api-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 34: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 35: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 36: API Controller focus documented
    assert(content.includes('API Controller') || content.includes('API controller'), 'API Controller focus documented');

    // Test 37: Service injection (NOT IMediator) documented
    assert(content.includes('Inject IService') && content.includes('NOT IMediator'), 'Service injection (NOT IMediator) documented');

    // Test 38: Async actions documented
    assert(content.includes('async') && content.includes('Async'), 'Async actions documented');

    // Test 39: Exception handling documented
    assert(content.includes('Exception') || content.includes('try-catch'), 'Exception handling documented');

    // Test 40: ProducesResponseType documented
    assert(content.includes('ProducesResponseType') || content.includes('OpenAPI'), 'ProducesResponseType documented');
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
  console.log('\n✅ ALL API CONTROLLER SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - API Controller specialist file created and validated');
  console.log('  - Controller patterns documented ([ApiController], [Route], ControllerBase)');
  console.log('  - HTTP verbs documented (GET, POST, PUT, DELETE)');
  console.log('  - Action results documented (Ok, Created, NoContent, NotFound, BadRequest)');
  console.log('  - Service injection (NOT IMediator) documented');
  console.log('  - Prohibited patterns documented (NO MediatR, NO business logic, NO repository injection)');
  console.log('  - Code examples present (≥15 C# code blocks)');
  console.log('\n🎯 Phase 2 Day 2 Task 9: COMPLETE');
  process.exit(0);
}
