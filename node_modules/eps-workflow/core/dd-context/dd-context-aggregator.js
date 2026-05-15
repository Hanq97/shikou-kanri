/**
 * DD Context Aggregator
 *
 * Extracts relevant DD decisions from innovate-dd-selection.md
 * and saves pre-extracted context for each micro-agent.
 *
 * This solves the problem of LLMs missing content when reading large files.
 * Instead of reading 70KB file, each micro-agent reads only 2-5KB relevant context.
 *
 * @version 1.0.0
 * @created 2026-02-08
 */

const fs = require("fs");
const path = require("path");

// Section-to-Agent Mapping
// Defines which DD topics are relevant for each micro-agent
const AGENT_DD_MAPPING = {
  // Backend DD Agents
  "bdd-00-document-info": {
    sections: ["metadata", "overview"],
    description: "Document metadata - needs overview only",
  },
  "bdd-01-service-overview": {
    sections: [
      "L3.5",
      "L2.1",
      "L2.2",
      "L2.3",
      "L2.4",
      "L2.5",
      "L2.6",
      "L2.7",
      "L2.8",
      "L2.9",
      "L2.10",
    ],
    description: "Service overview - needs API contract and all domain logic",
  },
  "bdd-02-business-logic": {
    sections: ["L1.1", "L1.2", "L1.3", "L1.4", "L1.5", "L1.6", "L1.7", "L1.8"],
    description: "Business logic - needs all core algorithms",
  },
  "bdd-03-api-endpoints": {
    sections: ["L3.5", "L3.1", "L3.2"],
    description: "API endpoints - needs API contract, CQRS events, event store",
  },
  "bdd-04-data-database": {
    sections: ["L3.3", "L1.8"],
    description: "Data & database - needs persistence, cross-reference index",
  },
  "bdd-05-integration": {
    sections: ["L3.6", "L3.4", "L2.7", "L2.8"],
    description:
      "Integration - needs client service, background sync, save/scan logic",
  },
  "bdd-06-error-handling": {
    sections: ["L3.2", "L1.6", "L3.4"],
    description:
      "Error handling - needs event store, conflict detection, background sync errors",
  },
  "bdd-07-performance": {
    sections: ["L1.4", "L3.4", "L1.8"],
    description:
      "Performance - needs hybrid query, background sync, cross-reference index",
  },
  "bdd-08-security": {
    sections: ["L3.7", "L2.9"],
    description: "Security - needs hook integration, staleness detection",
  },
  "bdd-09-test-cases": {
    sections: ["L3.8"],
    description: "Test cases - needs testing strategy",
  },

  // Frontend DD Agents
  "fdd-00-document-info": {
    sections: ["metadata", "overview"],
    description: "Document metadata",
  },
  "fdd-01-overview": {
    sections: ["overview", "L2.1", "L2.2", "L2.3"],
    description: "Overview - needs domain logic overview",
  },
  "fdd-02-business-flow": {
    sections: ["L2.1", "L2.2", "L2.3", "L2.4", "L2.5", "L2.6"],
    description: "Business flow - needs workflow logic",
  },
  "fdd-03-screens": {
    sections: ["L3.5"],
    description: "Screens - needs API contract for data requirements",
  },
  "fdd-04-state": {
    sections: ["L3.6", "L2.9"],
    description: "State management - needs client service, staleness",
  },
  "fdd-05-data-integration": {
    sections: ["L3.5", "L3.6"],
    description: "Data integration - needs API contract, client service",
  },
  "fdd-06-error": {
    sections: ["L1.6", "L3.2"],
    description:
      "Error handling - needs conflict detection, event store errors",
  },
  "fdd-07-responsive": {
    sections: [],
    description: "Responsive design - no DD context needed",
  },
  "fdd-08-performance": {
    sections: ["L1.4", "L3.4"],
    description: "Performance - needs hybrid query, background sync",
  },
  "fdd-09-visual-design": {
    sections: [],
    description: "Visual design - no DD context needed",
  },
};

