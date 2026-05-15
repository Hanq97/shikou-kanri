"use strict";

/**
 * design-parse — Parse design document sections (SRS, BD, DD)
 *
 * Args:
 *   --file <path>     Design document file to parse (required)
 *   --section <name>  Extract specific section by heading (optional)
 *   --type <srs|bd|dd>  Hint for document type (optional)
 *
 * Returns: { docType, status, sections, extracted?, featureId }
 */

const fs = require("fs");
const path = require("path");

// Pattern to detect doc type from filename or content
function detectDocType(filePath, content) {
  const name = path.basename(filePath).toLowerCase();
  if (name.includes("srs") || name.includes("requirements")) return "srs";
  if (name.includes("basic-design") || name.includes("bd")) return "bd";
  if (name.includes("detail-design") || name.includes("dd") || name.includes("fdd")) return "dd";
  // Detect from content headers
  if (content.includes("# SRS") || content.includes("Software Requirements")) return "srs";
  if (content.includes("# Basic Design") || content.includes("Basic Design")) return "bd";
  if (content.includes("# Detail Design") || content.includes("Detail Design")) return "dd";
  return "unknown";
}

function parseSections(content) {
  const sections = [];
  const lines = content.split("\n");
  let currentSection = null;
  let currentLines = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h2Match) {
      if (currentSection) {
        sections.push({ heading: currentSection, level: 2, content: currentLines.join("\n").trim() });
      }
      currentSection = h2Match[1].trim();
      currentLines = [];
    } else if (h3Match) {
      if (currentSection) {
        sections.push({ heading: currentSection, level: 3, content: currentLines.join("\n").trim() });
      }
      currentSection = h3Match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentSection) {
    sections.push({ heading: currentSection, level: 2, content: currentLines.join("\n").trim() });
  }

  return sections;
}

function extractApprovalStatus(content) {
  const patterns = [
    /Status:\s*(APPROVED|DRAFT|REVIEW|REJECTED)/i,
    /\*\*Status\*\*:\s*(APPROVED|DRAFT|REVIEW|REJECTED)/i,
  ];
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m) return m[1].toUpperCase();
  }
  return "UNKNOWN";
}

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const filePath = args.file
      ? (path.isAbsolute(args.file) ? args.file : path.join(pkgRoot, args.file))
      : null;

    if (!filePath) {
      return { error: "design-parse requires --file <path>" };
    }

    if (!fs.existsSync(filePath)) {
      return { error: `File not found: ${filePath}`, found: false };
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const docType = args.type || detectDocType(filePath, content);
      const status = extractApprovalStatus(content);
      const sections = parseSections(content);

      // Extract a specific section if requested
      let extracted = null;
      if (args.section) {
        const sectionName = args.section.toLowerCase();
        const match = sections.find((s) => s.heading.toLowerCase().includes(sectionName));
        extracted = match || null;
      }

      // Try to extract feature ID from filename or first heading
      const featureIdMatch = path.basename(filePath).match(/^([A-Z]{2,6}-[A-Z0-9]+)/);
      const featureId = featureIdMatch ? featureIdMatch[1] : null;

      return {
        found: true,
        docType,
        status,
        approved: status === "APPROVED",
        featureId,
        filePath,
        sectionCount: sections.length,
        sections: sections.map((s) => ({ heading: s.heading, level: s.level, length: s.content.length })),
        extracted,
      };
    } catch (err) {
      return { error: `design-parse failed: ${err.message}`, found: false };
    }
  },
};
