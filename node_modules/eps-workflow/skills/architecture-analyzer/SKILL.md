---
name: architecture-analyzer
description: Detects duplicate components and validates architecture compliance against the project tech stack. Use during design and planning phases to prevent redundancy and architectural violations.
allowed-tools: Read, Bash, Grep, Glob
---

# Architecture Analyzer Skill

## Input

!`node core/cli/ops.js context-detect --raw`

## Purpose

Analyzes the codebase and planned changes for architectural violations and duplicate components. Provides a compliance report against the project's defined tech stack and architecture patterns.

## Analysis Commands

```bash
# Run full architecture detection
node core/cli/ops.js arch-detect

# Detect duplicate components in a specific path
node core/cli/ops.js arch-detect --path {target_path}

# Check a specific component for duplicates
node core/cli/ops.js arch-detect --component {component_name}
```

## Analysis Logic

### Step 1: Load Project Architecture

Read project configuration to understand declared architecture:
```bash
# Read project config for tech stack
node core/cli/ops.js context-detect --raw
```

Extract from context:
- Architecture pattern (Clean Architecture, Hexagonal, Microservices, etc.)
- Tech stack components (frameworks, libraries, databases)
- Module structure

### Step 2: Detect Duplicate Implementations

Scan for functionally equivalent components:

```bash
# Find duplicate service patterns
# Example patterns to check:
# - Multiple classes/files handling same domain
# - Duplicate utility functions
# - Redundant configuration files
```

Use Grep to scan for:
- Similar class/function names across modules
- Duplicate interface definitions
- Redundant configuration keys

Deduplication check algorithm:
```
For each component in planned_changes:
    Search codebase for functionally similar components
    If similarity >= 70%:
        Flag as potential duplicate
        Report: existing location, proposed location, similarity score
```

### Step 3: Validate Architecture Compliance

Check planned changes against architecture rules:

**Layer Boundary Rules**:
- Domain layer: NO infrastructure dependencies
- Application layer: MAY depend on domain, NOT on infrastructure directly
- Infrastructure layer: implements domain interfaces
- API layer: depends on application layer only

**Dependency Rules**:
- No circular dependencies between modules
- New dependencies must align with existing tech stack
- External libraries must be approved (check package.json/pom.xml)

**Pattern Rules**:
- Repository pattern: data access through repository interfaces only
- Service pattern: business logic in service layer only
- No direct database calls from controllers/handlers

### Step 4: Generate Compliance Report

Analyze arch-detect output and categorize findings:
```
For each finding:
    Classify: DUPLICATE | VIOLATION | WARNING | INFO
    Provide: location, description, severity, remediation
```

## When to Use

- During `/design` — before finalizing architecture decisions
- During `/plan` — before creating implementation steps
- During `/execute` — as pre-step check for each implementation step
- When architecture drift is suspected
- When adding new modules or dependencies

## Invocation

```
Analyze architecture for feature: {feature-name}
Scope: {path or module to analyze}
Check: duplicates, layer-violations, dependency-rules
```

## Output Format

```
Architecture Analysis Report
============================
Feature    : {feature-name}
Branch     : {branch}
Scope      : {analyzed path/module}
Timestamp  : {datetime}

Tech Stack (from context):
  Pattern   : {architecture pattern}
  Backend   : {backend framework + version}
  Frontend  : {frontend framework + version}
  Database  : {database}

Duplicate Components ({count}):
  [HIGH]   {component_name}
           Existing : {existing_path}
           Proposed : {proposed_path}
           Similarity: {percentage}%
           Action   : Use existing, do not create duplicate

  [MEDIUM] {component_name}
           ...

Architecture Violations ({count}):
  [CRITICAL] {violation description}
             Location : {file:line}
             Rule     : {violated rule}
             Fix      : {remediation}

  [WARNING]  {violation description}
             ...

Compliance Summary:
  Duplicates : {count} found
  Violations : {critical_count} critical, {warning_count} warnings
  Clean paths: {count} planned changes are compliant

Overall Status: [CLEAN | WARN | BLOCKED]

Recommendations:
  1. {priority action}
  2. {secondary action}
```

## Notes

- This skill does NOT import other skills (NFR-SKEC-02)
- Wraps architecture-awareness guard logic (guards/hooks/architecture-awareness.js)
- ops.js path is relative to package root: `node core/cli/ops.js`
- Used by /design and /plan phases (3 consumers minimum)
- arch-detect uses AST analysis for code-based projects
