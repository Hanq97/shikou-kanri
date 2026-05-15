#!/usr/bin/env node
/**
 * Configure Framework - Project Configuration Script
 *
 * Configures EPS framework for a project by updating:
 * - .claude/CLAUDE.md
 * - .claude/project-info.md
 * - .claude/settings.json
 * - config/stacks.json (default_stack)
 *
 * Uses existing StackManager to read stack configurations.
 *
 * Usage:
 *   node .claude/utils/configure-framework.js --stack csharp-react-mssql --name "My Project"
 *   node .claude/utils/configure-framework.js --config project-config.json
 *   node .claude/utils/configure-framework.js --interactive
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getStackResolver } = require('../state/stack-resolver');

class FrameworkConfigurator {
  constructor() {
    this._resolver = getStackResolver();
    this.projectRoot = path.resolve(__dirname, '../../..');  // core/lib -> project root
    this.claudeDir = path.resolve(__dirname, '../..');       // core/lib -> package root
  }

  /**
   * Initialize - load stacks
   */
  async init() {
    this._resolver.loadStacks();
  }

  /**
   * Configure project with given stack and project config
   * @param {string} stackId - Stack ID from stacks.json
   * @param {Object} projectConfig - Project configuration
   */
  async configureProject(stackId, projectConfig) {
    // Validate stack exists
    const stack = this._resolver.getStack(stackId);
    if (!stack) throw new Error(`Stack not found: ${stackId}`);
    const variantId = stack.default_variant || "default";
    const variantConfig = this._resolver.getVariant(stackId, variantId);

    console.log(`\n📦 Configuring project for stack: ${stack.name}\n`);

    // 1. Generate and write CLAUDE.md
    await this.generateClaudeMD(stackId, variantConfig, projectConfig);

    // 2. Generate and write project-info.md
    await this.generateProjectInfo(stackId, variantConfig, projectConfig);

    // 3. Generate and write settings.json
    await this.generateSettingsJson(stackId, variantConfig, projectConfig);

    console.log('\n✅ Framework configured successfully!\n');
    console.log('Files updated:');
    console.log('  - .claude/CLAUDE.md');
    console.log('  - .claude/project-info.md');
    console.log('  - .claude/settings.json');
  }

  /**
   * Generate CLAUDE.md
   */
  async generateClaudeMD(stackId, variantConfig, projectConfig) {
    const date = new Date().toISOString().split('T')[0];
    const content = `# ${projectConfig.name}${projectConfig.nameJa ? ` (${projectConfig.nameJa})` : ''}
*EPS (Enhanced Productivity System) v3.0*

## 🎯 FRAMEWORK OVERVIEW

**EPS Framework** is a documentation-driven development system with:

### Core Architecture
- **EPS Workflow**: 6-phase strict workflow (Research → Innovate → Design → Plan → Execute → Validate)
- **State Machine**: 52+ states with transition validation and enforcement
- **Quality Gates**: 11 gates total (D1-D4 design gates, G2-G4 implementation gates, Q1-Q4 checkpoint gates)
- **Confidence Engine**: ≥90% confidence threshold requirement at critical gates

### Implementation Details
- **Micro-Agent Pattern**: Single-responsibility agents (200-300 lines each) within Design phase
- **JIT Templates**: Just-In-Time template loading with executable pseudo-code
- **Checkpoint Validation**: Section-level validation and regeneration (C0-C9)
- **Bilingual Documentation**: Japanese + Vietnamese (≥60% combined content)
- **Branch-Aware Memory**: \`.claude/memory-bank/[branch]/\` structure

---

## 📋 PROJECT CONFIGURATION

### Technology Stack
- **Backend**: ${variantConfig.backend}
- **Frontend**: ${variantConfig.frontend}
- **Database**: ${variantConfig.database}
- **Architecture**: ${projectConfig.architecture || 'Clean Architecture with DDD'}
${projectConfig.realtime ? `- **Real-time**: ${projectConfig.realtime}` : ''}
${projectConfig.infrastructure ? `- **Infrastructure**: ${projectConfig.infrastructure}` : ''}
${projectConfig.uiFramework ? `- **UI Framework**: ${projectConfig.uiFramework}` : ''}
${projectConfig.testing ? `- **Testing**: ${projectConfig.testing}` : ''}

### Project Info
- **Name**: ${projectConfig.name}${projectConfig.nameJa ? ` (${projectConfig.nameJa})` : ''}
- **Type**: ${projectConfig.type}
- **Domain**: ${projectConfig.domain}
- **Documentation**: Bilingual (Japanese/Vietnamese/English)
${projectConfig.repository ? `- **Repository**: ${projectConfig.repository}` : ''}
${projectConfig.currentBranch ? `- **Current Branch**: ${projectConfig.currentBranch}` : ''}

${projectConfig.externalIntegrations ? `### External Integrations
${projectConfig.externalIntegrations}` : ''}

${projectConfig.businessModules ? `### Business Modules
${projectConfig.businessModules}` : ''}

---

## ⚡ EPS WORKFLOW

### Document Generation Commands

#### EPS Workflow Commands
\`\`\`bash
/research               # Phase 1: Evidence gathering (read-only)
/innovate               # Phase 2: Generate ≥3 alternatives
/design --srs           # Phase 3: Generate Software Requirements Specification
/design --basic         # Phase 3: Generate Basic Design Document
/design --detail        # Phase 3: Generate Detail Design (Frontend + Backend)
/plan                   # Phase 4: Create implementation plan
/execute                # Phase 5: Execute approved plan
/validate               # Phase 6: Review implementation
\`\`\`

#### Utility Commands
\`\`\`bash
/guide                  # Show EPS framework guide
/save                   # Save context to memory bank
/recall                 # Recall from memory bank
/list                   # List all memories
/strict                 # Enforce strict EPS workflow
/workflow               # Manage workflow states
\`\`\`

---

## 🛡️ QUALITY GATES (Q1-Q4)

### Q1: Evidence-Based
- ✅ Requirements derived from evidence
- ✅ Each requirement has source reference
- ❌ Fail if <80% evidence-based

### Q2: Consistency
- ✅ FR/NFR IDs unique and follow convention
- ✅ Terminology matches glossary
- ❌ Fail if contradictions found

### Q3: Bilingual Ratio
- ✅ Bilingual format: 日本語 / Vietnamese (English)
- ✅ Technical terms in English
- ❌ Fail if ratio <60%

### Q4: No Prohibited Content
- ✅ Interfaces only, no implementation
- ✅ API specifications
- ❌ Fail if full implementation code found

---

## 🛡️ CRITICAL RULES

### Documentation Standards
✅ **ALWAYS DO**:
- Use bilingual format: 日本語 / Vietnamese (English)
- Base all content on evidence files
- Follow checkpoint validation (C0-C9)
- Generate interfaces only (no implementation)

❌ **NEVER DO**:
- Invent requirements not in evidence
- Include full implementation code
- Skip quality gates (Q1-Q4)
- Use Claude Code branding in commits

### Git Commit Messages
✅ **Good**: \`feat: Add user registration\`, \`fix: Update auth flow\`
❌ **Bad**: \`🤖 Generated with Claude Code\`, \`Update document\`

---

${projectConfig.performanceRequirements ? `## 📊 PERFORMANCE REQUIREMENTS
${projectConfig.performanceRequirements}

---` : ''}

*EPS Framework v3.0 | Updated: ${date}*
*Configured for ${projectConfig.name}*
`;

    const claudeMdPath = path.join(this.claudeDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, content);
    console.log('  ✅ Generated CLAUDE.md');
  }

  /**
   * Generate project-info.md
   */
  async generateProjectInfo(stackId, variantConfig, projectConfig) {
    const content = `# ${projectConfig.name}${projectConfig.nameJa ? ` (${projectConfig.nameJa})` : ''} - Project Information

## Project Overview
${projectConfig.description}

## Technology Stack

### Backend
- ${variantConfig.backend}

### Frontend
- ${variantConfig.frontend}

### Database
- ${variantConfig.database}

## EPS Workflow

### Available Commands
- \`/strict\` - Enable strict EPS protocol enforcement
- \`/research\` - Research mode for information gathering
- \`/innovate\` - Innovation mode for brainstorming
- \`/plan\` - Planning mode for specifications
- \`/execute\` - Execution mode for implementation
- \`/validate\` - Review mode for validation
- \`/save\` - Save context to memory bank
- \`/recall\` - Retrieve from memory bank

### Workflow Phases
1. **Research & Innovate** - Understand requirements
2. **Plan** - Create technical specifications
3. **Execute** - Implement the plan
4. **Review** - Validate implementation

## Memory Bank

Location: \`.claude/memory-bank/\`

## Development Guidelines

### Quality Gates
- Pre-implementation: ≥90% confidence required
- Evidence-based decisions: 3+ pieces of evidence
- Multi-agent validation in REVIEW phase
`;

    const projectInfoPath = path.join(this.claudeDir, 'project-info.md');
    fs.writeFileSync(projectInfoPath, content);
    console.log('  ✅ Generated project-info.md');
  }

  /**
   * Generate settings.json
   */
  async generateSettingsJson(stackId, variantConfig, projectConfig) {
    const settings = {
      hooks: {},
      instructions: "This project uses the EPS framework (EPS v3.0). Workflow: /research → /plan → /execute → /validate. Memory unified in .claude/memory-bank/. Requires ≥90% confidence before implementation.",
      project: {
        description: `${projectConfig.description.substring(0, 150)}. ${variantConfig.backend} backend, ${variantConfig.frontend} frontend.`,
        name: projectConfig.name
      }
    };

    const settingsPath = path.join(this.claudeDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log('  ✅ Generated settings.json');
  }

  /**
   * Interactive mode - prompt user for input
   */
  async interactiveMode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const prompt = (q) => new Promise(resolve => rl.question(q, resolve));

    console.log('\n🔧 EPS Framework Configuration\n');

    // Show available stacks
    const stacks = this._resolver.listStacks();
    console.log('Available stacks:');
    stacks.forEach((id, i) => {
      const s = this._resolver.getStack(id);
      console.log(`  ${i + 1}. ${id} - ${s?.name || id}`);
    });
    console.log('');

    const stackId = await prompt('Stack ID (e.g., csharp-react-mssql): ');
    const name = await prompt('Project name: ');
    const nameJa = await prompt('Project name (Japanese, optional): ');
    const type = await prompt('Project type: ');
    const domain = await prompt('Project domain: ');
    const description = await prompt('Description: ');

    rl.close();

    return {
      stackId: stackId.trim(),
      projectConfig: {
        name: name.trim(),
        nameJa: nameJa.trim() || null,
        type: type.trim(),
        domain: domain.trim(),
        description: description.trim()
      }
    };
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const configurator = new FrameworkConfigurator();
  await configurator.init();

  let stackId = null;
  let projectConfig = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--interactive':
      case '-i':
        const result = await configurator.interactiveMode();
        stackId = result.stackId;
        projectConfig = result.projectConfig;
        break;
      case '--stack':
      case '-s':
        stackId = args[++i];
        break;
      case '--name':
        projectConfig = projectConfig || {};
        projectConfig.name = args[++i];
        break;
      case '--name-ja':
        projectConfig = projectConfig || {};
        projectConfig.nameJa = args[++i];
        break;
      case '--type':
        projectConfig = projectConfig || {};
        projectConfig.type = args[++i];
        break;
      case '--domain':
        projectConfig = projectConfig || {};
        projectConfig.domain = args[++i];
        break;
      case '--description':
        projectConfig = projectConfig || {};
        projectConfig.description = args[++i];
        break;
      case '--config':
      case '-c':
        const configFile = args[++i];
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        stackId = config.stackId;
        projectConfig = config;
        break;
      case '--help':
      case '-h':
        console.log(`
EPS Framework Configuration

Usage:
  node configure-framework.js --interactive
  node configure-framework.js --stack <id> --name "Project" --type "Type" --domain "Domain" --description "Desc"
  node configure-framework.js --config project.json

Options:
  -i, --interactive    Interactive mode
  -s, --stack <id>     Stack ID
  --name <name>        Project name
  --name-ja <name>     Project name (Japanese)
  --type <type>        Project type
  --domain <domain>    Project domain
  --description <desc> Project description
  -c, --config <file>  Load from JSON config file
  -h, --help           Show help

Available stacks:
${configurator.stackManager.listStacks().map(id => `  - ${id}`).join('\n')}
`);
        process.exit(0);
    }
  }

  if (!stackId || !projectConfig) {
    console.error('Error: Missing required arguments. Use --help for usage.');
    process.exit(1);
  }

  // Set defaults
  projectConfig.description = projectConfig.description || projectConfig.name;
  projectConfig.type = projectConfig.type || 'Web Application';
  projectConfig.domain = projectConfig.domain || 'General';

  await configurator.configureProject(stackId, projectConfig);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

module.exports = FrameworkConfigurator;
