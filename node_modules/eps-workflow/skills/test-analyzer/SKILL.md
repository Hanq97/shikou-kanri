---
name: test-analyzer
description: Analyze test quality, coverage, and patterns for a module
allowed-tools: Read, Bash, Grep, Glob
---

# Test Analyzer Skill

## Purpose

Analyze test files in a module and produce a quality report covering:
- Test coverage gaps
- Missing edge cases
- Pattern compliance (specialist adherence)
- Test naming conventions

## Input

Module ID and project root path.

## Steps

### Step 1: Discover Test Files

Use Glob to find all test files for the module:
- Backend: `src/test/java/**/*Test.java`
- Frontend: `**/*.test.{ts,tsx}`

### Step 2: Analyze Test Patterns

Read each test file and check:
- Uses correct annotations (@WebFluxTest, @DataR2dbcTest, etc.)
- Uses StepVerifier for reactive assertions
- Has both normal and abnormal test cases
- Follows naming convention: `test_<method>_<scenario>`

### Step 3: Check Coverage

Use Bash to run coverage commands:
- Backend: `mvn test jacoco:report -q`
- Frontend: `npx vitest run --coverage`

Parse coverage reports and identify uncovered areas.

### Step 4: Generate Report

Produce a markdown report with:
- Total test count by level (unit/integration/e2e)
- Coverage metrics (line/branch/method)
- Pattern compliance score
- Recommendations for improvement
