#!/usr/bin/env node

/**
 * Pseudo-code Generator v1.0
 * Extracts structured pseudo-code from human Detail Design documents
 *
 * Implements:
 * - FR-PSEUDO-006: Section Extraction
 * - FR-PSEUDO-007: Structured Format
 * - FR-PSEUDO-008: TRACE_MATRIX Generation
 *
 * Created: 2026-02-12
 * EPS Framework v5.2
 */

const fs = require("fs");
const path = require("path");

class PseudoCodeGenerator {
  /**
   * @param {string} humanDDPath - Path to human-readable DD file
   * @param {string} srsPath - Path to SRS file for FR extraction
   * @param {string} docType - FRONTEND_DD or BACKEND_DD
   */
  constructor(humanDDPath, srsPath, docType = "FRONTEND_DD") {
    this.humanDDPath = humanDDPath;
    this.srsPath = srsPath;
    this.docType = docType;
    this.formatSpec = this.loadFormatSpec();
    this.stats = {
      humanDDLines: 0,
      pseudoLines: 0,
      compressionRatio: 0,
    };
    this.splitMode = "single"; // "single" | "multi-file"
  }

  /**
   * Load pseudo-code format specification
   */
  loadFormatSpec() {
    const formatPath = path.join(__dirname, "formats", "pseudo-code-format.md");
    if (!fs.existsSync(formatPath)) {
      console.warn(`⚠️  Format spec not found: ${formatPath}`);
      return null;
    }
    return fs.readFileSync(formatPath, "utf8");
  }

  /**
   * Main generation method
   * Implements: DD Section 3.1 (Regex-based Section Parser)
   */
  async generate() {
    const humanDD = fs.readFileSync(this.humanDDPath, "utf8");
    const srs = fs.readFileSync(this.srsPath, "utf8");

    this.stats.humanDDLines = humanDD.split("\n").length;

    // Step 1: Extract META
    const meta = this.extractMeta(humanDD);

    // Step 2: Generate TRACE_MATRIX (Hybrid: Extract + Validate)
    const traceMatrix = this.generateTraceMatrix(humanDD, srs);

    // Step 3: Extract COMPONENTS
    const components = this.extractComponents(humanDD);

    // Step 4: Extract ERROR_HANDLING
    const errorHandling = this.extractErrorHandling(humanDD);

    // Step 5: Extract INTEGRATION_POINTS
    const integrationPoints = this.extractIntegrationPoints(humanDD);

    // Step 6: Assemble pseudo-code document
    const pseudoCode = this.assemblePseudoCode({
      meta,
      traceMatrix,
      components,
      errorHandling,
      integrationPoints,
    });

    this.stats.pseudoLines = pseudoCode.split("\n").length;
    this.stats.compressionRatio = Math.round(
      (1 - this.stats.pseudoLines / this.stats.humanDDLines) * 100,
    );

    return pseudoCode;
  }

  /**
   * Generate multi-file pseudo-code (master + section files)
   * Size-based trigger: only splits when DD has markers AND > 300 lines
   * @returns {Promise<{ master: string, sections: Map<string, string> }>}
   */
  async generateAndSplit() {
    const humanDD = fs.readFileSync(this.humanDDPath, "utf8");
    const boundaries = this.extractSectionBoundaries(humanDD);
    const ddLines = humanDD.split("\n").length;

    // Size-based trigger (E23, C2): only split when large enough
    if (boundaries.length === 0 || ddLines <= 300) {
      const singlePseudo = await this.generate();
      return { master: singlePseudo, sections: new Map() };
    }

    // Generate full pseudo first to get all components
    const fullPseudo = await this.generate();

    // Parse components from generated pseudo (COMPONENT blocks)
    const components = this.parseComponentsFromPseudo(fullPseudo);

    // Assign components to sections based on DD boundaries
    this.assignComponentsToSections(components, boundaries, humanDD);

    // Build master pseudo (META + TRACE_MATRIX + SECTION_MAP + SHARED_CONTEXT)
    const master = this.assembleMasterPseudo(components, boundaries, humanDD);

    // Build section pseudo files
    const sections = new Map();
    for (const boundary of boundaries) {
      const sectionComps = components.filter(c => c.sectionId === boundary.sectionId);
      if (sectionComps.length > 0) {
        sections.set(boundary.sectionId,
          this.assembleSectionPseudo(boundary.sectionId, sectionComps));
      }
    }

    return { master, sections };
  }

