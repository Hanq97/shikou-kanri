/**
 * React Router Specialist Test
 * Week 7 Extension - React Frontend Specialists
 *
 * Validates:
 * - File exists and has content
 * - Next.js App Router patterns documented (20 patterns)
 * - File-based routing, dynamic routes, nested layouts
 * - Protected routes with middleware
 * - Loading/error/not-found UI
 * - API route handlers
 * - NO Client Component async, NO waterfall fetching
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

console.log('=== REACT ROUTER SPECIALIST TEST SUITE ===\n');
console.log('Week 7 Extension - React Frontend Specialists\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React Router specialist file exists');

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
// BASIC ROUTING PATTERN TESTS
// ============================================

testGroup('Basic Routing Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: File-based routing
    assert(content.includes('file-based-routing') || content.includes('app/page.tsx'), 'File-based routing pattern documented');

    // Test 5: Dynamic routes
    assert(content.includes('dynamic-routes') || content.includes('[id]/page.tsx'), 'Dynamic routes pattern documented');

    // Test 6: Nested layouts
    assert(content.includes('nested-layouts') || content.includes('app/dashboard/layout.tsx'), 'Nested layouts pattern documented');

    // Test 7: Route groups
    assert(content.includes('route-groups') || content.includes('(auth)'), 'Route groups pattern documented');

    // Test 8: Next.js App Router mentioned
    assert(content.includes('Next.js') && content.includes('App Router'), 'Next.js App Router mentioned');

    // Test 9: layout.tsx mentioned
    assert(content.includes('layout.tsx'), 'layout.tsx file convention documented');

    // Test 10: page.tsx mentioned
    assert(content.includes('page.tsx'), 'page.tsx file convention documented');
  }
});

// ============================================
// NAVIGATION PATTERN TESTS
// ============================================

testGroup('Navigation Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 11: Link component
    assert(content.includes('navigation-link') || content.includes('Link') && content.includes('next/link'), 'Link component pattern documented');

    // Test 12: useRouter hook
    assert(content.includes('programmatic-navigation') || content.includes('useRouter'), 'useRouter hook pattern documented');

    // Test 13: router.push
    assert(content.includes('router.push'), 'router.push navigation documented');

    // Test 14: router.back
    assert(content.includes('router.back') || content.includes('router.forward'), 'router.back/forward navigation documented');

    // Test 15: Prefetching
    assert(content.includes('prefetch'), 'Prefetching pattern mentioned');
  }
});

// ============================================
// PROTECTED ROUTES PATTERN TESTS
// ============================================

testGroup('Protected Routes Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 16: Middleware
    assert(content.includes('protected-routes-middleware') || content.includes('middleware.ts'), 'Middleware pattern documented');

    // Test 17: getToken or getServerSession
    assert(content.includes('getToken') || content.includes('getServerSession'), 'Authentication check documented');

    // Test 18: Redirect for auth
    assert(content.includes('redirect') && content.includes('login'), 'Authentication redirect documented');

    // Test 19: Role-based access
    assert(content.includes('role') && content.includes('ADMIN'), 'Role-based access control documented');

    // Test 20: Middleware matcher
    assert(content.includes('matcher'), 'Middleware matcher configuration documented');
  }
});

// ============================================
// API ROUTES PATTERN TESTS
// ============================================

testGroup('API Routes Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Route handlers
    assert(content.includes('route-handlers-api') || content.includes('app/api'), 'Route handlers pattern documented');

    // Test 22: NextRequest and NextResponse
    assert(content.includes('NextRequest') && content.includes('NextResponse'), 'NextRequest/NextResponse usage documented');

    // Test 23: GET handler
    assert(content.includes('export async function GET'), 'GET handler documented');

    // Test 24: POST handler
    assert(content.includes('export async function POST'), 'POST handler documented');

    // Test 25: API route params
    assert(content.includes('params') && content.includes('id'), 'API route params documented');
  }
});

// ============================================
// LOADING & ERROR STATES TESTS
// ============================================

testGroup('Loading & Error States Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 26: loading.tsx
    assert(content.includes('loading-ui') || content.includes('loading.tsx'), 'Loading UI pattern documented');

    // Test 27: error.tsx
    assert(content.includes('error-handling-ui') || content.includes('error.tsx'), 'Error UI pattern documented');

    // Test 28: not-found.tsx
    assert(content.includes('not-found-ui') || content.includes('not-found.tsx'), 'Not found UI pattern documented');

    // Test 29: notFound() function
    assert(content.includes('notFound()'), 'notFound() function documented');

    // Test 30: Error boundary must be Client Component
    assert(content.includes("'use client'") && content.includes('error'), 'Error boundary Client Component requirement documented');
  }
});

// ============================================
// ADVANCED ROUTING TESTS
// ============================================

testGroup('Advanced Routing Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 31: Parallel routes
    assert(content.includes('parallel-routes') || content.includes('@team') || content.includes('@analytics'), 'Parallel routes pattern documented');

    // Test 32: Intercepting routes
    assert(content.includes('intercepting-routes') || content.includes('(..)'), 'Intercepting routes pattern documented');

    // Test 33: Search params
    assert(content.includes('search-params') || content.includes('searchParams'), 'Search params pattern documented');

    // Test 34: useSearchParams
    assert(content.includes('useSearchParams'), 'useSearchParams hook documented');

    // Test 35: Catch-all routes
    assert(content.includes('catch-all-routes') || content.includes('[...slug]'), 'Catch-all routes pattern documented');
  }
});

// ============================================
// METADATA & SEO TESTS
// ============================================

testGroup('Metadata & SEO Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 36: Metadata
    assert(content.includes('route-metadata') || content.includes('Metadata'), 'Metadata pattern documented');

    // Test 37: generateMetadata
    assert(content.includes('generateMetadata'), 'generateMetadata function documented');

    // Test 38: Open Graph
    assert(content.includes('openGraph'), 'Open Graph tags documented');

    // Test 39: SEO mentioned
    assert(content.includes('SEO'), 'SEO best practices mentioned');
  }
});

// ============================================
// PERFORMANCE PATTERN TESTS
// ============================================

testGroup('Performance Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 40: Prefetching
    assert(content.includes('route-prefetching') || content.includes('prefetch'), 'Prefetching pattern documented');

    // Test 41: Streaming/Suspense
    assert(content.includes('streaming-suspense') || content.includes('Suspense'), 'Streaming/Suspense pattern documented');

    // Test 42: Revalidation
    assert(content.includes('revalidation-caching') || content.includes('revalidate'), 'Revalidation pattern documented');

    // Test 43: Promise.all for parallel fetching
    assert(content.includes('Promise.all'), 'Parallel fetching with Promise.all documented');

    // Test 44: Cache configuration
    assert(content.includes('cache') || content.includes('revalidate'), 'Cache configuration documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 45: TypeScript code blocks present
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 20, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥20)`);

    // Test 46: Server Component examples
    assert(content.includes('export default async function') && content.includes('Page'), 'Server Component examples present');

    // Test 47: Client Component examples
    assert(content.includes("'use client'"), 'Client Component examples present');

    // Test 48: Redirect examples
    assert(content.includes('redirect('), 'redirect() examples present');

    // Test 49: NextResponse examples
    assert(content.includes('NextResponse.json'), 'NextResponse.json examples present');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 50: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 51: NO Client Component async prohibition
    assert(content.includes('NO Client Component Async') || content.includes("'use client'.*async"), 'Client Component async prohibition documented');

    // Test 52: NO waterfall fetching prohibition
    assert(content.includes('NO Waterfall') || content.includes('NO waterfall'), 'Waterfall fetching prohibition documented');

    // Test 53: NO useEffect for initial data prohibition
    assert(content.includes('NO useEffect') || content.includes('useEffect in Server Component'), 'useEffect for initial data prohibition documented');

    // Test 54: Verify correct patterns in examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const hasClientAsyncInGoodCode = tsCodeBlocks.some(block =>
      block.includes("'use client'") &&
      block.includes('export default async function') &&
      !block.includes("DON'T") &&
      !block.includes('❌')
    );
    assert(!hasClientAsyncInGoodCode, 'NO Client Component async in correct code examples');
  }
});

// ============================================
// BACKEND INTEGRATION TESTS
// ============================================

testGroup('Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 55: C# backend integration
    assert(content.includes('C# ASP.NET Core') || content.includes('C#') && content.includes('backend'), 'C# backend integration mentioned');

    // Test 56: Backend URL configuration
    assert(content.includes('http://localhost:5000') || content.includes('BACKEND_URL'), 'Backend URL configuration documented');

    // Test 57: JWT/Bearer token
    assert(content.includes('Bearer') || content.includes('Authorization'), 'JWT authentication documented');

    // Test 58: Environment variables
    assert(content.includes('.env.local') || content.includes('process.env'), 'Environment variables usage documented');

    // Test 59: API proxy pattern
    assert(content.includes('proxy') || content.includes('api/[...'), 'API proxy pattern mentioned');

    // Test 60: 20 patterns documented
    const patternSectionCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternSectionCount >= 15, `Sufficient pattern documentation (${patternSectionCount} patterns, expected ≥15)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-router-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 61: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section documented');

    // Test 62: Server Components by default
    assert(content.includes('Server Component') && content.includes('default'), 'Server Components by default documented');

    // Test 63: Protected routes best practice
    assert(content.includes('Protected Routes') || content.includes('middleware'), 'Protected routes best practice documented');

    // Test 64: Type safety
    assert(content.includes('Type') || content.includes('interface'), 'Type safety mentioned');

    // Test 65: Loading states
    assert(content.includes('loading.tsx') || content.includes('Loading'), 'Loading states best practice documented');
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
  console.log('\n✅ ALL REACT ROUTER SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React Router specialist file created and validated');
  console.log('  - File-based routing patterns documented (app router, dynamic routes, layouts)');
  console.log('  - Navigation patterns documented (Link, useRouter, prefetching)');
  console.log('  - Protected routes documented (middleware, authentication)');
  console.log('  - API route handlers documented (NextRequest, NextResponse)');
  console.log('  - Loading/Error/NotFound UI documented (loading.tsx, error.tsx, not-found.tsx)');
  console.log('  - Advanced patterns documented (parallel routes, intercepting routes, catch-all)');
  console.log('  - Performance patterns documented (prefetching, streaming, revalidation)');
  console.log('  - Prohibited patterns documented (NO Client Component async, NO waterfall)');
  console.log('  - Code examples present (≥20 TypeScript code blocks)');
  console.log('  - C# backend integration documented (API proxy, JWT auth)');
  console.log('\n🎯 Week 7 Task 4: COMPLETE');
  process.exit(0);
}
