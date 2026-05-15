/**
 * Security Specialist Test
 * Phase 2 Day 3 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - Security patterns documented (35 patterns)
 * - JWT authentication (token generation, validation)
 * - Authorization patterns (role-based, policy-based)
 * - CORS configuration, HTTPS enforcement
 * - NO session-based auth, NO wildcard CORS, NO hardcoded secrets
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

console.log('=== SECURITY SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 3 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'Security specialist file exists');

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
// JWT AUTHENTICATION PATTERN TESTS
// ============================================

testGroup('JWT Authentication Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: JWT service interface
    assert(content.includes('jwt-service-interface') || content.includes('IJwtService'), 'JWT service interface documented');

    // Test 5: JWT service implementation
    assert(content.includes('jwt-service-implementation') || content.includes('GenerateToken'), 'JWT service implementation documented');

    // Test 6: JWT configuration
    assert(content.includes('jwt-configuration') || content.includes('appsettings.json'), 'JWT configuration documented');

    // Test 7: JWT middleware setup
    assert(content.includes('AddAuthentication') || content.includes('AddJwtBearer'), 'JWT middleware setup documented');

    // Test 8: Token validation
    assert(content.includes('ValidateToken') || content.includes('TokenValidationParameters'), 'Token validation documented');

    // Test 9: Claims usage
    assert(content.includes('Claim') && content.includes('ClaimTypes'), 'Claims usage documented');

    // Test 10: Token expiration
    assert(content.includes('expires') || content.includes('AddHours'), 'Token expiration documented');
  }
});

// ============================================
// AUTHORIZATION PATTERN TESTS
// ============================================

testGroup('Authorization Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 11: [Authorize] attribute
    assert(content.includes('[Authorize]'), '[Authorize] attribute documented');

    // Test 12: [AllowAnonymous] attribute
    assert(content.includes('[AllowAnonymous]'), '[AllowAnonymous] attribute documented');

    // Test 13: Role-based authorization
    assert(content.includes('role-based-authorization') || content.includes('Roles ='), 'Role-based authorization documented');

    // Test 14: Policy-based authorization
    assert(content.includes('policy-based-authorization') || content.includes('AddPolicy'), 'Policy-based authorization documented');

    // Test 15: Custom authorization requirement
    assert(content.includes('IAuthorizationRequirement') || content.includes('custom-authorization-requirement'), 'Custom authorization requirement documented');

    // Test 16: Authorization handler
    assert(content.includes('AuthorizationHandler'), 'Authorization handler documented');
  }
});

// ============================================
// CORS AND SECURITY PATTERN TESTS
// ============================================

testGroup('CORS and Security Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: CORS configuration
    assert(content.includes('cors-configuration') || content.includes('AddCors'), 'CORS configuration documented');

    // Test 18: AllowCredentials for SignalR
    assert(content.includes('AllowCredentials'), 'AllowCredentials documented');

    // Test 19: HTTPS enforcement
    assert(content.includes('UseHttpsRedirection') || content.includes('https-enforcement'), 'HTTPS enforcement documented');

    // Test 20: Security headers
    assert(content.includes('X-Content-Type-Options') || content.includes('security-headers'), 'Security headers documented');

    // Test 21: Rate limiting
    assert(content.includes('rate-limiting') || content.includes('RateLimit'), 'Rate limiting documented');

    // Test 22: CSRF protection
    assert(content.includes('csrf-protection') || content.includes('AntiForgery'), 'CSRF protection documented');
  }
});

// ============================================
// AUTHENTICATION ENDPOINT TESTS
// ============================================

testGroup('Authentication Endpoint Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 23: Login endpoint
    assert(content.includes('login-endpoint') || content.includes('Login([FromBody]'), 'Login endpoint documented');

    // Test 24: Register endpoint
    assert(content.includes('register-endpoint') || content.includes('Register([FromBody]'), 'Register endpoint documented');

    // Test 25: Refresh token endpoint
    assert(content.includes('refresh-token-endpoint') || content.includes('Refresh([FromBody]'), 'Refresh token endpoint documented');

    // Test 26: Logout endpoint
    assert(content.includes('logout-revoke-token') || content.includes('Logout'), 'Logout endpoint documented');

    // Test 27: Password reset flow
    assert(content.includes('password-reset-flow') || content.includes('ForgotPassword'), 'Password reset flow documented');
  }
});

// ============================================
// PASSWORD AND USER SECURITY TESTS
// ============================================

testGroup('Password and User Security Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 28: Password hashing (BCrypt)
    assert(content.includes('BCrypt') || content.includes('password-hashing'), 'Password hashing (BCrypt) documented');

    // Test 29: Account lockout
    assert(content.includes('account-lockout') || content.includes('FailedLoginAttempts'), 'Account lockout documented');

    // Test 30: Email verification
    assert(content.includes('email-verification') || content.includes('EmailVerified'), 'Email verification documented');

    // Test 31: Two-factor authentication
    assert(content.includes('two-factor-authentication') || content.includes('2FA'), 'Two-factor authentication documented');

    // Test 32: Refresh token storage
    assert(content.includes('RefreshToken') && content.includes('ExpiresAt'), 'Refresh token storage documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 33: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 30, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥30)`);

    // Test 34: JwtService example
    assert(content.includes('JwtService') && content.includes('class JwtService'), 'JwtService example present');

    // Test 35: JWT token generation
    assert(content.includes('JwtSecurityToken') && content.includes('WriteToken'), 'JWT token generation example present');

    // Test 36: SymmetricSecurityKey usage
    assert(content.includes('SymmetricSecurityKey'), 'SymmetricSecurityKey usage documented');

    // Test 37: SigningCredentials usage
    assert(content.includes('SigningCredentials'), 'SigningCredentials usage documented');

    // Test 38: TokenValidationParameters
    assert(content.includes('TokenValidationParameters'), 'TokenValidationParameters example present');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 39: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 40: NO session-based authentication prohibition
    assert(content.includes('NO Session-Based Authentication') || content.includes('NO session'), 'Session-based auth prohibition documented');

    // Test 41: NO wildcard CORS prohibition
    assert(content.includes('NO Wildcard CORS') || content.includes('AllowAnyOrigin'), 'Wildcard CORS prohibition documented');

    // Test 42: NO hardcoded secrets prohibition
    assert(content.includes('NO Hardcoded Secrets') || content.includes('NO hardcoded'), 'Hardcoded secrets prohibition documented');

    // Test 43: Verify NO session in good code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const sessionInGoodCode = csharpBlocks.some(block =>
      block.includes('HttpContext.Session') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!sessionInGoodCode, 'NO session-based auth in correct code examples');

    // Test 44: Verify constructor injection for JwtService
    const constructorInjectionPresent = csharpBlocks.some(block =>
      block.includes('public JwtService(') &&
      block.includes('_configuration =')
    );
    assert(constructorInjectionPresent, 'Constructor injection present in JwtService');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-security-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 45: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 46: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 47: Security focus documented
    assert(content.includes('Security') || content.includes('Authentication'), 'Security focus documented');

    // Test 48: JWT Bearer tokens documented
    assert(content.includes('JWT') || content.includes('Bearer'), 'JWT Bearer tokens documented');

    // Test 49: Async methods documented
    assert(content.includes('async') && content.includes('await'), 'Async methods documented');

    // Test 50: Environment variables for secrets
    assert(content.includes('Environment.GetEnvironmentVariable') || content.includes('secrets-management'), 'Environment variables for secrets documented');
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
  console.log('\n✅ ALL SECURITY SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - Security specialist file created and validated');
  console.log('  - JWT authentication patterns documented (service, middleware, validation)');
  console.log('  - Authorization patterns documented (role-based, policy-based, custom requirements)');
  console.log('  - CORS and security patterns documented (headers, HTTPS, rate limiting)');
  console.log('  - Authentication endpoints documented (login, register, refresh, logout)');
  console.log('  - Password security documented (BCrypt, lockout, verification, 2FA)');
  console.log('  - Prohibited patterns documented (NO session auth, NO wildcard CORS, NO hardcoded secrets)');
  console.log('  - Code examples present (≥30 C# code blocks)');
  console.log('\n🎯 Phase 2 Day 3 Task 11: COMPLETE');
  process.exit(0);
}