// Section line ranges (extracted from grep results)
const SECTION_LINE_RANGES = {
  metadata: { start: 1, end: 11 },
  overview: { start: 12, end: 27 },
  "L1.1": { start: 30, end: 225 },
  "L1.2": { start: 226, end: 328 },
  "L1.3": { start: 329, end: 463 },
  "L1.4": { start: 464, end: 625 },
  "L1.5": { start: 626, end: 774 },
  "L1.6": { start: 775, end: 898 },
  "L1.7": { start: 899, end: 1028 },
  "L1.8": { start: 1029, end: 1192 },
  "L2.1": { start: 1193, end: 1291 },
  "L2.2": { start: 1292, end: 1365 },
  "L2.3": { start: 1366, end: 1434 },
  "L2.4": { start: 1435, end: 1515 },
  "L2.5": { start: 1516, end: 1602 },
  "L2.6": { start: 1603, end: 1670 },
  "L2.7": { start: 1671, end: 1753 },
  "L2.8": { start: 1754, end: 1843 },
  "L2.9": { start: 1844, end: 1920 },
  "L2.10": { start: 1921, end: 1998 },
  "L3.1": { start: 1999, end: 2076 },
  "L3.2": { start: 2077, end: 2144 },
  "L3.3": { start: 2145, end: 2214 },
  "L3.4": { start: 2215, end: 2301 },
  "L3.5": { start: 2302, end: 2401 },
  "L3.6": { start: 2402, end: 2501 },
  "L3.7": { start: 2502, end: 2576 },
  "L3.8": { start: 2577, end: 2645 },
  "L3.9": { start: 2646, end: 2800 },
};

class DDContextAggregator {
  constructor(memoryBankPath) {
    this.memoryBankPath = memoryBankPath;
    this.ddSelectionPath = path.join(
      memoryBankPath,
      "innovate-dd-selection.md",
    );
    this.outputDir = path.join(process.cwd(), ".claude/.tmp/dd-context");
    this.ddContent = null;
    this.ddLines = null;
  }

  /**
   * Load and parse the DD selection file
   */
  loadDDSelection() {
    if (!fs.existsSync(this.ddSelectionPath)) {
      console.log(`⚠️ DD selection file not found: ${this.ddSelectionPath}`);
      return false;
    }

    this.ddContent = fs.readFileSync(this.ddSelectionPath, "utf-8");
    this.ddLines = this.ddContent.split("\n");
    console.log(`✅ Loaded DD selection: ${this.ddLines.length} lines`);
    return true;
  }

  /**
   * Extract specific sections from DD selection
   */
  extractSections(sectionIds) {
    if (!this.ddLines) {
      throw new Error("DD selection not loaded. Call loadDDSelection() first.");
    }

    const extractedContent = [];

    for (const sectionId of sectionIds) {
      const range = SECTION_LINE_RANGES[sectionId];
      if (!range) {
        console.log(`⚠️ Unknown section: ${sectionId}`);
        continue;
      }

      // Extract lines (1-indexed to 0-indexed)
      const sectionLines = this.ddLines.slice(range.start - 1, range.end);
      extractedContent.push(`<!-- DD Section: ${sectionId} -->`);
      extractedContent.push(sectionLines.join("\n"));
      extractedContent.push("");
    }

    return extractedContent.join("\n");
  }

  /**
   * Generate context file for a specific agent
   */
  generateAgentContext(agentId) {
    const mapping = AGENT_DD_MAPPING[agentId];
    if (!mapping) {
      console.log(`⚠️ No mapping for agent: ${agentId}`);
      return null;
    }

    if (mapping.sections.length === 0) {
      console.log(`ℹ️ Agent ${agentId} has no DD context requirements`);
      return null;
    }

    const content = this.extractSections(mapping.sections);

    // Add header
    const header = `# DD Context for ${agentId}

**Description**: ${mapping.description}
**Sections**: ${mapping.sections.join(", ")}
**Generated**: ${new Date().toISOString()}

---

`;

    return header + content;
  }

