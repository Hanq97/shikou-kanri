# /commands - EPS Command Dashboard
# /commands - EPSコマンドダッシュボード
# /commands - Bảng Điều Khiển Lệnh EPS

**Purpose**: Interactive command registry with usage statistics and detailed help
**Version**: 3.7.0
**Created**: 2025-12-24
**Integration**: command-dashboard.js

---

## 📋 COMMAND DESCRIPTION

The `/commands` slash command provides an interactive dashboard for exploring all available EPS commands with:

1. **Command Registry**: View all commands organized by category
2. **Usage Statistics**: Track command usage patterns and performance
3. **Detailed Help**: Get comprehensive help for any command
4. **Export Functionality**: Export registry and stats to JSON/CSV

**Key Features**:
- 7 command categories (workflow, review, optimization, versioning, memory, design, utility)
- Real-time usage statistics with ASCII visualizations
- Command search and filtering
- Multiple output formats (CLI, JSON, Markdown, CSV)

---

## 🚀 USAGE

### Basic Usage

```bash
# Show all commands (default)
/commands

# Show usage statistics
/commands --stats

# Show help for specific command
/commands --help <command-name>

# Filter by category
/commands --category <category-name>
```

### Advanced Usage

```bash
# Export registry to JSON
/commands --export --format json

# Export statistics to CSV
/commands --stats --export --format csv

# Custom period for statistics (days)
/commands --stats --period 30

# Show category in specific format
/commands --category review --format markdown
```

---

## 📥 COMMAND 1: /commands (Registry)

**Purpose**: Show all available commands organized by category

### Syntax

```bash
/commands [--category <name>] [--format <format>]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--category` | string | ❌ No | all | Filter by category: workflow, review, optimization, versioning, memory, design, utility |
| `--format` | string | ❌ No | cli | Output format: cli, json, markdown |

### Examples

```bash
# Show all commands (CLI format)
/commands

# Show only review commands
/commands --category review

# Export registry to JSON
/commands --format json

# Show workflow commands in markdown
/commands --category workflow --format markdown
```

### Output (CLI Format)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        EPS COMMAND REGISTRY                                   ║
║                     17 Commands Available (v3.7.0)                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 WORKFLOW COMMANDS (6)
────────────────────────────────────────────────────────────────────────────────
  /research              Evidence gathering (read-only phase)
  /innovate              Generate ≥3 alternatives with user selection
  /plan                  Create implementation strategy (confidence ≥90%)
  /execute               Implement approved plan with strict adherence
  /validate              Multi-agent review with aggregated scoring
  /workflow              State machine management and workflow control

🔍 REVIEW COMMANDS (1) ⭐ NEW
────────────────────────────────────────────────────────────────────────────────
  /plan-review           Multi-dimensional plan analysis (5 dimensions)

⚡ OPTIMIZATION COMMANDS (1) ⭐ NEW
────────────────────────────────────────────────────────────────────────────────
  /plan-optimize         Automated plan enhancement (4 strategies)

📦 VERSIONING COMMANDS (4) ⭐ NEW
────────────────────────────────────────────────────────────────────────────────
  /plan-version save     Create new plan version (semantic versioning)
  /plan-version list     Show version history with metadata
  /plan-version compare  Compare two versions side-by-side
  /plan-version rollback Restore previous version safely

💾 MEMORY COMMANDS (3)
────────────────────────────────────────────────────────────────────────────────
  /save                  Save context to memory bank (3 modes: quick/full/recovery)
  /recall                Recall context from memory bank with semantic search
  /list                  List all memories across branches

🛠️ UTILITY COMMANDS (2)
────────────────────────────────────────────────────────────────────────────────
  /guide                 EPS framework guide (6 options: quick/full/commands/gates/agents/workflow)
  /strict                Enable strict workflow protocol enforcement

💡 TIP: Use /commands --help <command> for detailed information
      Use /commands --stats for usage statistics
      Use /commands --category <name> to filter by category
```

---

## 📥 COMMAND 2: /commands --stats (Usage Statistics)

**Purpose**: Display command usage patterns, success rates, and performance metrics

### Syntax

```bash
/commands --stats [--period <days>] [--format <format>]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--period` | number | ❌ No | 7 | Number of days to analyze (1-365) |
| `--format` | string | ❌ No | cli | Output format: cli, json, csv |

### Examples

```bash
# Show last 7 days statistics
/commands --stats

# Show last 30 days
/commands --stats --period 30

# Export to JSON
/commands --stats --format json

