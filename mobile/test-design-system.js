/**
 * Automated tests for Design System acceptance criteria
 * Run this file to verify all components work correctly
 */

import { formatCurrency } from './src/lib/formatCurrency';
import { getBudgetColor, getBudgetStatus } from './src/lib/getBudgetColor';
import { colors } from './src/lib/design-tokens';

console.log('🧪 Running Design System Tests...\n');

// Test 1: formatCurrency(13648.51) returns "13'648.51 CHF"
const test1 = formatCurrency(13648.51);
const test1Pass = test1 === "13'648.51 CHF";
console.log(`✓ Test 1: formatCurrency(13648.51)`);
console.log(`  Expected: "13'648.51 CHF"`);
console.log(`  Got:      "${test1}"`);
console.log(`  Result:   ${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: formatCurrency(-4940.55) returns "-4'940.55 CHF"
const test2 = formatCurrency(-4940.55);
const test2Pass = test2 === "-4'940.55 CHF";
console.log(`✓ Test 2: formatCurrency(-4940.55)`);
console.log(`  Expected: "-4'940.55 CHF"`);
console.log(`  Got:      "${test2}"`);
console.log(`  Result:   ${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: getBudgetColor(50) returns Sage Green #A8B5A1
const test3 = getBudgetColor(50);
const test3Pass = test3.toUpperCase() === '#A8B5A1';
console.log(`✓ Test 3: getBudgetColor(50)`);
console.log(`  Expected: "#A8B5A1" (Sage Green)`);
console.log(`  Got:      "${test3}"`);
console.log(`  Result:   ${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: getBudgetColor(105) returns Soft Lavender #B4A7D6
const test4 = getBudgetColor(105);
const test4Pass = test4.toUpperCase() === '#B4A7D6';
console.log(`✓ Test 4: getBudgetColor(105)`);
console.log(`  Expected: "#B4A7D6" (Soft Lavender)`);
console.log(`  Got:      "${test4}"`);
console.log(`  Result:   ${test4Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// Additional tests
const test5 = getBudgetStatus(50);
const test5Pass = test5 === 'ON TRACK';
console.log(`✓ Test 5: getBudgetStatus(50)`);
console.log(`  Expected: "ON TRACK"`);
console.log(`  Got:      "${test5}"`);
console.log(`  Result:   ${test5Pass ? '✅ PASS' : '❌ FAIL'}\n`);

const test6 = getBudgetStatus(105);
const test6Pass = test6 === 'FLOW ADJUSTED';
console.log(`✓ Test 6: getBudgetStatus(105)`);
console.log(`  Expected: "FLOW ADJUSTED"`);
console.log(`  Got:      "${test6}"`);
console.log(`  Result:   ${test6Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
const allTests = [test1Pass, test2Pass, test3Pass, test4Pass, test5Pass, test6Pass];
const passedTests = allTests.filter(t => t).length;
const totalTests = allTests.length;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} tests passed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (passedTests === totalTests) {
  console.log('🎉 All acceptance criteria verified successfully!');
  console.log('✅ Design system is ready for production use.\n');
} else {
  console.log('❌ Some tests failed. Please review the output above.');
  process.exit(1);
}
