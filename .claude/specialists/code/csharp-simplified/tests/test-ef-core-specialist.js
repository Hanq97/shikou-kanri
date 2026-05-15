/**
 * EF Core Specialist Test
 * Phase 2 Day 1 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO Data Annotations for configuration in code
 * - EF Core patterns documented
 * - Fluent API patterns present
 * - IEntityTypeConfiguration pattern documented
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

console.log('=== EF CORE SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 1 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-core-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'EF Core specialist file exists');

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
  const filePath = path.resolve(__dirname, '../csharp-ef-core-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 5: Verify NO data annotations for configuration in code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }
    const dataAnnotationsInCode = csharpBlocks.some(block =>
      (block.includes('[Table(') || block.includes('[Column(') || block.includes('[ForeignKey(')) &&
      !block.includes('DO NOT') &&
      !block.includes('NO Data Annotations')
    );
    assert(!dataAnnotationsInCode, 'NO data annotations for configuration in code examples');

    // Test 6: Verify prohibition of data annotations documented
    const prohibitsDataAnnotations = content.includes('NO Data Annotations') || content.includes('NO data annotations');
    assert(prohibitsDataAnnotations, 'Data annotations prohibition documented');

    // Test 7: Verify automatic migrations prohibition
    const prohibitsAutoMigrations = content.includes('NO Automatic Migrations') || content.includes('Database.EnsureCreated');
    assert(prohibitsAutoMigrations, 'Automatic migrations prohibition documented');

    // Test 8: Verify lazy loading prohibition
    const prohibitsLazyLoading = content.includes('NO Lazy Loading');
    assert(prohibitsLazyLoading, 'Lazy loading prohibition documented');
  }
});

// ============================================
// REQUIRED PATTERN TESTS
// ============================================

testGroup('Required Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-core-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 9: IEntityTypeConfiguration pattern present
    assert(content.includes('IEntityTypeConfiguration'), 'IEntityTypeConfiguration pattern documented');

    // Test 10: Fluent API pattern present
    assert(content.includes('Fluent API'), 'Fluent API pattern documented');

    // Test 11: HasKey pattern present
    assert(content.includes('HasKey'), 'HasKey pattern documented');

    // Test 12: HasForeignKey pattern present
    assert(content.includes('HasForeignKey'), 'HasForeignKey pattern documented');

    // Test 13: HasIndex pattern present
    assert(content.includes('HasIndex'), 'HasIndex pattern documented');

    // Test 14: IsRequired pattern present
    assert(content.includes('IsRequired'), 'IsRequired pattern documented');

    // Test 15: HasMaxLength pattern present
    assert(content.includes('HasMaxLength'), 'HasMaxLength pattern documented');

    // Test 16: HasOne/WithMany relationship pattern present
    assert(content.includes('HasOne') && content.includes('WithMany'), 'Relationship configuration patterns documented');

    // Test 17: OnDelete cascade behavior pattern present
    assert(content.includes('OnDelete'), 'Delete behavior configuration documented');

    // Test 18: OwnsOne for value objects pattern present
    assert(content.includes('OwnsOne'), 'OwnsOne pattern for value objects documented');

    // Test 19: ApplyConfigurationsFromAssembly pattern present
    assert(content.includes('ApplyConfigurationsFromAssembly'), 'ApplyConfigurationsFromAssembly pattern documented');

    // Test 20: ToTable pattern present
    assert(content.includes('ToTable'), 'ToTable pattern documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-core-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: C# code blocks present
    const codeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(codeBlockCount >= 10, `Sufficient C# code examples (${codeBlockCount} code blocks, expected ≥10)`);

    // Test 22: UserConfiguration example present
    assert(content.includes('class UserConfiguration') || content.includes('UserConfiguration : IEntityTypeConfiguration'), 'UserConfiguration example present');

    // Test 23: LoanConfiguration example present
    assert(content.includes('class LoanConfiguration') || content.includes('LoanConfiguration : IEntityTypeConfiguration'), 'LoanConfiguration example present');

    // Test 24: Configure method example present
    assert(content.includes('public void Configure(EntityTypeBuilder'), 'Configure method example present');

    // Test 25: Relationship configuration example
    assert(content.includes('HasOne(') && content.includes('WithMany('), 'Relationship configuration example present');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-core-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 26: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 27: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 28: Infrastructure layer focus
    assert(content.includes('Infrastructure'), 'Infrastructure layer focus present');

    // Test 29: Fluent API only constraint documented
    assert(content.includes('Fluent API Only') || content.includes('Fluent API for all configuration'), 'Fluent API only constraint documented');

    // Test 30: Configuration separation documented
    assert(content.includes('IEntityTypeConfiguration<T>'), 'Configuration separation documented');
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
  console.log('\n✅ ALL EF CORE SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - EF Core specialist file created and validated');
  console.log('  - NO prohibited patterns (Data Annotations for config, Automatic Migrations, Lazy Loading)');
  console.log('  - Required patterns documented (IEntityTypeConfiguration, Fluent API, Relationships)');
  console.log('  - Code examples present (≥10 code blocks)');
  console.log('  - Architecture compliance verified');
  console.log('\n🎯 Phase 2 Day 1 Task 3: COMPLETE');
  process.exit(0);
}
