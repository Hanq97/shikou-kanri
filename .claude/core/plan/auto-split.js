#!/usr/bin/env node

/**
 * Plan Auto-Split Engine v1.0
 *
 * Core algorithms for splitting DD pseudo-code into sub-plans:
 * - parsePseudoMeta: Parse SPLIT_MODE + SECTION_MAP from master pseudo
 * - buildSectionOrder: Document-order section sequencing (section-agnostic)
 * - groupBySizeConstraint: Group sections into sub-plans by token limits
 * - generateMasterPlanIndex: Generate master plan index < 200 lines
 * - estimatePlanSize: Heuristic plan size estimation
 *
 * Design refs: C3 (PlanAutoSplitEngine), C4 (SectionOrderBuilder),
 *              C5 (MasterPlanIndexGenerator), C6 (SizeConstraintGrouper)
 * Evidence: E5, E13 (algorithm fix), E22 (sequential), E23 (section-agnostic)
 *
 * Created: 2026-03-01
 * EPS Framework v3.2
 */

// fs/path available if needed by callers extending this module

const SIZE_THRESHOLDS = { ddSplitLines: 300, planSplitLines: 600, minSectionLines: 50 };
const SIZE_CONSTRAINTS = { minTokens: 400, maxTokens: 1600 };

/**
 * Parse META + SECTION_MAP from master pseudo content (C8/C10)
 * @param {string} content - Master pseudo file content
 * @returns {{ meta: Object, sectionMap: Map<string, {pseudoFile: string, components: string}> }}
 */
