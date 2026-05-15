/**
 * DTO Mapper Specialist Test
 * Phase 2 Day 2 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - Record types documented
 * - AutoMapper patterns present
 * - Value object mapping documented
 * - NO manual mapping in services
 * - NO circular references warning
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

console.log('=== DTO MAPPER SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 2 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'DTO Mapper specialist file exists');

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
// DTO PATTERN TESTS
// ============================================

testGroup('DTO Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Record type pattern documented
    assert(content.includes('record') && content.includes('Record'), 'Record type pattern documented');

    // Test 5: Response DTO pattern
    assert(content.includes('response-dto-pattern') || content.includes('UserDto'), 'Response DTO pattern documented');

    // Test 6: Create DTO pattern
    assert(content.includes('create-dto-pattern') || content.includes('CreateUserDto'), 'Create DTO pattern documented');

    // Test 7: Update DTO pattern
    assert(content.includes('update-dto-pattern') || content.includes('UpdateUserDto'), 'Update DTO pattern documented');

    // Test 8: Data annotations for validation
    assert(content.includes('[Required]') || content.includes('[EmailAddress]'), 'Data annotations documented');

    // Test 9: Nullable properties for partial updates
    assert(content.includes('string?') || content.includes('nullable'), 'Nullable properties documented');
  }
});

// ============================================
// AUTOMAPPER PATTERN TESTS
// ============================================

testGroup('AutoMapper Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 10: AutoMapper profile pattern
    assert(content.includes('automapper-profile') || content.includes('MappingProfile'), 'AutoMapper profile pattern documented');

    // Test 11: CreateMap usage
    assert(content.includes('CreateMap<'), 'CreateMap usage documented');

    // Test 12: ForMember configuration
    assert(content.includes('ForMember'), 'ForMember configuration documented');

    // Test 13: Value object to string mapping
    assert(content.includes('value-object-to-string') || (content.includes('Email.Value') && content.includes('string')), 'Value object to string mapping documented');

    // Test 14: String to value object mapping
    assert(content.includes('string-to-value-object') || content.includes('new Email('), 'String to value object mapping documented');

    // Test 15: Ignore properties pattern
    assert(content.includes('opt.Ignore()'), 'Ignore properties pattern documented');

    // Test 16: Conditional mapping for partial updates
    assert(content.includes('Condition') || content.includes('conditional-mapping'), 'Conditional mapping documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 15, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥15)`);

    // Test 18: UserDto example
    assert(content.includes('UserDto') && content.includes('record'), 'UserDto record example present');

    // Test 19: CreateUserDto example
    assert(content.includes('CreateUserDto') && content.includes('[Required]'), 'CreateUserDto with validation example present');

    // Test 20: UpdateUserDto example
    assert(content.includes('UpdateUserDto') && content.includes('string?'), 'UpdateUserDto with nullable properties example present');

    // Test 21: MappingProfile example
    assert(content.includes('Profile') && content.includes('CreateMap'), 'MappingProfile example present');

    // Test 22: IMapper injection
    assert(content.includes('IMapper'), 'IMapper interface documented');

    // Test 23: _mapper.Map usage
    assert(content.includes('_mapper.Map'), 'AutoMapper Map method usage documented');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 24: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 25: Manual mapping prohibition documented
    assert(content.includes('NO Manual Mapping') || content.includes('NO manual mapping'), 'Manual mapping prohibition documented');

    // Test 26: Circular reference warning documented
    assert(content.includes('NO Circular References') || content.includes('circular'), 'Circular reference warning documented');

    // Test 27: Verify NO manual mapping in good code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const manualMappingInGoodCode = csharpBlocks.some(block =>
      block.includes('new UserDto(') &&
      block.includes('Id:') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!manualMappingInGoodCode, 'NO manual mapping in correct code examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-dto-mapper-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 28: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 29: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 30: DTO Mapper focus documented
    assert(content.includes('DTO Mapper') || content.includes('DTO mapping'), 'DTO Mapper focus documented');

    // Test 31: AutoMapper required documented
    assert(content.includes('AutoMapper') || content.includes('IMapper'), 'AutoMapper requirement documented');

    // Test 32: Record types recommended
    assert(content.includes('record types') || content.includes('Record types'), 'Record types recommendation documented');

    // Test 33: Projection for performance
    assert(content.includes('ProjectTo') || content.includes('projection'), 'Projection pattern documented');
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
  console.log('\n✅ ALL DTO MAPPER SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - DTO Mapper specialist file created and validated');
  console.log('  - Record types documented (immutable DTOs)');
  console.log('  - AutoMapper patterns present (Profile, CreateMap, ForMember)');
  console.log('  - Value object mapping documented (Email.Value ↔ string)');
  console.log('  - Prohibited patterns documented (NO manual mapping, NO circular references)');
  console.log('  - Code examples present (≥15 C# code blocks)');
  console.log('\n🎯 Phase 2 Day 2 Task 7: COMPLETE');
  process.exit(0);
}
