#!/usr/bin/env node
// tests/run-all.js
// Runs every *.test.js file in the tests/ directory in filename order and
// exits with code 0 (all pass) or 1 (any failure).
// Called by .github/workflows/test.yml in CI.

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TESTS_DIR = __dirname;
const tests = fs.readdirSync(TESTS_DIR)
  .filter(f => f.endsWith('.test.js'))
  .sort()
  .map(f => path.join(TESTS_DIR, f));

if (tests.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Running ${tests.length} test suite(s)...`);
console.log('='.repeat(50));

let anyFailed = false;
for (const t of tests) {
  const name = path.relative(TESTS_DIR, t);
  try {
    execFileSync(process.execPath, [t], { stdio: 'inherit' });
  } catch (e) {
    anyFailed = true;
    console.error(`\n  ❌ ${name} FAILED (exit code ${e.status})`);
  }
}

console.log('\n' + '='.repeat(50));
if (anyFailed) {
  console.log('❌ Some tests FAILED — see output above');
  process.exit(1);
} else {
  console.log('✅ All tests PASSED');
  process.exit(0);
}
