# /reverse-dd Command — Reverse Detail Design Generator

Generate a Detail Design document from existing source code analysis.
Independent from the test pipeline — can be run anytime.

## Usage

```bash
/reverse-dd --module <moduleId>                        # Generate reverse DD
/reverse-dd --module <moduleId> --output-dir ./docs/   # Custom output path
```

## Flags

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--module` | Yes | - | Module ID (e.g., cmn001000, CST) |
| `--output-dir` | No | documents/features/ | Output directory for DD document |

## Step 1: Parse Arguments

```javascript
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--module' && args[i+1]) { flags.module = args[++i]; }
  else if (args[i] === '--output-dir' && args[i+1]) { flags.outputDir = args[++i]; }
}
```

## Step 2: Validate --module

`--module` is REQUIRED. If missing, display usage and stop.

```
❌ --module is required

Usage: /reverse-dd --module <moduleId> [--output-dir <path>]
```

## Step 3: Dispatch to reverse-dd-extract action

```javascript
const { routeCommand } = require('./core/etf/command-router.js');
const result = await routeCommand({
  command: 'reverse-dd',
  sub: 'extract',
  flags,
});
```

This runs:
1. Code analysis pipeline (scan-result.json)
2. Reverse DD generation with confidence markers
3. Write output markdown document

## Step 4: Display Confidence Report

Show inline summary with EXTRACTED/INFERRED/MISSING breakdown:

```
✅ Reverse DD generated for [moduleId]

Confidence Summary:
  EXTRACTED (≥90%): X sections
  INFERRED (55-89%): Y sections
  MISSING (<55%):  Z sections

Output: [output-path]
```