  /**
   * Generate all agent context files
   */
  generateAllContexts() {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const results = {
      generated: [],
      skipped: [],
      errors: [],
    };

    for (const agentId of Object.keys(AGENT_DD_MAPPING)) {
      try {
        const content = this.generateAgentContext(agentId);

        if (!content) {
          results.skipped.push(agentId);
          continue;
        }

        const outputPath = path.join(
          this.outputDir,
          `${agentId}-dd-context.md`,
        );
        fs.writeFileSync(outputPath, content, "utf-8");

        const stats = fs.statSync(outputPath);
        results.generated.push({
          agentId,
          path: outputPath,
          size: Math.round(stats.size / 1024) + "KB",
          sections: AGENT_DD_MAPPING[agentId].sections.length,
        });
      } catch (error) {
        results.errors.push({ agentId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Print summary report
   */
  printReport(results) {
    console.log("\n" + "=".repeat(60));
    console.log("DD CONTEXT AGGREGATOR - REPORT");
    console.log("=".repeat(60));

    console.log(`\n✅ Generated: ${results.generated.length} files`);
    for (const item of results.generated) {
      console.log(
        `   - ${item.agentId}: ${item.size} (${item.sections} sections)`,
      );
    }

    if (results.skipped.length > 0) {
      console.log(
        `\nℹ️ Skipped: ${results.skipped.length} agents (no DD context needed)`,
      );
      for (const agentId of results.skipped) {
        console.log(`   - ${agentId}`);
      }
    }

    if (results.errors.length > 0) {
      console.log(`\n❌ Errors: ${results.errors.length}`);
      for (const item of results.errors) {
        console.log(`   - ${item.agentId}: ${item.error}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Output directory: ${this.outputDir}`);
    console.log("=".repeat(60) + "\n");
  }
}

// CLI Entry Point
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let memoryBankPath = null;
  let specificAgent = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--memory-bank" && args[i + 1]) {
      memoryBankPath = args[i + 1];
      i++;
    } else if (args[i] === "--agent" && args[i + 1]) {
      specificAgent = args[i + 1];
      i++;
    } else if (args[i] === "--help") {
      console.log(`
DD Context Aggregator

Usage:
  node dd-context-aggregator.js --memory-bank <path> [--agent <agent-id>]

Options:
  --memory-bank <path>  Path to memory bank directory (required)
  --agent <agent-id>    Generate context for specific agent only
  --help                Show this help

Examples:
  node dd-context-aggregator.js --memory-bank .claude/memory-bank/master/HIPPORAG-GLOBAL-GRAPH-cuong
  node dd-context-aggregator.js --memory-bank .claude/memory-bank/master/HIPPORAG-GLOBAL-GRAPH-cuong --agent bdd-03-api-endpoints

Available agents:
  ${Object.keys(AGENT_DD_MAPPING).join("\n  ")}
`);
      process.exit(0);
    }
  }

  if (!memoryBankPath) {
    console.error("❌ Error: --memory-bank is required");
    process.exit(1);
  }

  // Run aggregator
  const aggregator = new DDContextAggregator(memoryBankPath);

  if (!aggregator.loadDDSelection()) {
    process.exit(1);
  }

  if (specificAgent) {
    const content = aggregator.generateAgentContext(specificAgent);
    if (content) {
      const outputPath = path.join(
        aggregator.outputDir,
        `${specificAgent}-dd-context.md`,
      );
      if (!fs.existsSync(aggregator.outputDir)) {
        fs.mkdirSync(aggregator.outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, content, "utf-8");
      console.log(`✅ Generated: ${outputPath}`);
    }
  } else {
    const results = aggregator.generateAllContexts();
    aggregator.printReport(results);
  }
}

// Export for use as module
module.exports = { DDContextAggregator, AGENT_DD_MAPPING, SECTION_LINE_RANGES };

// Run if called directly
if (require.main === module) {
  main();
}
