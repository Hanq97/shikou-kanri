---
description: Recall memories from current branch's memory bank
---

# Recalling from Memory Bank

I'll retrieve memories from the branch-aware memory bank.

## MEMORY BANK RULES

### Location Policy

**CRITICAL**: Memory-bank MUST be at repository root:
- ✅ **Correct**: `[ROOT]/.claude/memory-bank/[branch]/`
- ❌ **Wrong**: `packages/*/.claude/memory-bank/`

In monorepos: ONE memory-bank at root serves entire project.

### Context Directory Structure

```
.claude/memory-bank/{branch}/{FEATURE-ID}-{developer}/
├── context.md              (metadata, state tracking)
├── evidence.md             (research findings)
├── session-YYYY-MM-DD.md   (daily sessions)
├── checkpoint-*.md         (structured checkpoints)
├── milestone-*.md          (milestone markers)
└── innovate-*-selection.md (workflow decisions)
```

### Folder Naming Convention

| Component | Format | Example |
|-----------|--------|---------|
| Branch folder | `{git-branch}/` | `feature/eps-enhancement/` |
| Context folder | `{FEATURE-ID}-{developer}/` | `ARCH-LAYER-DOC-cuong/` |

### Finding Active Context

Use `state-manager.js` to find active context:
```bash
node core/state/state-manager.js get
```

## Current Context
- **Branch**: !`git branch --show-current`
- **Date**: !`date +%Y-%m-%d`

## Search Query
$ARGUMENTS

## Execution Steps

I'll execute the following steps to list memories:

### Step 1: Get Repository Root

```bash
git rev-parse --show-toplevel
```

Store the output as ROOT_PATH.

### Step 2: List Memories

```bash
node [ROOT_PATH]/core/memory/recall-helper.js
```

This will display all memories in the current branch with:
- 📁 Directories (with item count)
- 📄 Files (with date, size, filename)

### Step 3: Search (if query provided)

If user provided a search query in $ARGUMENTS, I'll look for memories matching that query.

## Available Commands

The recall-helper.js supports:
- `node recall-helper.js` - List all memories
- `node recall-helper.js --search <query>` - Search by keyword
- `node recall-helper.js --type checkpoint` - Filter by type
- `node recall-helper.js --history` - Show git commits since last save
- `node recall-helper.js --preview` - Preview last 5 memories