function parsePseudoMeta(content) {
  const meta = {};
  const metaMatch = content.match(/## META\n([\s\S]*?)(?=\n##)/);
  if (metaMatch) {
    for (const line of metaMatch[1].split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim();
        if (key && val) meta[key] = val;
      }
    }
  }

  const sectionMap = new Map();
  const mapMatch = content.match(/SECTION_MAP:\n([\s\S]*?)(?=\n[A-Z]|\n##|$)/);
  if (mapMatch) {
    for (const line of mapMatch[1].split("\n")) {
      const m = line.match(/\s+(\S+)\s+->\s+(\S+)\s+\(components:\s*(.+)\)/);
      if (m) sectionMap.set(m[1], { pseudoFile: m[2], components: m[3] });
    }
  }

  return { meta, sectionMap };
}

/**
 * Build section order from document order (C4)
 * Sequential execution, no layer assumptions — works with any DD structure (E22, E23)
 * @param {Map} sectionMap - SECTION_MAP from master pseudo
 * @param {Array<{sectionId: string}>} boundaries - Section boundaries (document order)
 * @returns {string[]} - Ordered section IDs
 */
function buildSectionOrder(sectionMap, boundaries) {
  return boundaries.map(b => b.sectionId);
}

/**
 * Group sections into sub-plans by size constraints (C6)
 * Algorithm order: oversized FIRST → group overflow → append (E13 fix)
 * @param {string[]} sectionOrder - Ordered section IDs
 * @param {Map<string, number>} sectionTokens - Token count per section
 * @param {{ minTokens: number, maxTokens: number }} constraints
 * @returns {Array<{ spId: string, title: string, sections: string[], totalTokens: number }>}
 */
function groupBySizeConstraint(sectionOrder, sectionTokens, constraints) {
  const groups = [];
  let cur = { sections: [], totalTokens: 0 };

  for (const sid of sectionOrder) {
    const tokens = sectionTokens.get(sid) || 0;

    // STEP 2.1: FIRST — handle oversized single section (E13 fix)
    if (tokens > constraints.maxTokens) {
      if (cur.sections.length > 0) {
        groups.push(cur);
        cur = { sections: [], totalTokens: 0 };
      }
      groups.push({ sections: [sid], totalTokens: tokens });

    // STEP 2.2: SECOND — current group would overflow
    } else if (cur.totalTokens + tokens > constraints.maxTokens) {
      groups.push(cur);
      cur = { sections: [sid], totalTokens: tokens };

    // STEP 2.3: THIRD — fits in current group
    } else {
      cur.sections.push(sid);
      cur.totalTokens += tokens;
    }
  }

  if (cur.sections.length > 0) groups.push(cur);

  // Merge undersized groups with adjacent
  const merged = [];
  for (const g of groups) {
    if (merged.length > 0 && g.totalTokens < constraints.minTokens) {
      const prev = merged[merged.length - 1];
      if (prev.totalTokens + g.totalTokens <= constraints.maxTokens) {
        prev.sections.push(...g.sections);
        prev.totalTokens += g.totalTokens;
        continue;
      }
    }
    merged.push(g);
  }

  // Assign SP IDs
  merged.forEach((g, i) => {
    g.spId = `SP-${i + 1}`;
    g.title = g.sections.join(" + ");
  });

  return merged;
}

/**
 * Estimate plan size from section count (C3)
 * Heuristic: ~40 lines per section + 30 overhead
 * @param {Map} sectionMap - SECTION_MAP from master pseudo
 * @returns {number} - Estimated total plan lines
 */
function estimatePlanSize(sectionMap) {
  return sectionMap.size * 40 + 30;
}

/**
 * Generate master plan index < 200 lines (C5)
 * Contains: header, sub-plan registry, execution order, shared definitions
 * @param {Array} groups - Sub-plan groups from groupBySizeConstraint
 * @param {Object} sharedContext - Feature context (innovate-selection, evidence summary)
 * @param {string} feature - Feature ID
 * @param {string} innovateSelection - Innovate selection summary (trimmed)
 * @returns {string} - Master plan markdown content
 */
function generateMasterPlanIndex(groups, sharedContext, feature, innovateSelection) {
  const lines = [];

  // Header
  lines.push(`# Implementation Plan: ${feature}`);
  lines.push("");
  lines.push("> **planStructure: multi-sub-plan**");
  lines.push(`> **Confidence**: ${sharedContext.confidence || "N/A"}`);
  lines.push(`> **Status**: APPROVED`);
  lines.push(`> **Created**: ${new Date().toISOString().split("T")[0]}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Feature Summary (compact)
  lines.push("## 0. Feature Summary");
  lines.push("");
  if (sharedContext.summary) {
    lines.push(sharedContext.summary);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Sub-Plan Registry
  lines.push("## 2. Sub-Plan Registry");
  lines.push("");
  lines.push("| SP# | Title | Sections | Deps | Status |");
  lines.push("|-----|-------|----------|------|--------|");
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const deps = i === 0 ? "—" : `SP-${i}`;
    lines.push(`| ${g.spId} | ${g.title} | ${g.sections.join(", ")} | ${deps} | pending |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Execution Order
  lines.push("## 3. Execution Order");
  lines.push("");
  lines.push(`Sequential: ${groups.map(g => g.spId).join(" → ")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Shared Definitions (compact)
  if (sharedContext.definitions) {
    lines.push("## 6. Shared Definitions");
    lines.push("");
    lines.push("```");
    lines.push(sharedContext.definitions);
    lines.push("```");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push(`*Plan generated: ${new Date().toISOString().split("T")[0]} — EPS Framework*`);

  // Enforce < 200 line limit
  const result = lines.join("\n");
  if (result.split("\n").length > 200) {
    // Trim shared definitions to fit
    const trimIdx = result.lastIndexOf("## 6. Shared Definitions");
    if (trimIdx > 0) {
      return result.substring(0, trimIdx) + "## 6. Shared Definitions\n\n*Trimmed for size — see DD for details*\n\n---\n";
    }
  }

  return result;
}

/**
 * Validate master plan (C17)
 * Checks: ≤200 lines, marker present, 3-10 sub-plans
 */
function validateMasterPlan(content) {
  const errors = [];
  const lines = content.split("\n").length;
  if (lines > 200) errors.push(`Master ${lines} lines > 200`);
  if (!content.includes("planStructure: multi-sub-plan")) errors.push("Missing planStructure marker");
  const registry = parseSPRegistry(content);
  if (registry.length < 3) errors.push(`${registry.length} sub-plans < 3 min`);
  if (registry.length > 10) errors.push(`${registry.length} sub-plans > 10 max`);
  return { valid: errors.length === 0, errors, lineCount: lines, subPlanCount: registry.length };
}

/**
 * Parse Sub-Plan Registry from master plan (reused from execute.md spec)
 */
function parseSPRegistry(content) {
  const lines = content.split("\n");
  let tableStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^##\s+(?:\d+\.\s+)?Sub-Plan Registry/)) {
      // Skip blank lines between header and table
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith("|")) { tableStart = j; break; }
        if (lines[j].trim() === "") continue;
        break; // Non-blank, non-table line — no table found
      }
      break;
    }
  }
  if (tableStart < 0) return [];

  const registry = [];
  let rowIndex = 0;
  for (let i = tableStart; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) break;
    rowIndex++;
    if (rowIndex <= 2) continue; // Skip header + separator

    const cols = lines[i].split("|").map(c => c.trim()).filter(c => c.length > 0);

    // Support both 5-col (SP#,Title,Sections,Deps,Status) and 7-col (+Files,Methods)
    if (cols.length >= 7) {
      registry.push({
        spId: cols[0], title: cols[1],
        sections: cols[2].split(",").map(s => s.trim()),
        files: parseInt(cols[3]) || 0, methods: parseInt(cols[4]) || 0,
        deps: cols[5] === "—" ? [] : cols[5].split(",").map(s => s.trim()),
        status: cols[6],
      });
    } else if (cols.length >= 5) {
      registry.push({
        spId: cols[0], title: cols[1],
        sections: cols[2].split(",").map(s => s.trim()),
        deps: cols[3] === "—" ? [] : cols[3].split(",").map(s => s.trim()),
        status: cols[4],
      });
    }
  }
  return registry;
}

/**
 * Validate sub-plan (C17)
 * Checks: ≤400 lines, has WHY/WHAT/HOW, file refs, acceptance criteria
 */
function validateSubPlan(content) {
  const errors = [];
  const lines = content.split("\n").length;
  if (lines > 400) errors.push(`Sub-plan ${lines} lines > 400`);
  for (const section of ["## WHY", "## WHAT", "## HOW"]) {
    if (!content.includes(section)) errors.push(`Missing ${section}`);
  }
  if (!(content.match(/`[^`]+\.(js|ts|md|json|pseudo)`/g) || []).length) errors.push("No file refs");
  if (!(content.match(/- \[ \]/g) || []).length) errors.push("No acceptance criteria");
  return { valid: errors.length === 0, errors, lineCount: lines };
}

module.exports = {
  parsePseudoMeta,
  buildSectionOrder,
  groupBySizeConstraint,
  generateMasterPlanIndex,
  estimatePlanSize,
  validateMasterPlan,
  validateSubPlan,
  parseSPRegistry,
  SIZE_THRESHOLDS,
  SIZE_CONSTRAINTS,
};