  /**
   * Parse COMPONENT blocks from generated pseudo-code
   * @param {string} pseudoContent - Full pseudo-code output
   * @returns {Array<{name: string, body: string, sectionId: string}>}
   */
  parseComponentsFromPseudo(pseudoContent) {
    const components = [];
    const lines = pseudoContent.split("\n");
    let currentComp = null;
    let bodyLines = [];

    for (const line of lines) {
      const compMatch = line.match(/^COMPONENT\s+(.+)$/);
      if (compMatch) {
        // Save previous component
        if (currentComp) {
          components.push({
            name: currentComp,
            body: bodyLines.join("\n").trimEnd(),
            sectionId: "unknown",
          });
        }
        currentComp = compMatch[1];
        bodyLines = [];
      } else if (currentComp) {
        // Stop at next top-level section (## HEADING)
        if (line.match(/^## [A-Z]/)) {
          components.push({
            name: currentComp,
            body: bodyLines.join("\n").trimEnd(),
            sectionId: "unknown",
          });
          currentComp = null;
          bodyLines = [];
        } else {
          bodyLines.push(line);
        }
      }
    }

    // Save last component
    if (currentComp) {
      components.push({
        name: currentComp,
        body: bodyLines.join("\n").trimEnd(),
        sectionId: "unknown",
      });
    }

    return components;
  }

  /**
   * Assign parsed components to DD sections by matching component heading positions
   * to section boundary ranges in the human DD
   */
  assignComponentsToSections(components, boundaries, humanDD) {
    const ddLines = humanDD.split("\n");
    // Find ## N. heading positions in DD
    const headingPositions = [];
    for (let i = 0; i < ddLines.length; i++) {
      const hMatch = ddLines[i].match(/^## (\d+)\.\s+(.+?)$/);
      if (hMatch) {
        const compName = hMatch[2].replace(/[*_`]/g, "").trim();
        headingPositions.push({ line: i, name: compName });
      }
    }

    // Match each component to a section boundary by heading position
    for (const comp of components) {
      const heading = headingPositions.find(h => h.name === comp.name);
      if (heading) {
        for (const boundary of boundaries) {
          if (heading.line >= boundary.startLine && heading.line <= boundary.endLine) {
            comp.sectionId = boundary.sectionId;
            break;
          }
        }
      }
    }
  }

  /**
   * Extract metadata from human DD
   */
  extractMeta(content) {
    const featureMatch = content.match(/Feature(?:\sID)?[:\s]+([A-Z0-9-]+)/i);
    const versionMatch = content.match(/Version[:\s]+([\d.]+)/i);
    const dateMatch = content.match(/(?:Created|Date)[:\s]+([\d-]+)/i);

    return {
      featureId: featureMatch ? featureMatch[1] : "UNKNOWN",
      docType: this.docType,
      version: versionMatch ? versionMatch[1] : "1.0",
      generatedDate: new Date().toISOString().split("T")[0],
      sourceDocument: path.basename(this.humanDDPath),
      humanDDLines: this.stats.humanDDLines,
    };
  }

  /**
   * Generate TRACE_MATRIX using Hybrid approach (Extract + Validate)
   * Implements: FR-PSEUDO-008, DD Decision 2
   */
  generateTraceMatrix(humanDD, srs) {
    // Extract FR IDs from SRS
    const frPattern = /FR-[A-Z]+-\d+/g;
    const srsRequirements = [...new Set(srs.match(frPattern) || [])];

    // Extract "Traces To:" annotations from human DD
    const tracePattern =
      /\*\*(?:Traces?\s?To|Implements|Reference)\*\*[:\s]+([^\n]+)/gi;
    const traces = [];
    let match;

    while ((match = tracePattern.exec(humanDD)) !== null) {
      const frIds = match[1].match(frPattern) || [];
      traces.push(...frIds);
    }

    const tracedRequirements = [...new Set(traces)];

    // Validate coverage
    const missing = srsRequirements.filter(
      (fr) => !tracedRequirements.includes(fr),
    );

    if (missing.length > 0) {
      console.warn(
        `⚠️  Trace Matrix: ${missing.length} FRs not traced in human DD`,
      );
      console.warn(`   Missing: ${missing.join(", ")}`);
    }

    // Build matrix (FR → Component → Checkpoint)
    const matrix = {};
    srsRequirements.forEach((fr) => {
      matrix[fr] = this.findComponentsForFR(humanDD, fr);
    });

    return {
      total: srsRequirements.length,
      traced: tracedRequirements.length,
      coverage:
        srsRequirements.length > 0
          ? Math.round((tracedRequirements.length / srsRequirements.length) * 100)
          : 0,
      matrix,
    };
  }

  /**
   * Find components that implement a specific FR
   */
  findComponentsForFR(humanDD, frId) {
    const componentPattern = /^## (\d+)\.\s+(.+?)$/gm;
    const components = [];
    let match;

    // Reset regex lastIndex
    componentPattern.lastIndex = 0;

    while ((match = componentPattern.exec(humanDD)) !== null) {
      const sectionNum = match[1];
      const componentName = match[2].replace(/[*_`]/g, "").trim();
      const sectionStart = match.index;
      const nextSection = humanDD.indexOf("\n## ", sectionStart + 1);
      const sectionContent = humanDD.substring(
        sectionStart,
        nextSection > 0 ? nextSection : humanDD.length,
      );

      // Check if this section traces to the FR
      if (sectionContent.includes(frId)) {
        const checkpointMatch = sectionContent.match(/Checkpoint[:\s]+C(\d+)/i);
        components.push({
          section: sectionNum,
          name: componentName,
          checkpoint: checkpointMatch ? `C${checkpointMatch[1]}` : "N/A",
        });
      }
    }

    return components;
  }

  /**
   * Extract components using regex-based section parser
   * Implements: DD Decision 1 (Regex-based Section Parser)
   */
  extractComponents(humanDD) {
    const componentPattern = /^## (\d+)\.\s+(.+?)$/gm;
    const components = [];
    let match;

    // Reset regex lastIndex
    componentPattern.lastIndex = 0;

    while ((match = componentPattern.exec(humanDD)) !== null) {
      const sectionNum = match[1];
      const componentName = match[2].replace(/[*_`]/g, "").trim();
      const sectionStart = match.index;
      const nextSection = humanDD.indexOf("\n## ", sectionStart + 1);
      const sectionContent = humanDD.substring(
        sectionStart,
        nextSection > 0 ? nextSection : humanDD.length,
      );

      // Parse component structure
      const component = {
        id: `COMP-${sectionNum}`,
        name: componentName,
        purpose: this.extractPurpose(sectionContent),
        tracesTo: this.extractTracesTo(sectionContent),
        interfaces: this.extractInterfaces(sectionContent),
        implementation: this.extractImplementation(sectionContent),
        checkpoint: this.extractCheckpoint(sectionContent),
      };

      components.push(component);
    }

    return components;
  }

  /**
   * Extract purpose/description from section
   */
  extractPurpose(section) {
    // Try to find explicit purpose
    const purposeMatch = section.match(
      /\*\*(?:Purpose|Description|Overview)\*\*[:\s]+([^\n]+)/i,
    );
    if (purposeMatch) {
      return purposeMatch[1].trim();
    }

    // Fall back to first paragraph after heading
    const lines = section.split("\n").slice(1);
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith("#") &&
        !trimmed.startsWith("|") &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("```")
      ) {
        return trimmed.substring(0, 200);
      }
    }

    return "No purpose specified";
  }

  /**
   * Extract Traces To references
   */
  extractTracesTo(section) {
    const frPattern = /FR-[A-Z]+-\d+/g;
    const matches = section.match(frPattern) || [];
    return [...new Set(matches)];
  }

  /**
   * Extract interfaces (exports and dependencies)
   */
  extractInterfaces(section) {
    const interfaces = {
      exports: [],
      dependencies: [],
    };

    // Extract exports (class names, function names)
    const classMatch = section.match(/(?:class|interface)\s+(\w+)/gi);
    if (classMatch) {
      interfaces.exports = classMatch.map((m) => m.split(/\s+/)[1]);
    }

    // Extract dependencies (imports, requires)
    const importMatch = section.match(
      /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/gi,
    );
    if (importMatch) {
      interfaces.dependencies = importMatch.map((m) => {
        const match = m.match(/['"]([^'"]+)['"]/);
        return match ? match[1] : m;
      });
    }

    return interfaces;
  }

  /**
   * Extract implementation pseudo-code from section
   */
  extractImplementation(section) {
    const lines = [];
    const codeBlocks = section.match(/```[\s\S]*?```/g) || [];

    // Extract pseudo-code patterns
    const methodPattern =
      /(?:METHOD|FUNCTION|async\s+)?(\w+)\s*\(([^)]*)\)[:\s]*(?:->|=>|returns?)?\s*(\w+)?/gi;
    let match;

    while ((match = methodPattern.exec(section)) !== null) {
      const methodName = match[1];
      const params = match[2] || "";
      const returnType = match[3] || "void";

      // Skip common false positives
      if (
        ["if", "for", "while", "switch", "catch"].includes(
          methodName.toLowerCase(),
        )
      ) {
        continue;
      }

      lines.push(`    METHOD ${methodName}(${params}):`);
      lines.push(`      RETURNS ${returnType}`);
    }

    // Extract STEP patterns
    const stepPattern = /STEP\s+(\d+)[:\s]+(.+)/gi;
    while ((match = stepPattern.exec(section)) !== null) {
      lines.push(`      STEP ${match[1]}: ${match[2].trim()}`);
    }

    // Extract validation patterns
    const validatePattern = /VALIDATE[:\s]+(.+)/gi;
    while ((match = validatePattern.exec(section)) !== null) {
      lines.push(`      VALIDATE: ${match[1].trim()}`);
    }

    return lines.length > 0 ? lines.join("\n") : "    // Implementation details in human DD";
  }

  /**
   * Extract checkpoint from section
   */
  extractCheckpoint(section) {
    const checkpointMatch = section.match(/(?:Checkpoint|Gate)[:\s]+C?(\d+)/i);
    return checkpointMatch ? `C${checkpointMatch[1]}` : "N/A";
  }

  /**
   * Extract error handling section
   */
  extractErrorHandling(humanDD) {
    const lines = [];

    // Find error handling section
    const errorSection = humanDD.match(
      /## (?:\d+\.\s+)?Error(?:\s+Handling)?[\s\S]*?(?=\n## |\n# |$)/i,
    );

    if (errorSection) {
      // Extract error types
      const errorTypePattern =
        /(?:\*\*|-)?\s*(\w+(?:Error|Exception))[:\s]+(.+)/gi;
      let match;

      lines.push("ERROR_TYPES:");
      while ((match = errorTypePattern.exec(errorSection[0])) !== null) {
        lines.push(`  ${match[1]}:`);
        lines.push(`    DESCRIPTION: ${match[2].trim()}`);
      }
    } else {
      lines.push("ERROR_TYPES:");
      lines.push("  // No explicit error handling section found in human DD");
    }

    return lines.join("\n");
  }

  /**
   * Extract integration points
   */
  extractIntegrationPoints(humanDD) {
    const lines = [];

    // Extract API endpoints
    const apiPattern = /(?:GET|POST|PUT|DELETE|PATCH)\s+([/\w{}-]+)/gi;
    const apis = [];
    let match;

    while ((match = apiPattern.exec(humanDD)) !== null) {
      apis.push({ method: match[0].split(" ")[0], path: match[1] });
    }

    if (apis.length > 0) {
      lines.push("API_ENDPOINTS:");
      apis.forEach((api) => {
        lines.push(`  ${api.method} ${api.path}`);
      });
    } else {
      lines.push("API_ENDPOINTS:");
      lines.push("  N/A (No HTTP endpoints in this component)");
    }

    // Extract external services
    lines.push("");
    lines.push("EXTERNAL_SERVICES:");

    const servicePattern = /(?:Service|Client|Provider)[:\s]+(\w+)/gi;
    const services = [];
    while ((match = servicePattern.exec(humanDD)) !== null) {
      services.push(match[1]);
    }

    if (services.length > 0) {
      [...new Set(services)].forEach((svc) => {
        lines.push(`  ${svc}:`);
        lines.push(`    TYPE: Service`);
      });
    } else {
      lines.push("  N/A (No external services)");
    }

    // Extract file operations
    lines.push("");
    lines.push("FILE_OPERATIONS:");

    const filePattern = /(?:read|write|save|load)(?:File|Config|Data)?/gi;
    const fileOps = humanDD.match(filePattern) || [];

    if (fileOps.length > 0) {
      [...new Set(fileOps)].forEach((op) => {
        lines.push(`  ${op}:`);
        lines.push(`    TYPE: ${op.toLowerCase().includes("read") ? "read" : "write"}`);
      });
    } else {
      lines.push("  N/A (No file operations)");
    }

    return lines.join("\n");
  }

  /**
   * Extract DD-SECTION boundaries from human DD content
   * @param {string} content - Human DD markdown content
   * @returns {Array<{sectionId: string, startLine: number, endLine: number, lineCount: number}>}
   */
  extractSectionBoundaries(content) {
    const boundaries = [];
    const lines = content.split("\n");
    const startRegex = /<!-- DD-SECTION:\s*([\w][\w-]*)\s*-->/;
    const endRegex = /<!-- DD-SECTION-END:\s*([\w][\w-]*)\s*-->/;

    let currentSection = null;
    let currentStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const startMatch = lines[i].match(startRegex);
      const endMatch = lines[i].match(endRegex);

      if (startMatch) {
        // Close previous section if open (handles missing DD-SECTION-END)
        if (currentSection) {
          boundaries.push({
            sectionId: currentSection,
            startLine: currentStart,
            endLine: i - 1,
            lineCount: i - currentStart,
          });
        }
        currentSection = startMatch[1];
        currentStart = i;
      } else if (endMatch && currentSection === endMatch[1]) {
        boundaries.push({
          sectionId: currentSection,
          startLine: currentStart,
          endLine: i,
          lineCount: i - currentStart + 1,
        });
        currentSection = null;
      }
    }

    // Close last section if still open
    if (currentSection) {
      boundaries.push({
        sectionId: currentSection,
        startLine: currentStart,
        endLine: lines.length - 1,
        lineCount: lines.length - currentStart,
      });
    }

    return boundaries; // ordered by document position
  }

  /**
   * Assemble final pseudo-code document
   */
  assemblePseudoCode({
    meta,
    traceMatrix,
    components,
    errorHandling,
    integrationPoints,
  }) {
    const output = [];

    // Header
    output.push("# PSEUDO-CODE DETAIL DESIGN");
    output.push("");

    // META Section
    output.push("## META");
    output.push("");
    output.push(`FEATURE_ID: ${meta.featureId}`);
    output.push(`DOC_TYPE: ${meta.docType}`);
    output.push(`VERSION: ${meta.version}`);
    output.push(`GENERATED: ${meta.generatedDate}`);
    output.push(`SOURCE: ${meta.sourceDocument}`);
    output.push(`HUMAN_DD_LINES: ${meta.humanDDLines}`);
    output.push(`PSEUDO_LINES: [CALCULATED_AFTER]`);
    output.push(`COMPRESSION_RATIO: [CALCULATED_AFTER]`);
    output.push("");

    // TRACE_MATRIX Section
    output.push("## TRACE_MATRIX");
    output.push("");
    output.push(`TOTAL_REQUIREMENTS: ${traceMatrix.total}`);
    output.push(`TRACED_REQUIREMENTS: ${traceMatrix.traced}`);
    output.push(`COVERAGE: ${traceMatrix.coverage}%`);
    output.push("");
    output.push("MAPPING:");
    Object.entries(traceMatrix.matrix).forEach(([fr, comps]) => {
      if (comps.length > 0) {
        comps.forEach((comp) => {
          output.push(`  ${fr} -> ${comp.name} -> ${comp.checkpoint}`);
        });
      } else {
        output.push(`  ${fr} -> [NOT_TRACED]`);
      }
    });
    output.push("");

    // COMPONENTS Section
    output.push("## COMPONENTS");
    components.forEach((comp) => {
      output.push("");
      output.push(`COMPONENT ${comp.name}`);
      output.push(`  PURPOSE: ${comp.purpose}`);
      if (comp.tracesTo.length > 0) {
        output.push(`  TRACES_TO: ${comp.tracesTo.join(", ")}`);
      }
      output.push("");
      output.push(`  INTERFACES:`);
      if (comp.interfaces.exports.length > 0) {
        output.push(`    EXPORTS: ${comp.interfaces.exports.join(", ")}`);
      } else {
        output.push(`    EXPORTS: N/A`);
      }
      if (comp.interfaces.dependencies.length > 0) {
        output.push(`    DEPENDENCIES: ${comp.interfaces.dependencies.join(", ")}`);
      } else {
        output.push(`    DEPENDENCIES: N/A`);
      }
      output.push("");
      output.push(`  IMPLEMENTATION:`);
      output.push(comp.implementation);
      output.push("");
      output.push(`  CHECKPOINT: ${comp.checkpoint}`);
    });
    output.push("");

    // ERROR_HANDLING Section
    output.push("## ERROR_HANDLING");
    output.push("");
    output.push(errorHandling);
    output.push("");

    // INTEGRATION_POINTS Section
    output.push("## INTEGRATION_POINTS");
    output.push("");
    output.push(integrationPoints);
    output.push("");

    // Footer
    output.push("---");
    output.push(`*Generated by PseudoCodeGenerator v1.0*`);
    output.push(`*EPS Framework v5.2*`);
    output.push(`*Created: ${meta.generatedDate}*`);

    // Calculate final stats and update placeholders
    const result = output.join("\n");
    const pseudoLines = result.split("\n").length;
    const compressionRatio = Math.round((1 - pseudoLines / meta.humanDDLines) * 100);

    return result
      .replace("[CALCULATED_AFTER]", pseudoLines.toString())
      .replace("[CALCULATED_AFTER]", `${compressionRatio}%`);
  }

  /**
   * Assemble master pseudo file (META + TRACE_MATRIX + SECTION_MAP + SHARED_CONTEXT)
   */
  assembleMasterPseudo(components, boundaries, humanDD) {
    const meta = this.extractMeta(humanDD);
    const srs = fs.readFileSync(this.srsPath, "utf8");
    const traceMatrix = this.generateTraceMatrix(humanDD, srs);
    const prefix = this.docType === "BACKEND_DD" ? "backend-detail-design" : "frontend-detail-design";

    const lines = [];
    lines.push("# PSEUDO-CODE DETAIL DESIGN");
    lines.push("");
    lines.push("## META");
    lines.push(`FEATURE_ID: ${meta.featureId}`);
    lines.push(`DOC_TYPE: ${this.docType}`);
    lines.push(`VERSION: ${meta.version}`);
    lines.push(`GENERATED: ${meta.generatedDate}`);
    lines.push(`SOURCE: ${meta.sourceDocument}`);
    lines.push(`SPLIT_MODE: multi-file`);
    lines.push(`SECTION_COUNT: ${boundaries.length}`);
    lines.push(`TOTAL_COMPONENTS: ${components.length}`);
    lines.push("");

    // TRACE_MATRIX
    lines.push("## TRACE_MATRIX");
    lines.push(`TOTAL_REQUIREMENTS: ${traceMatrix.total}`);
    lines.push(`TRACED_REQUIREMENTS: ${traceMatrix.traced}`);
    lines.push(`COVERAGE: ${traceMatrix.coverage}%`);
    lines.push("");

    // SECTION_MAP
    lines.push("SECTION_MAP:");
    for (const boundary of boundaries) {
      const pseudoFile = `${meta.featureId}-${prefix}-${boundary.sectionId}.pseudo`;
      const sectionComps = components
        .filter(c => c.sectionId === boundary.sectionId)
        .map(c => c.name).join(", ");
      lines.push(`  ${boundary.sectionId.padEnd(20)} -> ${pseudoFile.padEnd(60)} (components: ${sectionComps || "none"})`);
    }
    lines.push("");

    // SHARED_CONTEXT (content before first marker)
    const firstMarkerIdx = humanDD.indexOf("<!-- DD-SECTION:");
    if (firstMarkerIdx > 0) {
      const shared = humanDD.substring(0, firstMarkerIdx).trim();
      lines.push("## SHARED_CONTEXT");
      lines.push("// Content before first DD-SECTION marker (always loaded)");
      const typeLines = shared.split("\n").filter(l =>
        l.match(/^(TYPES:|CONSTANTS:|SIZE_|EXECUTION_|\s+([\w]+):\s)/)
      );
      lines.push(typeLines.join("\n") || "// See human DD header");
    }

    lines.push("");
    lines.push("---");
    lines.push(`*Generated by PseudoCodeGenerator v1.0 (multi-file)*`);

    return lines.join("\n");
  }

  /**
   * Assemble section pseudo file
   */
  assembleSectionPseudo(sectionId, sectionComponents) {
    const lines = [];
    lines.push("## META");
    lines.push(`PARENT: ${path.basename(this.humanDDPath).replace(".md", ".pseudo")}`);
    lines.push(`SECTION_ID: ${sectionId}`);
    lines.push(`COMPONENT_COUNT: ${sectionComponents.length}`);
    lines.push("");
    lines.push("## COMPONENTS");

    for (const comp of sectionComponents) {
      lines.push("");
      lines.push(`COMPONENT ${comp.name}`);
      lines.push(comp.body);
    }

    return lines.join("\n");
  }

  /**
   * Save pseudo-code to file
   */
  async save(outputPath) {
    const pseudoCode = await this.generate();
    fs.writeFileSync(outputPath, pseudoCode, "utf8");

    console.log(`✅ Pseudo-code saved: ${outputPath}`);
    console.log(`   Human DD: ${this.stats.humanDDLines} lines`);
    console.log(`   Pseudo:   ${this.stats.pseudoLines} lines`);
    console.log(`   Compression: ${this.stats.compressionRatio}%`);

    return {
      outputPath,
      stats: this.stats,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.stats;
  }

  /**
   * Set split mode for multi-file pseudo generation
   * @param {string} mode - "single" or "multi-file"
   */
  setSplitMode(mode) {
    if (!["single", "multi-file"].includes(mode)) {
      throw new Error(`Invalid split mode: ${mode}. Use "single" or "multi-file"`);
    }
    this.splitMode = mode;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`Usage: node generator.js <human-dd-path> <srs-path> [--type FRONTEND_DD|BACKEND_DD] [--output <path>]`);
    console.log("");
    console.log("Options:");
    console.log("  --type    Document type: FRONTEND_DD or BACKEND_DD (default: FRONTEND_DD)");
    console.log("  --output  Output file path (default: <input>.pseudo)");
    process.exit(1);
  }

  const humanDDPath = args[0];
  const srsPath = args[1];

  // Parse options
  let docType = "FRONTEND_DD";
  let outputPath = humanDDPath.replace(/\.md$/, ".pseudo");

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--type" && args[i + 1]) {
      docType = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  // Validate inputs
  if (!fs.existsSync(humanDDPath)) {
    console.error(`❌ Human DD file not found: ${humanDDPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(srsPath)) {
    console.error(`❌ SRS file not found: ${srsPath}`);
    process.exit(1);
  }

  // Generate
  const generator = new PseudoCodeGenerator(humanDDPath, srsPath, docType);
  generator.save(outputPath).then(() => {
    console.log("");
    console.log("✅ Generation complete!");
  }).catch((err) => {
    console.error(`❌ Generation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = PseudoCodeGenerator;