# Export to CSV
/commands --stats --format csv
```

### Output (CLI Format)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                      COMMAND USAGE STATISTICS                                 ║
║                     Period: 2025-12-17 to 2025-12-24                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 OVERALL STATISTICS
────────────────────────────────────────────────────────────────────────────────
Total Command Calls:         342
Success Rate:               98.5%
Avg Execution Time:         3.2 seconds
Most Used Command:          /plan (125 calls)
Fastest Command:            /guide (0.1s avg)

📈 USAGE BY COMMAND (Top 10)
────────────────────────────────────────────────────────────────────────────────
Command              Calls   Success   Avg Time   Chart
────────────────────────────────────────────────────────────────────────────────
/plan                  125   100.0%      4.2s     ████████████████████████████
/design                 87    98.9%     12.5s     ███████████████████
/save                   56   100.0%      0.8s     ████████████
/execute                32    96.9%      8.5s     ███████
/validate               18   100.0%      5.2s     ████
/plan-review ⭐         12   100.0%      3.8s     ███  (NEW)
/innovate                8   100.0%      6.1s     ██
/recall                  4   100.0%      1.2s     █

⏱️  PERFORMANCE BY CATEGORY
────────────────────────────────────────────────────────────────────────────────
workflow         4.8s avg     [█████████████████      ]
review           3.8s avg     [███████████████        ] ⭐ NEW
optimization     N/A          [                       ] ⭐ NEW
versioning       N/A          [                       ] ⭐ NEW
memory           1.0s avg     [████                   ]
utility          0.5s avg     [██                     ]

💡 INSIGHTS
────────────────────────────────────────────────────────────────────────────────
✓ Week 7 new commands: /plan-review, /plan-optimize, /plan-version-*
✓ Use these commands to improve plan quality before execution
⚠ New commands not yet tracked - consider using them for better workflows
```

---

## �� COMMAND 3: /commands --help <command> (Detailed Help)

**Purpose**: Display comprehensive help for a specific command

### Syntax

```bash
/commands --help <command-name> [--format <format>]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `command-name` | string | ✅ Yes | - | Name of command (with or without leading /) |
| `--format` | string | ❌ No | cli | Output format: cli, json, markdown |

### Examples

```bash
# Show help for /plan-review
/commands --help plan-review

# Show help in JSON format
/commands --help plan-optimize --format json

# Show help in markdown format
/commands --help plan-version --format markdown
```

### Output Example (CLI Format)

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                            /plan-review                                       ║
║                     Multi-Dimensional Plan Analysis                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 DESCRIPTION
────────────────────────────────────────────────────────────────────────────────
Analyzes generated plans across 5 dimensions (completeness, feasibility, clarity,
risk, consistency) and provides actionable improvement suggestions with confidence
scoring.

📥 PARAMETERS
────────────────────────────────────────────────────────────────────────────────
  plan-path (string, required)
    Path to plan file

  --format (string, optional)
    Output format: cli | json | markdown

  --dimensions (string, optional)
    Specific dimensions to analyze (comma-separated)

  --threshold (number, optional)
    Minimum passing score (0-100, default: 90)

💡 EXAMPLES
────────────────────────────────────────────────────────────────────────────────

Example 1:
/plan-review .claude/memory-bank/eps-enhancement/week-7/days/DAY_1_PLAN.md

Example 2:
/plan-review path/to/plan.md --format json

Example 3:
/plan-review path/to/plan.md --dimensions completeness,feasibility --verbose

🔗 RELATED COMMANDS
────────────────────────────────────────────────────────────────────────────────
  /plan-optimize
  /plan
  /execute

💡 TIP: Use /commands --stats to see usage statistics
```

---

## 📥 COMMAND 4: /commands --export (Export Data)

**Purpose**: Export command registry and statistics to JSON/CSV

### Syntax

```bash
/commands --export [--format <format>]
/commands --stats --export [--format <format>]
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `--format` | string | ❌ No | json | Export format: json, csv |

### Examples

```bash
# Export registry to JSON
/commands --export

# Export statistics to CSV
/commands --stats --export --format csv

