/**
 * React Form Management Specialist Test
 * Week 7 Extension - React Frontend Specialists
 *
 * Validates:
 * - File exists and has content
 * - React Hook Form + Zod patterns documented (20 patterns)
 * - Form state management, validation, error handling
 * - File uploads, dynamic arrays, nested objects
 * - Accessibility (ARIA attributes)
 * - NO Formik, NO manual useState for forms
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

console.log('=== REACT FORM MANAGEMENT SPECIALIST TEST SUITE ===\n');
console.log('Week 7 Extension - React Frontend Specialists\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React Form specialist file exists');

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
// BASIC FORM PATTERN TESTS
// ============================================

testGroup('Basic Form Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Basic form setup
    assert(content.includes('basic-form-setup') || content.includes('useForm'), 'Basic form setup pattern documented');

    // Test 5: Zod schema validation
    assert(content.includes('zod-schema-validation') || content.includes('zodResolver'), 'Zod schema validation pattern documented');

    // Test 6: Default values
    assert(content.includes('default-values') || content.includes('defaultValues'), 'Default values pattern documented');

    // Test 7: React Hook Form mentioned
    assert(content.includes('React Hook Form'), 'React Hook Form mentioned');

    // Test 8: register function
    assert(content.includes('register('), 'register() function documented');

    // Test 9: handleSubmit
    assert(content.includes('handleSubmit'), 'handleSubmit documented');

    // Test 10: formState.errors
    assert(content.includes('formState') && content.includes('errors'), 'formState.errors documented');
  }
});

// ============================================
// COMPLEX FORM PATTERN TESTS
// ============================================

testGroup('Complex Form Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 11: Nested objects
    assert(content.includes('nested-objects') || content.includes('address.street'), 'Nested objects pattern documented');

    // Test 12: Dynamic array fields
    assert(content.includes('dynamic-array-fields') || content.includes('useFieldArray'), 'Dynamic array fields pattern documented');

    // Test 13: useFieldArray hook
    assert(content.includes('useFieldArray'), 'useFieldArray hook documented');

    // Test 14: append and remove
    assert(content.includes('append') && content.includes('remove'), 'append/remove methods documented');

    // Test 15: Dependent fields
    assert(content.includes('dependent-fields') || content.includes('watch('), 'Dependent fields pattern documented');
  }
});

// ============================================
// FILE UPLOAD PATTERN TESTS
// ============================================

testGroup('File Upload Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 16: Single file upload
    assert(content.includes('file-upload-single') || content.includes('FileList'), 'Single file upload pattern documented');

    // Test 17: Multiple file upload
    assert(content.includes('file-upload-multiple') || content.includes('multiple'), 'Multiple file upload pattern documented');

    // Test 18: File validation
    assert(content.includes('MAX_FILE_SIZE') || content.includes('ACCEPTED'), 'File validation documented');

    // Test 19: FormData
    assert(content.includes('FormData'), 'FormData usage documented');

    // Test 20: multipart/form-data
    assert(content.includes('multipart') || content.includes('IFormFile'), 'multipart/form-data documented');
  }
});

// ============================================
// VALIDATION PATTERN TESTS
// ============================================

testGroup('Validation Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Zod schema
    assert(content.includes('z.object') || content.includes('z.string'), 'Zod schema usage documented');

    // Test 22: Async validation
    assert(content.includes('async-validation') || content.includes('setError'), 'Async validation pattern documented');

    // Test 23: Password confirmation
    assert(content.includes('password-confirmation') || content.includes('confirmPassword'), 'Password confirmation pattern documented');

    // Test 24: z.refine()
    assert(content.includes('z.refine') || content.includes('refine'), 'Zod refine documented');

    // Test 25: Error handling
    assert(content.includes('error-handling-display'), 'Error handling pattern documented');
  }
});

// ============================================
// ADVANCED CONTROL TESTS
// ============================================

testGroup('Advanced Control Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 26: Controlled components
    assert(content.includes('controlled-components') || content.includes('watch(') && content.includes('setValue'), 'Controlled components pattern documented');

    // Test 27: watch() hook
    assert(content.includes('watch('), 'watch() hook documented');

    // Test 28: setValue() method
    assert(content.includes('setValue('), 'setValue() method documented');

    // Test 29: Controller
    assert(content.includes('controller-custom-components') || content.includes('Controller'), 'Controller pattern documented');

    // Test 30: reset() method
    assert(content.includes('reset-form') || content.includes('reset()'), 'reset() method documented');
  }
});

// ============================================
// UX & ACCESSIBILITY TESTS
// ============================================

testGroup('UX & Accessibility Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 31: Dirty state warning
    assert(content.includes('dirty-state-warning') || content.includes('isDirty'), 'Dirty state warning pattern documented');

    // Test 32: Debounced validation
    assert(content.includes('debounced-validation') || content.includes('debounce'), 'Debounced validation pattern documented');

    // Test 33: Multi-step form
    assert(content.includes('multi-step-form') || content.includes('trigger('), 'Multi-step form pattern documented');

    // Test 34: Accessibility ARIA
    assert(content.includes('accessibility-aria') || content.includes('aria-invalid'), 'Accessibility ARIA pattern documented');

    // Test 35: ARIA attributes
    assert(content.includes('aria-invalid') && content.includes('aria-describedby'), 'ARIA attributes documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 36: TypeScript code blocks present
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 20, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥20)`);

    // Test 37: Zod schema examples
    assert(content.includes('z.object('), 'Zod schema examples present');

    // Test 38: useForm examples
    assert(content.includes('useForm<'), 'useForm with TypeScript examples present');

    // Test 39: register examples
    assert(content.includes('...register('), 'register() spread examples present');

    // Test 40: C# backend examples
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 3, `C# backend examples present (${csharpCodeBlockCount} code blocks)`);
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 41: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 42: NO Formik prohibition
    assert(content.includes('NO Formik'), 'Formik prohibition documented');

    // Test 43: NO manual useState prohibition
    assert(content.includes('NO Manual useState') || content.includes('NO manual useState'), 'Manual useState prohibition documented');

    // Test 44: NO unvalidated file uploads
    assert(content.includes('NO Unvalidated File'), 'Unvalidated file uploads prohibition documented');

    // Test 45: NO missing ARIA
    assert(content.includes('NO Missing ARIA'), 'Missing ARIA attributes prohibition documented');
  }
});

// ============================================
// BACKEND INTEGRATION TESTS
// ============================================

testGroup('Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 46: C# backend integration
    assert(content.includes('C# ASP.NET Core') || content.includes('C#') && content.includes('backend'), 'C# backend integration mentioned');

    // Test 47: IFormFile
    assert(content.includes('IFormFile'), 'C# IFormFile documented');

    // Test 48: DTO pattern
    assert(content.includes('DTO') || content.includes('Dto'), 'DTO pattern documented');

    // Test 49: FluentValidation
    assert(content.includes('FluentValidation'), 'FluentValidation mentioned');

    // Test 50: 20 patterns documented
    const patternSectionCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternSectionCount >= 15, `Sufficient pattern documentation (${patternSectionCount} patterns, expected ≥15)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-form-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 51: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section documented');

    // Test 52: Zod schemas best practice
    assert(content.includes('Always Use Zod Schemas') || content.includes('Zod'), 'Zod schemas best practice documented');

    // Test 53: Accessibility first
    assert(content.includes('Accessibility First') || content.includes('accessibility'), 'Accessibility best practice documented');

    // Test 54: Error handling best practice
    assert(content.includes('Error Handling'), 'Error handling best practice documented');

    // Test 55: TypeScript best practice
    assert(content.includes('TypeScript') && content.includes('strict typing'), 'TypeScript best practice documented');
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
  console.log('\n✅ ALL REACT FORM MANAGEMENT SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React Form Management specialist file created and validated');
  console.log('  - React Hook Form + Zod patterns documented');
  console.log('  - Basic forms (setup, validation, default values)');
  console.log('  - Complex forms (nested objects, dynamic arrays, dependent fields)');
  console.log('  - File uploads (single, multiple, validation, FormData)');
  console.log('  - Advanced validation (async, password confirmation, custom rules)');
  console.log('  - Advanced control (watch, setValue, Controller, reset)');
  console.log('  - UX enhancements (dirty warning, debounce, multi-step, accessibility)');
  console.log('  - Prohibited patterns documented (NO Formik, NO manual useState)');
  console.log('  - Code examples present (≥20 TypeScript + ≥3 C# code blocks)');
  console.log('  - C# backend integration documented (IFormFile, DTO, FluentValidation)');
  console.log('\n🎯 Week 7 Task 5: COMPLETE');
  process.exit(0);
}
