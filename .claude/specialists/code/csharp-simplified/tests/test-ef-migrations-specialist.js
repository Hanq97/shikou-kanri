/**
 * EF Migrations Specialist Test
 * Phase 2 Day 1 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - NO automatic migrations in code
 * - Migration patterns documented
 * - CLI commands documented
 * - Best practices documented
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

console.log('=== EF MIGRATIONS SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 1 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'EF Migrations specialist file exists');

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
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 5: Verify NO automatic migrations usage in code examples
    const csharpBlocks = [];
    const bashBlocks = [];
    const csharpRegex = /```csharp([\s\S]*?)```/g;
    const bashRegex = /```bash([\s\S]*?)```/g;
    let match;

    while ((match = csharpRegex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }
    while ((match = bashRegex.exec(content)) !== null) {
      bashBlocks.push(match[1]);
    }

    const ensureCreatedInCode = csharpBlocks.some(block =>
      block.includes('Database.EnsureCreated()') &&
      !block.includes('DON\'T') &&
      !block.includes('❌')
    );
    assert(!ensureCreatedInCode, 'NO Database.EnsureCreated() in production code examples');

    // Test 6: Verify prohibition of automatic migrations documented
    const prohibitsAutoMigrations = content.includes('NO Automatic Migrations') || content.includes('NO automatic migrations');
    assert(prohibitsAutoMigrations, 'Automatic migrations prohibition documented');

    // Test 7: Verify prohibition of direct database changes
    const prohibitsDirectChanges = content.includes('NO Direct Database Changes') || content.includes('NO manual database');
    assert(prohibitsDirectChanges, 'Direct database changes prohibition documented');

    // Test 8: Verify prohibition of skip review
    const prohibitsSkipReview = content.includes('NO Skip Review') || content.includes('Review Required');
    assert(prohibitsSkipReview, 'Skip review prohibition documented');
  }
});

// ============================================
// REQUIRED PATTERN TESTS
// ============================================

testGroup('Required Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 9: dotnet ef migrations add command documented
    assert(content.includes('dotnet ef migrations add'), 'Migration creation command documented');

    // Test 10: dotnet ef database update command documented
    assert(content.includes('dotnet ef database update'), 'Database update command documented');

    // Test 11: Up() and Down() methods documented
    assert(content.includes('Up(') && content.includes('Down('), 'Migration Up/Down methods documented');

    // Test 12: Migration naming convention documented
    assert(content.includes('migration-naming-convention') || content.includes('Naming Convention'), 'Naming convention documented');

    // Test 13: Data seeding pattern documented
    assert(content.includes('InsertData') || content.includes('migration-data-seeding'), 'Data seeding pattern documented');

    // Test 14: Idempotent script generation documented
    assert(content.includes('--idempotent'), 'Idempotent script generation documented');

    // Test 15: Migration rollback documented
    assert(content.includes('rollback') || content.includes('migrations remove'), 'Migration rollback documented');

    // Test 16: Database.Migrate() for startup documented
    assert(content.includes('Database.Migrate()'), 'Automatic migration at startup documented');

    // Test 17: Migration review process documented
    assert(content.includes('Review') || content.includes('review'), 'Migration review process documented');

    // Test 18: Backup strategy documented
    assert(content.includes('backup') || content.includes('Backup'), 'Backup strategy documented');

    // Test 19: Migration script generation documented
    assert(content.includes('migrations script'), 'Migration script generation documented');

    // Test 20: MigrationBuilder usage documented
    assert(content.includes('MigrationBuilder'), 'MigrationBuilder usage documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 5, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥5)`);

    // Test 22: Bash/CLI code blocks present
    const bashCodeBlockCount = (content.match(/```bash/gi) || []).length;
    assert(bashCodeBlockCount >= 5, `Sufficient CLI examples (${bashCodeBlockCount} code blocks, expected ≥5)`);

    // Test 23: Migration class example present
    assert(content.includes('public partial class') && content.includes(': Migration'), 'Migration class example present');

    // Test 24: CreateTable example present
    assert(content.includes('CreateTable'), 'CreateTable example present');

    // Test 25: CreateIndex example present
    assert(content.includes('CreateIndex'), 'CreateIndex example present');

    // Test 26: ForeignKey example present
    assert(content.includes('ForeignKey') || content.includes('AddForeignKey'), 'Foreign key migration example present');

    // Test 27: InsertData example present
    assert(content.includes('InsertData'), 'Data seeding example present');
  }
});

// ============================================
// CLI COMMANDS TESTS
// ============================================

testGroup('CLI Commands Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 28: migrations add command
    assert(content.includes('dotnet ef migrations add'), 'migrations add command documented');

    // Test 29: database update command
    assert(content.includes('dotnet ef database update'), 'database update command documented');

    // Test 30: migrations list command
    assert(content.includes('dotnet ef migrations list'), 'migrations list command documented');

    // Test 31: migrations remove command
    assert(content.includes('dotnet ef migrations remove'), 'migrations remove command documented');

    // Test 32: migrations script command
    assert(content.includes('dotnet ef migrations script'), 'migrations script command documented');

    // Test 33: --project parameter usage
    assert(content.includes('--project'), '--project parameter documented');

    // Test 34: --startup-project parameter usage
    assert(content.includes('--startup-project'), '--startup-project parameter documented');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-ef-migrations-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 35: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 36: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 37: Code-First migrations focus
    assert(content.includes('Code-First'), 'Code-First migrations focus present');

    // Test 38: NO Automatic Migrations constraint documented
    assert(content.includes('NO Automatic Migrations'), 'NO Automatic Migrations constraint documented');

    // Test 39: Infrastructure/Migrations folder structure documented
    assert(content.includes('Infrastructure/Migrations'), 'Migrations folder structure documented');

    // Test 40: Review-before-apply workflow documented
    assert(content.includes('Review') && content.includes('before'), 'Review-before-apply workflow documented');
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
  console.log('\n✅ ALL EF MIGRATIONS SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - EF Migrations specialist file created and validated');
  console.log('  - NO prohibited patterns (Automatic Migrations, Direct DB Changes, Skip Review)');
  console.log('  - Required patterns documented (dotnet ef commands, Up/Down, Data Seeding)');
  console.log('  - Code examples present (≥5 C# + ≥5 CLI blocks)');
  console.log('  - CLI commands documented (add, update, list, remove, script)');
  console.log('  - Architecture compliance verified');
  console.log('\n🎯 Phase 2 Day 1 Task 4: COMPLETE');
  process.exit(0);
}