# Export specific category
/commands --category review --export --format json
```

### Output (JSON Format)

```json
{
  "registry": [
    {
      "name": "/plan-review",
      "description": "Multi-dimensional plan analysis",
      "category": "review",
      "parameters": [...],
      "examples": [...],
      "relatedCommands": [...]
    },
    ...
  ],
  "statistics": {
    "overall": {
      "totalCalls": 342,
      "successRate": 98.5,
      "avgExecutionTime": 3.2
    },
    "byCommand": [...],
    "byCategory": [...]
  },
  "exportDate": "2025-12-24T12:00:00Z"
}
```

---

## 🔗 INTEGRATION POINTS

### Integration 1: Command Files

**Location**: `commands/*.md`

All command files are automatically scanned and parsed. The dashboard extracts:
- Command name (from first h1 heading)
- Description (from first line after name)
- Parameters (from "PARAMETERS" section with table)
- Examples (from "EXAMPLES" section with code blocks)
- Related commands (from "RELATED" section)

### Integration 2: Command History

**Location**: `.claude/memory-bank/command-history.json`

Command execution wrapper records each invocation:

```javascript
{
  "id": "cmd-001",
  "timestamp": "2025-12-24T10:30:00Z",
  "command": "/plan-review",
  "parameters": { ... },
  "status": "success",
  "executionTime": 3800,
  "result": { ... }
}
```

### Integration 3: Confidence History

**Location**: `.claude/memory-bank/confidence-history.json`

Links command usage to confidence scores for quality metrics.

---

## ⚙️ IMPLEMENTATION

### CLI Script

```bash
# Location: core/dashboard/command-dashboard.js

# Show registry
node core/dashboard/command-dashboard.js

# Show statistics
node core/dashboard/command-dashboard.js --stats

# Show help
node core/dashboard/command-dashboard.js --help plan-review

# Export
node core/dashboard/command-dashboard.js --export --format json
```

### JavaScript API

```javascript
const { CommandDashboard } = require('./core/dashboard/command-dashboard.js');

const dashboard = new CommandDashboard();

// Show registry
const registry = await dashboard.showRegistry({ format: 'cli' });
console.log(registry);

// Show statistics
const stats = await dashboard.showStats({ period: 7, format: 'cli' });
console.log(stats);

// Show help
const help = await dashboard.showHelp('plan-review', 'cli');
console.log(help);

// Export
const data = await dashboard.export('json');
console.log(data);
```

---

## 📊 COMMAND CATEGORIES

### 1. Workflow Commands (6)

Core EPS workflow commands that follow the Research → Innovate → Plan → Execute → Validate sequence.

**Commands**: `/research`, `/innovate`, `/plan`, `/execute`, `/validate`, `/workflow`

### 2. Review Commands (1) ⭐ NEW

Plan quality analysis and validation before execution.

**Commands**: `/plan-review`

### 3. Optimization Commands (1) ⭐ NEW

Automated plan enhancement with 4 improvement strategies.

**Commands**: `/plan-optimize`

### 4. Versioning Commands (4) ⭐ NEW

Complete plan version control with semantic versioning.

**Commands**: `/plan-version save`, `/plan-version list`, `/plan-version compare`, `/plan-version rollback`

### 5. Memory Commands (3)

Context persistence and retrieval across sessions.

**Commands**: `/save`, `/recall`, `/list`

### 6. Design Commands (1)

Document generation (SRS, BD, DD) using micro-agents.

**Commands**: `/design`

### 7. Utility Commands (2)

Framework guides and strict mode enforcement.

**Commands**: `/guide`, `/strict`

---

## ⚠️ ERROR HANDLING

### Error 1: Command Not Found

```
❌ Command not found: /plan-reviw

Suggestions:
- Did you mean /plan-review?
- Use /commands to see all available commands
```

### Error 2: No History Data

```
⚠️  No command history found

This is normal for new installations. Command history will be recorded
as you use EPS commands. Use /commands to see available commands.
```

### Error 3: Invalid Category

```
❌ Invalid category: optimization

Available categories:
- workflow
- review
- versioning
- memory
- design
- utility
```

---

## ✅ SUCCESS CRITERIA

- ✅ Dashboard shows all commands (existing + 4 new from Week 7)
- ✅ Commands categorized correctly (7 categories)
- ✅ Usage statistics display with ASCII charts
- ✅ Detailed help for each command
- ✅ Export to JSON/CSV supported
- ✅ Filter by category works
- ✅ Load time <1 second
- ✅ Stats calculate in <2 seconds
- ✅ Help displays instantly (<0.5s)

---

## 🔗 RELATED COMMANDS

- `/guide` - EPS framework comprehensive guide
- `/workflow` - Current workflow state and status
- `/strict` - Enable strict workflow enforcement

---

**Created**: 2025-12-24
**Status**: ✅ Implemented
**Tests**: Integration with all existing commands
**Performance**: <1s load, <2s stats, <0.5s help
**Next**: Update EPS_WORKFLOW.md and QUICK_START.md with new command
