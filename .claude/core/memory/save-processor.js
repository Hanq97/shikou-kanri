#!/usr/bin/env node

/**
 * Enhanced /save Command Processor v2.0
 * Supports 3 modes: Quick Save, Milestone Save, Checkpoint Save
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Parse command line arguments
function parseArgs(args) {
  const result = {
    mode: "quick",
    checkpoint: null,
    milestone: null,
    phase: null,
    status: null,
    files: null,
    nextAction: null,
    recoveryTime: "15 minutes",
    links: [],
    completed: null,
    learnings: null,
    next: null,
    message: null,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--checkpoint") {
      result.mode = "checkpoint";
      result.checkpoint = args[++i];
    } else if (arg === "--milestone") {
      result.mode = "milestone";
      result.milestone = args[++i];
    } else if (arg === "--phase") {
      result.phase = args[++i];
    } else if (arg === "--status") {
      result.status = args[++i];
    } else if (arg === "--files") {
      result.files = args[++i];
    } else if (arg === "--next-action") {
      result.nextAction = args[++i];
    } else if (arg === "--recovery-time") {
      result.recoveryTime = args[++i];
    } else if (arg === "--links") {
      result.links = args[++i].split(",").map((l) => l.trim());
    } else if (arg === "--completed") {
      result.completed = args[++i];
    } else if (arg === "--learnings") {
      result.learnings = args[++i];
    } else if (arg === "--next") {
      result.next = args[++i];
    } else {
      // Plain message (Mode 1)
      result.message = args.slice(i).join(" ");
      break;
    }
    i++;
  }

  return result;
}

// Get git context
function getGitContext() {
  try {
    const root = execSync("git rev-parse --show-toplevel", {
      encoding: "utf8",
    }).trim();
    const branch = execSync("git branch --show-current", {
      encoding: "utf8",
    }).trim();
    const commit = execSync("git log -1 --oneline", {
      encoding: "utf8",
    }).trim();
    const status = execSync("git status --short", { encoding: "utf8" }).trim();
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0];
    const timeStr = date.toTimeString().split(" ")[0];
    const timestamp = `${dateStr.replace(/-/g, "")}-${timeStr.replace(/:/g, "")}`;

    return {
      root,
      branch,
      commit,
      status,
      date: dateStr,
      time: timeStr,
      timestamp,
    };
  } catch (error) {
    throw new Error("Not in a git repository");
  }
}

// Create slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Detect context directory (e.g., BRW-KYC-cuong)
function detectContextDir(memoryBankPath) {
  try {
    const activeContextFile = path.join(memoryBankPath, ".active-context");
    if (fs.existsSync(activeContextFile)) {
      return fs.readFileSync(activeContextFile, "utf8").trim();
    }

    // Fallback: find most recently modified directory
    const dirs = fs
      .readdirSync(memoryBankPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => ({
        name: d.name,
        mtime: fs.statSync(path.join(memoryBankPath, d.name)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    return dirs.length > 0 ? dirs[0].name : null;
  } catch (error) {
    return null;
  }
}

// Generate Mode 1: Quick Save
function generateQuickSave(args, ctx) {
  return `## Context Information
- **Date**: ${ctx.date}
- **Time**: ${ctx.time}
- **Branch**: ${ctx.branch}
- **Latest Commit**: ${ctx.commit}
- **Working Directory Status**: ${ctx.status || "Clean"}

## Memory Content
${args.message || "Quick save"}
`;
}

// Generate Mode 2: Milestone Save
function generateMilestoneSave(args, ctx) {
  const slug = slugify(args.milestone);

  return `# Milestone: ${args.milestone}
**Type**: Milestone
**Date**: ${ctx.date} ${ctx.time}
**Branch**: ${ctx.branch}
**Session**: Enhanced /save Command Implementation

---

## Context Information
- **Latest Commit**: ${ctx.commit}
- **Working Directory Status**: ${ctx.status || "Clean"}

---

## Milestone Summary

**Completed**: ${args.completed || "See context above"}

**Learnings**: ${args.learnings || "None specified"}

**Next Action**: ${args.next}

---

## Recovery Instructions

After context compact:

1. Run: \`/recall milestone ${slug}\`
2. Read: Related documents below
3. Continue: ${args.next}

---

## Related Files
${args.links && args.links.length > 0 ? args.links.map((l) => `- [${path.basename(l)}](${l})`).join("\n") : "None specified"}
`;
}

// Generate Mode 3: Checkpoint Save
function generateCheckpointSave(args, ctx) {
  const slug = slugify(args.checkpoint);
  const recoveryMinutes = parseInt(args.recoveryTime) || 15;
  const readingMinutes = Math.max(5, recoveryMinutes - 5);

  return `# Checkpoint: ${args.checkpoint}
**Type**: Checkpoint
**Date**: ${ctx.date} ${ctx.time}
**Branch**: ${ctx.branch}
**Session**: Enhanced /save Command Implementation
**Phase**: ${args.phase}
**Status**: ${args.status}

---

## Context Information
- **Latest Commit**: ${ctx.commit}
- **Working Directory Status**: ${ctx.status || "Clean"}
- **Token Usage**: Available from conversation context

---

## What's Been Done

${args.files || "See git status above"}

---

## What's Pending

Implementation complete, ready for testing and documentation.

---

## Recovery Guide (After Compact)

**Estimated Recovery Time**: ${args.recoveryTime}

### Step 1: Recall Checkpoint
\`\`\`bash
/recall checkpoint ${slug}
\`\`\`

### Step 2: Read Core Documents (${readingMinutes} min)
${args.links && args.links.length > 0 ? args.links.map((l) => `- [${path.basename(l)}](${l})`).join("\n") : "See related files below"}

### Step 3: Verify Understanding (2 min)
- [ ] Understand scope: Enhanced /save with 3 modes
- [ ] Understand strategy: Backward compatible implementation
- [ ] Understand next: ${args.nextAction}

### Step 4: Continue Immediately
\`\`\`bash
# Copy-paste command:
${args.nextAction}
\`\`\`

---

## Decision Tree (Auto-Navigation)

\`\`\`python
def determine_next_action():
    # Auto-generated based on --phase and --status
    if phase == "${args.phase}" and status == "${args.status}":
        return "${args.nextAction}"
    # Add more branches based on context
\`\`\`

**Current State**: "${args.nextAction}"

---

## Related Files

**Primary Documents**:
${args.links && args.links.length > 0 ? args.links.map((l) => `- [${path.basename(l)}](${l})`).join("\n") : "None specified"}

**Supporting Documents**:
- Enhanced /save command implementation
- Mode detection logic
- Template generation

---

## Troubleshooting

**Issue 1**: "I don't have enough context"
- **Solution**: Read ${args.links && args.links.length > 0 ? path.basename(args.links[0]) : "the primary documents"}

**Issue 2**: "What are the 3 modes?"
- **Solution**: Mode 1 (Quick), Mode 2 (Milestone), Mode 3 (Checkpoint)

**Issue 3**: "How to use each mode?"
- **Solution**: See commands/save.md for syntax

---

**Safe to Compact**: YES
**Recovery Verified**: YES (4-step guide)
**Next Action**: ${args.nextAction}
`;
}

// Main function
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: save-processor.js [--checkpoint|--milestone|message]",
    );
    process.exit(1);
  }

  const parsed = parseArgs(args);
  const ctx = getGitContext();

  const memoryBankPath = path.join(ctx.root, ".claude/memory-bank", ctx.branch);

  // Ensure memory-bank directory exists
  if (!fs.existsSync(memoryBankPath)) {
    fs.mkdirSync(memoryBankPath, { recursive: true });
  }

  let content, filename, filepath;

  switch (parsed.mode) {
    case "checkpoint": {
      const slug = slugify(parsed.checkpoint);
      const contextDir = detectContextDir(memoryBankPath);

      if (contextDir) {
        const contextPath = path.join(memoryBankPath, contextDir);
        if (!fs.existsSync(contextPath)) {
          fs.mkdirSync(contextPath, { recursive: true });
        }
        filename = `checkpoint-${slug}-${ctx.timestamp}.md`;
        filepath = path.join(contextPath, filename);
      } else {
        filename = `checkpoint-${slug}-${ctx.timestamp}.md`;
        filepath = path.join(memoryBankPath, filename);
      }

      content = generateCheckpointSave(parsed, ctx);
      break;
    }

    case "milestone": {
      const slug = slugify(parsed.milestone);
      filename = `${ctx.date.replace(/-/g, "")}-milestone-${slug}.md`;
      filepath = path.join(memoryBankPath, filename);
      content = generateMilestoneSave(parsed, ctx);
      break;
    }

    case "quick":
    default: {
      filename = `${ctx.date.replace(/-/g, "")}-session.md`;
      filepath = path.join(memoryBankPath, filename);
      content = generateQuickSave(parsed, ctx);
      break;
    }
  }

  // Write file
  fs.writeFileSync(filepath, content, "utf8");

  // Output result
  console.log(`\n✅ Saved successfully!\n`);
  console.log(
    `**Mode**: ${parsed.mode.charAt(0).toUpperCase() + parsed.mode.slice(1)} Save`,
  );
  console.log(`**File**: ${filepath.replace(ctx.root, "")}`);
  console.log(`**Size**: ${content.length} characters\n`);

  if (parsed.mode === "checkpoint") {
    console.log(
      `📋 Recovery command: \`/recall checkpoint ${slugify(parsed.checkpoint)}\``,
    );
  } else if (parsed.mode === "milestone") {
    console.log(
      `📋 Recovery command: \`/recall milestone ${slugify(parsed.milestone)}\``,
    );
  }

  console.log(`\n---\n`);
  console.log(
    `**Next Action**: ${parsed.nextAction || parsed.next || "Continue development"}\n`,
  );
}

// Run
try {
  main();
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
