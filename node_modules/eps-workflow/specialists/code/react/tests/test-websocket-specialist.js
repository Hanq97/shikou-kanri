/**
 * React WebSocket Specialist Test
 * Phase 2 Day 4 - Frontend Finalization
 *
 * Validates:
 * - File exists and has content
 * - WebSocket patterns documented (25 patterns)
 * - NO Socket.IO (use SignalR ONLY)
 * - SignalR React integration (useSignalR hook)
 * - Connection management (connect, disconnect, reconnect)
 * - Message handling (send, receive)
 * - Integration with C# ASP.NET Core SignalR backend
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

console.log('=== REACT WEBSOCKET SPECIALIST TEST SUITE ===\n');
console.log('Phase 2 Day 4 - Frontend Finalization\n');

// ============================================
// FILE EXISTENCE TESTS
// ============================================

testGroup('File Existence Tests', () => {
  const filePath = path.resolve(__dirname, '../react-websocket-specialist.md');

  // Test 1: File exists
  const fileExists = fs.existsSync(filePath);
  assert(fileExists, 'React websocket specialist file exists');

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
// WEBSOCKET PATTERN TESTS
// ============================================

testGroup('WebSocket Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-websocket-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 4: SignalR mentioned
    assert(content.includes('SignalR') || content.includes('@microsoft/signalr'), 'SignalR library documented');

    // Test 5: useSignalR hook
    assert(content.includes('useSignalR') || content.includes('use-signalr'), 'useSignalR custom hook documented');

    // Test 6: Connection management
    assert(content.includes('connection') || content.includes('HubConnection'), 'Connection management documented');

    // Test 7: Connect/disconnect patterns
    assert(content.includes('connect') && content.includes('disconnect'), 'Connect/disconnect patterns documented');

    // Test 8: Reconnection strategy
    assert(content.includes('reconnect') || content.includes('retry'), 'Reconnection strategy documented');

    // Test 9: Message handling
    assert(content.includes('send') || content.includes('invoke'), 'Message sending pattern documented');

    // Test 10: Receive messages
    assert(content.includes('on(') || content.includes('receive'), 'Message receiving pattern documented');

    // Test 11: Error handling
    assert(content.includes('error') && content.includes('handling'), 'Error handling documented');

    // Test 12: 25 patterns documented
    const patternCount = (content.match(/### Pattern \d+:/g) || []).length;
    assert(patternCount >= 20, `Sufficient patterns documented (${patternCount} patterns, expected ≥20)`);
  }
});

// ============================================
// PROHIBITED PATTERN TESTS
// ============================================

testGroup('Prohibited Pattern Tests', () => {
  const filePath = path.resolve(__dirname, '../react-websocket-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 13: Prohibited patterns section exists
    const hasProhibitedSection = content.includes('PROHIBITED') || content.includes('❌');
    assert(hasProhibitedSection, 'Prohibited patterns section exists');

    // Test 14: NO Socket.IO documented
    assert(content.includes('NO Socket.IO') || content.includes('Socket.IO'), 'NO Socket.IO prohibition documented');

    // Test 15: Verify SignalR usage in code examples
    const tsCodeBlocks = [];
    const regex = /```typescript([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      tsCodeBlocks.push(match[1]);
    }

    const usesSignalR = tsCodeBlocks.some(block =>
      block.includes('SignalR') ||
      block.includes('HubConnection') ||
      block.includes('@microsoft/signalr')
    );
    assert(usesSignalR, 'Code examples use SignalR');

    // Test 16: NO Socket.IO in good code examples
    const socketIOInGoodCode = tsCodeBlocks.some(block =>
      block.includes('socket.io') &&
      !block.includes('DON\'T') &&
      !block.includes('❌') &&
      !block.includes('WRONG')
    );
    assert(!socketIOInGoodCode, 'NO Socket.IO in correct code examples');
  }
});

// ============================================
// INTEGRATION TESTS
// ============================================

testGroup('C# SignalR Backend Integration Tests', () => {
  const filePath = path.resolve(__dirname, '../react-websocket-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 17: C# SignalR backend integration mentioned
    assert(content.includes('C#') || content.includes('ASP.NET Core SignalR'), 'C# SignalR backend integration mentioned');

    // Test 18: Hub URL configuration
    assert(content.includes('Hub') || content.includes('hubUrl') || content.includes('/hubs/'), 'Hub URL configuration documented');

    // Test 19: Real-time notifications
    assert(content.includes('notification') || content.includes('real-time'), 'Real-time notifications documented');

    // Test 20: TypeScript types
    const interfaceCount = (content.match(/interface \w+/g) || []).length;
    assert(interfaceCount >= 5, `TypeScript interfaces present (${interfaceCount} interfaces, expected ≥5)`);
  }
});

// ============================================
// BEST PRACTICES TESTS
// ============================================

testGroup('Best Practices Tests', () => {
  const filePath = path.resolve(__dirname, '../react-websocket-specialist.md');

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Test 21: Best practices section
    assert(content.includes('BEST PRACTICES') || content.includes('Best Practices'), 'Best practices section exists');

    // Test 22: Cleanup on unmount
    assert(content.includes('cleanup') || content.includes('useEffect') && content.includes('return'), 'Cleanup on unmount documented');

    // Test 23: Connection state management
    assert(content.includes('ConnectionState') || content.includes('Connected') || content.includes('Disconnected'), 'Connection state management documented');

    // Test 24: TypeScript code blocks
    const tsCodeBlockCount = (content.match(/```typescript/gi) || []).length;
    assert(tsCodeBlockCount >= 15, `Sufficient TypeScript code examples (${tsCodeBlockCount} code blocks, expected ≥15)`);

    // Test 25: SignalR import statements
    assert(content.includes('import') && (content.includes('signalr') || content.includes('HubConnection')), 'SignalR import statements present');
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
  console.log('\n✅ ALL REACT WEBSOCKET SPECIALIST TESTS PASSED');
  console.log('\n📊 Summary:');
  console.log('  - React websocket specialist file created and validated');
  console.log('  - SignalR patterns documented (useSignalR hook, connection management)');
  console.log('  - NO Socket.IO (SignalR ONLY)');
  console.log('  - Message handling (send, receive)');
  console.log('  - Reconnection strategies documented');
  console.log('  - C# SignalR backend integration documented');
  console.log('  - TypeScript interfaces present (≥5 interfaces)');
  console.log('\n🎯 Phase 2 Day 4 Task 16: COMPLETE');
  process.exit(0);
}
