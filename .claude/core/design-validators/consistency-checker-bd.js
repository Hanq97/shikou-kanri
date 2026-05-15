#!/usr/bin/env node
/**
 * Consistency Checker for Basic Design Documents
 * Validates cross-section consistency (components, technologies)
 *
 * Usage: node consistency-checker-bd.js <file-path>
 * Output: Array of consistency issues { sections, issue, details }
 */

const fs = require('fs');

function extractSection(content, sectionTitle) {
  const regex = new RegExp(`###?\\s+${sectionTitle}([\\s\\S]*?)(?=###|$)`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}

function extractComponents(section) {
  // Extract component names from Service Layer or Mermaid diagram
  const componentRegex = /\b([A-Z][\w\s]+(?:Manager|Handler|Tracker|Service|Controller|Validator|Processor))\b/g;
  const matches = section.match(componentRegex) || [];
  return [...new Set(matches)]; // Unique components
}

function extractTechnologies(section) {
  // Extract technologies (PostgreSQL, Redis, RabbitMQ, Vault, etc.)
  const techRegex = /\b(PostgreSQL|MongoDB|Redis|RabbitMQ|Vault|Kafka|Elasticsearch|MinIO)\b/g;
  const matches = section.match(techRegex) || [];
  return [...new Set(matches)];
}

function checkConsistency(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  // Extract sections
  const section11 = extractSection(content, '1\\.1.*System Architecture');
  const section21 = extractSection(content, '2\\.1.*Component Diagram');
  const section22 = extractSection(content, '2\\.2.*Service Boundaries');

  // Check 1: Section 1.1 components = Section 2.1 components
  const components11 = extractComponents(section11);
  const components21 = extractComponents(section21);

  if (components11.length > 0 && components21.length > 0) {
    if (components11.length !== components21.length) {
      issues.push({
        sections: ['1.1', '2.1'],
        issue: 'Component count mismatch',
        details: `Section 1.1 has ${components11.length} components, Section 2.1 has ${components21.length} components`,
      });
    }

    const missing21 = components11.filter(c => !components21.includes(c));
    const extra21 = components21.filter(c => !components11.includes(c));

    if (missing21.length > 0) {
      issues.push({
        sections: ['1.1', '2.1'],
        issue: 'Components in 1.1 missing from 2.1',
        details: `Missing: ${missing21.join(', ')}`,
      });
    }

    if (extra21.length > 0) {
      issues.push({
        sections: ['1.1', '2.1'],
        issue: 'Extra components in 2.1 not in 1.1',
        details: `Extra: ${extra21.join(', ')}`,
      });
    }
  }

  // Check 2: Section 1.1 technologies = Section 2.2 infrastructure
  const tech11 = extractTechnologies(section11);
  const tech22 = extractTechnologies(section22);

  if (tech11.length > 0 && tech22.length > 0) {
    const missingTech22 = tech11.filter(t => !tech22.includes(t));
    if (missingTech22.length > 0) {
      issues.push({
        sections: ['1.1', '2.2'],
        issue: 'Technologies in 1.1 missing from 2.2 infrastructure',
        details: `Missing: ${missingTech22.join(', ')}`,
      });
    }
  }

  // Check 3: Section 2.1 components = Section 2.2 OWNS components
  const components22 = extractComponents(section22);

  if (components21.length > 0 && components22.length > 0) {
    const missing22 = components21.filter(c => !components22.includes(c));
    if (missing22.length > 0) {
      issues.push({
        sections: ['2.1', '2.2'],
        issue: 'Components in 2.1 missing from 2.2 OWNS',
        details: `Missing: ${missing22.join(', ')}`,
      });
    }
  }

  return issues;
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node consistency-checker-bd.js <file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const issues = checkConsistency(filePath);

  if (issues.length === 0) {
    console.log('✅ All cross-section consistency checks passed.');
    process.exit(0);
  } else {
    console.log(`❌ Found ${issues.length} consistency issues:\n`);

    issues.forEach((issue, i) => {
      console.log(`${i + 1}. [Sections ${issue.sections.join(' & ')}] ${issue.issue}`);
      console.log(`   Details: ${issue.details}\n`);
    });

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkConsistency };
