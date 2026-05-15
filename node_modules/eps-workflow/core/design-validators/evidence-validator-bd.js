#!/usr/bin/env node
/**
 * Evidence Validator for Basic Design Documents
 * Validates FR/NFR linkage and coverage
 *
 * Usage: node evidence-validator-bd.js <bd-file> <srs-file>
 * Output: Array of evidence issues { type, details, suggestion }
 */

const fs = require('fs');

function extractFRs(srsContent) {
  // Extract FR-XXX-YYY pattern from SRS
  const frRegex = /FR-[A-Z]{3,4}-\d{3}/g;
  const matches = srsContent.match(frRegex) || [];
  return [...new Set(matches)];
}

function extractNFRs(srsContent) {
  // Extract NFR-XXX-YYY pattern from SRS
  const nfrRegex = /NFR-[A-Z]{3,4}-\d{3}/g;
  const matches = srsContent.match(nfrRegex) || [];
  return [...new Set(matches)];
}

function extractComponentFRMappings(bdContent) {
  // Extract component → FR mappings from Section 2.2 or comments
  const section22 = extractSection(bdContent, '2\\.2.*Service Boundaries');
  const componentRegex = /([A-Z][\w\s]+(?:Manager|Handler|Tracker|Service|Controller)).*?(FR-[A-Z]{3,4}-\d{3}(?:,\s*FR-[A-Z]{3,4}-\d{3})*)/g;
  const mappings = {};

  let match;
  while ((match = componentRegex.exec(section22)) !== null) {
    const component = match[1].trim();
    const frs = match[2].split(',').map(fr => fr.trim());
    mappings[component] = frs;
  }

  return mappings;
}

function extractPatternNFRMappings(bdContent) {
  // Extract pattern → NFR mappings from Section 1.2
  const section12 = extractSection(bdContent, '1\\.2.*Architectural Patterns');
  const patternRegex = /([A-Z][\w\s-]+).*?(NFR-[A-Z]{3,4}-\d{3})/g;
  const mappings = {};

  let match;
  while ((match = patternRegex.exec(section12)) !== null) {
    const pattern = match[1].trim();
    const nfr = match[2];
    if (!mappings[pattern]) mappings[pattern] = [];
    mappings[pattern].push(nfr);
  }

  return mappings;
}

function extractSection(content, sectionTitle) {
  const regex = new RegExp(`###?\\s+${sectionTitle}([\\s\\S]*?)(?=###|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function validateEvidence(bdPath, srsPath) {
  const bdContent = fs.readFileSync(bdPath, 'utf-8');
  const srsContent = fs.readFileSync(srsPath, 'utf-8');
  const issues = [];

  // Extract FRs and NFRs from SRS
  const allFRs = extractFRs(srsContent);
  const allNFRs = extractNFRs(srsContent);

  // Extract mappings from BD
  const componentFRs = extractComponentFRMappings(bdContent);
  const patternNFRs = extractPatternNFRMappings(bdContent);

  // Check 1: Each component has ≥2 FRs
  Object.entries(componentFRs).forEach(([component, frs]) => {
    if (frs.length < 2) {
      issues.push({
        type: 'Component FR Coverage',
        details: `${component} only implements ${frs.length} FR(s): ${frs.join(', ')}`,
        suggestion: 'Each component should implement ≥2 FRs. Merge small components or add FRs.',
      });
    }
  });

  // Check 2: Each pattern has ≥1 NFR
  Object.entries(patternNFRs).forEach(([pattern, nfrs]) => {
    if (nfrs.length === 0) {
      issues.push({
        type: 'Pattern NFR Justification',
        details: `${pattern} has no NFR justification`,
        suggestion: 'Link pattern to specific NFR from SRS or remove if not needed.',
      });
    }
  });

  // Check 3: All FRs covered
  const coveredFRs = Object.values(componentFRs).flat();
  const uncoveredFRs = allFRs.filter(fr => !coveredFRs.includes(fr));
  if (uncoveredFRs.length > 0) {
    issues.push({
      type: 'FR Coverage Gap',
      details: `${uncoveredFRs.length} FRs not covered by any component: ${uncoveredFRs.slice(0, 5).join(', ')}${uncoveredFRs.length > 5 ? '...' : ''}`,
      suggestion: 'Create components to cover these FRs or update SRS if FRs removed.',
    });
  }

  // Check 4: All NFRs addressed
  const addressedNFRs = Object.values(patternNFRs).flat();
  const unaddressedNFRs = allNFRs.filter(nfr => !addressedNFRs.includes(nfr));
  if (unaddressedNFRs.length > 0) {
    issues.push({
      type: 'NFR Coverage Gap',
      details: `${unaddressedNFRs.length} NFRs not addressed: ${unaddressedNFRs.slice(0, 5).join(', ')}${unaddressedNFRs.length > 5 ? '...' : ''}`,
      suggestion: 'Add patterns/technologies to address these NFRs or update SRS.',
    });
  }

  // Summary stats
  const frCoverage = allFRs.length > 0 ? ((coveredFRs.length / allFRs.length) * 100).toFixed(0) : 0;
  const nfrCoverage = allNFRs.length > 0 ? ((addressedNFRs.length / allNFRs.length) * 100).toFixed(0) : 0;

  return { issues, stats: { frCoverage, nfrCoverage, totalFRs: allFRs.length, totalNFRs: allNFRs.length } };
}

function main() {
  const bdPath = process.argv[2];
  const srsPath = process.argv[3];

  if (!bdPath || !srsPath) {
    console.error('Usage: node evidence-validator-bd.js <bd-file> <srs-file>');
    process.exit(1);
  }

  if (!fs.existsSync(bdPath) || !fs.existsSync(srsPath)) {
    console.error('File not found');
    process.exit(1);
  }

  const result = validateEvidence(bdPath, srsPath);
  const { issues, stats } = result;

  console.log(`\n📊 Evidence Coverage Stats:`);
  console.log(`   FR Coverage: ${stats.frCoverage}% (${stats.totalFRs} total FRs)`);
  console.log(`   NFR Coverage: ${stats.nfrCoverage}% (${stats.totalNFRs} total NFRs)\n`);

  if (issues.length === 0) {
    console.log('✅ All evidence linkage checks passed.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${issues.length} evidence linkage issues:\n`);

    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.type}]`);
      console.log(`   Details: ${issue.details}`);
      console.log(`   Suggestion: ${issue.suggestion}\n`);
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEvidence };
