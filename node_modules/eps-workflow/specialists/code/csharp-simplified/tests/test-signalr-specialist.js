/**
 * SignalR Specialist Test
 * Phase 2 Day 3 - C# Simplified Clean Architecture
 *
 * Validates:
 * - File exists and has content
 * - Hub patterns documented (30 patterns)
 * - Connection lifecycle (OnConnectedAsync, OnDisconnectedAsync)
 * - Messaging patterns (All, User, Group, Others, Caller)
 * - NO long polling, NO field injection, NO session state
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

console.log('=== SIGNALR SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 3 - C# Simplified Clean Architecture\n');

// ============================================
// FILE EXISTENCE AND SIZE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'SignalR specialist file exists');

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
// HUB PATTERN TESTS
// ============================================

testGroup('Hub Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: Hub base class pattern
    assert(content.includes('hub-base-class') || content.includes('Hub'), 'Hub base class pattern documented');

    // Test 5: Hub configuration
    assert(content.includes('hub-configuration') || content.includes('AddSignalR'), 'Hub configuration documented');

    // Test 6: Hub endpoint mapping
    assert(content.includes('MapHub<') || content.includes('/hubs/notification'), 'Hub endpoint mapping documented');

    // Test 7: Constructor injection
    assert(content.includes('Constructor injection') || content.includes('public NotificationHub'), 'Constructor injection documented');

    // Test 8: OnConnectedAsync
    assert(content.includes('OnConnectedAsync'), 'OnConnectedAsync lifecycle method documented');

    // Test 9: OnDisconnectedAsync
    assert(content.includes('OnDisconnectedAsync'), 'OnDisconnectedAsync lifecycle method documented');
  }
});

// ============================================
// MESSAGING PATTERN TESTS
// ============================================

testGroup('Messaging Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 10: Send to all clients
    assert(content.includes('Clients.All'), 'Send to all clients documented');

    // Test 11: Send to specific user
    assert(content.includes('Clients.User'), 'Send to specific user documented');

    // Test 12: Send to group
    assert(content.includes('Clients.Group'), 'Send to group documented');

    // Test 13: Send to others (exclude caller)
    assert(content.includes('Clients.Others'), 'Send to others documented');

    // Test 14: Send to caller
    assert(content.includes('Clients.Caller'), 'Send to caller documented');

    // Test 15: Groups.AddToGroupAsync
    assert(content.includes('Groups.AddToGroupAsync'), 'Add to group documented');

    // Test 16: Groups.RemoveFromGroupAsync
    assert(content.includes('Groups.RemoveFromGroupAsync'), 'Remove from group documented');
  }
});

// ============================================
// ADVANCED PATTERN TESTS
// ============================================

testGroup('Advanced Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: Typed hub pattern
    assert(content.includes('typed-hub') || content.includes('Hub<INotificationClient>'), 'Typed hub pattern documented');

    // Test 18: Hub context injection
    assert(content.includes('IHubContext<') || content.includes('hub-context-injection'), 'Hub context injection documented');

    // Test 19: CORS configuration
    assert(content.includes('signalr-cors') || content.includes('AllowCredentials'), 'CORS configuration documented');

    // Test 20: Authentication for SignalR
    assert(content.includes('signalr-authentication') || content.includes('access_token'), 'Authentication pattern documented');

    // Test 21: Hub filters
    assert(content.includes('IHubFilter') || content.includes('hub-filters'), 'Hub filters documented');

    // Test 22: Streaming server-to-client
    assert(content.includes('IAsyncEnumerable') || content.includes('server-to-client-streaming'), 'Server-to-client streaming documented');

    // Test 23: Hub options configuration
    assert(content.includes('hub-options-configuration') || content.includes('KeepAliveInterval'), 'Hub options configuration documented');
  }
});

// ============================================
// CODE EXAMPLE TESTS
// ============================================

testGroup('Code Example Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 24: C# code blocks present
    const csharpCodeBlockCount = (content.match(/```csharp/gi) || []).length;
    assert(csharpCodeBlockCount >= 25, `Sufficient C# code examples (${csharpCodeBlockCount} code blocks, expected ≥25)`);

    // Test 25: NotificationHub example
    assert(content.includes('NotificationHub') && content.includes('class NotificationHub'), 'NotificationHub example present');

    // Test 26: SendAsync method
    assert(content.includes('SendAsync'), 'SendAsync method example present');

    // Test 27: Context.ConnectionId usage
    assert(content.includes('Context.ConnectionId'), 'Context.ConnectionId usage documented');

    // Test 28: Context.User usage
    assert(content.includes('Context.User'), 'Context.User usage documented');

    // Test 29: CancellationToken parameter
    assert(content.includes('CancellationToken'), 'CancellationToken parameter documented');
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 30: Check that file documents prohibited patterns
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'File documents prohibited patterns');

    // Test 31: NO long polling prohibition
    assert(content.includes('NO Long Polling') || content.includes('NO long polling'), 'Long polling prohibition documented');

    // Test 32: NO field injection prohibition
    assert(content.includes('NO Field Injection') || content.includes('NO field injection'), 'Field injection prohibition documented');

    // Test 33: NO session-based state prohibition
    assert(content.includes('NO Session-Based State') || content.includes('NO session'), 'Session state prohibition documented');

    // Test 34: Verify NO long polling in good code examples
    const csharpBlocks = [];
    const regex = /```csharp([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      csharpBlocks.push(match[1]);
    }

    const longPollingInGoodCode = csharpBlocks.some(block =>
      block.includes('LongPolling') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!longPollingInGoodCode, 'NO long polling in correct code examples');

    // Test 35: Verify constructor injection used
    const constructorInjectionPresent = csharpBlocks.some(block =>
      block.includes('public NotificationHub(') &&
      block.includes('_userService =')
    );
    assert(constructorInjectionPresent, 'Constructor injection present in code examples');
  }
});

// ============================================
// ARCHITECTURE COMPLIANCE TESTS
// ============================================

testGroup('Architecture Compliance Tests', () => {
  const filePath = path.resolve(__dirname, '../csharp-signalr-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 36: Simplified Clean Architecture mentioned
    assert(content.includes('Simplified Clean') || content.includes('Clean Architecture'), 'Simplified Clean Architecture mentioned');

    // Test 37: Stack variant identified
    assert(content.includes('csharp-react-mssql') || content.includes('simplified-clean'), 'Stack variant identified');

    // Test 38: SignalR focus documented
    assert(content.includes('SignalR') || content.includes('Real-Time Communication'), 'SignalR focus documented');

    // Test 39: WebSocket transport documented
    assert(content.includes('WebSocket') || content.includes('HttpTransportType.WebSockets'), 'WebSocket transport documented');

    // Test 40: Async methods documented
    assert(content.includes('async') && content.includes('await'), 'Async methods documented');
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
  console.log('\n✅ ALL SIGNALR SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - SignalR specialist file created and validated');
  console.log('  - Hub patterns documented (Hub base class, lifecycle, configuration)');
  console.log('  - Messaging patterns documented (All, User, Group, Others, Caller)');
  console.log('  - Advanced patterns documented (Typed hub, Hub context, CORS, Auth, Streaming)');
  console.log('  - Prohibited patterns documented (NO long polling, NO field injection, NO session state)');
  console.log('  - Code examples present (≥25 C# code blocks)');
  console.log('\n🎯 Phase 2 Day 3 Task 10: COMPLETE');
  process.exit(0);
}
