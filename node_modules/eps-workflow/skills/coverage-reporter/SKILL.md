---
name: coverage-reporter
description: Generate coverage reports from JaCoCo/Istanbul output
allowed-tools: Read, Bash
---

# Coverage Reporter Skill

## Purpose

Parse coverage reports from JaCoCo (Java) or Istanbul (TypeScript) and generate a unified coverage dashboard.

## Input

Module ID and coverage report paths.

## Steps

### Step 1: Locate Coverage Reports

Find coverage reports:
- Backend: `target/site/jacoco/jacoco.xml`
- Frontend: `coverage/coverage-final.json`

### Step 2: Parse Reports

Use the coverage-aggregator module:
```javascript
const { aggregateJaCoCo, aggregateIstanbul, generateDashboard } = require('./core/etf/coverage-aggregator.js');
```

### Step 3: Generate Dashboard

Produce a markdown dashboard with:
- Combined backend + frontend metrics
- Per-package/per-file breakdown
- Threshold status (pass/fail)
