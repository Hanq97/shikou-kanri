#!/usr/bin/env node

/**
 * Research Dashboard
 * 研究ダッシュボード
 * Bảng Điều Khiển Nghiên Cứu
 *
 * Purpose: Display research metrics with ASCII visualization
 *
 * Features:
 * - Evidence quality metrics visualization
 * - Cross-validation statistics (multi-model)
 * - Model agreement rate
 * - Research depth analysis (deep research)
 * - Export to CSV/JSON
 *
 * @version 3.8.0
 * @date 2025-12-25
 */

const fs = require('fs');
const path = require('path');

/**
 * Research Dashboard
 * Visualizes research metrics for user
 */
class ResearchDashboard {
  constructor(options = {}) {
    this.options = {
      width: options.width || 60,
      showASCIICharts: options.showASCIICharts !== false,
      exportFormat: options.exportFormat || 'text', // text | json | csv
      ...options
    };
  }

  /**
   * Display research dashboard
   *
   * @param {Object} researchResults - Research results from engine
   * @param {string} mode - Research mode (standard | multi-model | deep | combined)
   */
  display(researchResults, mode = 'standard') {
    console.log('\n');
    this._printHeader('RESEARCH DASHBOARD');

    // Section 1: Research Summary
    this._printSection('RESEARCH SUMMARY', () => {
      this._printResearchSummary(researchResults, mode);
    });

    // Section 2: Evidence Distribution
    this._printSection('EVIDENCE DISTRIBUTION', () => {
      this._printEvidenceDistribution(researchResults);
    });

    // Section 3: Quality Breakdown
    this._printSection('QUALITY BREAKDOWN', () => {
      this._printQualityBreakdown(researchResults);
    });

    // Section 4: Cross-Validation (multi-model only)
    if (mode === 'multi-model' || mode === 'combined') {
      this._printSection('CROSS-VALIDATION', () => {
        this._printCrossValidation(researchResults);
      });
    }

    // Section 5: Depth Progression (deep research only)
    if (mode === 'deep' || mode === 'combined') {
      this._printSection('DEPTH PROGRESSION', () => {
        this._printDepthProgression(researchResults);
      });
    }

    // Section 6: Readiness Status
    this._printReadinessStatus(researchResults);

    console.log('\n');
  }

  /**
   * Print header
   * @private
   */
  _printHeader(title) {
    const width = this.options.width;
    const topBottom = '═'.repeat(width);
    const padding = ' '.repeat(Math.floor((width - title.length - 2) / 2));

    console.log(`╔${topBottom}╗`);
    console.log(`║${padding}${title}${padding}${title.length % 2 === 0 ? ' ' : ''}║`);
    console.log(`╚${topBottom}╝`);
  }

  /**
   * Print section
   * @private
   */
  _printSection(title, contentFn) {
    console.log(`\n📊 ${title}`);
    console.log('─'.repeat(this.options.width));
    contentFn();
  }

  /**
   * Print research summary
   * @private
   */
  _printResearchSummary(results, mode) {
    const modeDisplay = {
      standard: 'Standard (Single Model)',
      'multi-model': 'Multi-Model (Claude + Gemini)',
      deep: 'Deep Research (5 Iterations)',
      combined: 'Multi-Model Deep Research'
    };

    console.log(`Mode:              ${modeDisplay[mode] || mode}`);
    console.log(`Research Phase:    ${results.metadata?.researchPhase || 'N/A'}`);
    console.log(`Total Evidence:    ${results.evidence?.length || 0} pieces`);

    const avgQuality = this._calculateAvgQuality(results.evidence || []);
    console.log(`Avg Quality:       ${avgQuality}%  ${this._createBar(avgQuality)}`);

    if (mode === 'multi-model' || mode === 'combined') {
      const crossValRate = results.statistics?.crossValidationRate || 0;
      console.log(`Cross-Validation:  ${crossValRate}%  ${this._createBar(crossValRate)}`);
    }

    const researchTime = results.metrics?.totalTime || results.metrics?.synthesisTime || 0;
    console.log(`Research Time:     ${Math.round(researchTime / 1000)}s`);
  }

  /**
   * Print evidence distribution
   * @private
   */
  _printEvidenceDistribution(results) {
    const evidence = results.evidence || [];
    const total = evidence.length;

    if (total === 0) {
      console.log('No evidence collected yet');
      return;
    }

    const high = evidence.filter(e => e.crossValidation?.confidence === 'HIGH').length;
    const medium = evidence.filter(e => e.crossValidation?.confidence === 'MEDIUM').length;
    const low = evidence.filter(e => e.crossValidation?.confidence === 'LOW').length;

    const highPct = Math.round((high / total) * 100);
    const mediumPct = Math.round((medium / total) * 100);
    const lowPct = Math.round((low / total) * 100);

    console.log(`HIGH Confidence:    ${high} pieces  ${this._createBar(highPct)}  ${highPct}%`);
    console.log(`MEDIUM Confidence:  ${medium} pieces  ${this._createBar(mediumPct)}  ${mediumPct}%`);
    console.log(`LOW Confidence:     ${low} piece${low !== 1 ? 's' : ' '}  ${this._createBar(lowPct)}  ${lowPct}%`);
  }

  /**
   * Print quality breakdown
   * @private
   */
  _printQualityBreakdown(results) {
    const evidence = results.evidence || [];

    if (evidence.length === 0) {
      console.log('No evidence to analyze');
      return;
    }

    const avgQuality = this._calculateAvgQuality(evidence);
    const avgAuthority = this._calculateAvgScore(evidence, 'sourceAuthority');
    const avgRecency = this._calculateAvgScore(evidence, 'recency');
    const avgRelevance = this._calculateAvgScore(evidence, 'relevance');
    const avgDepth = this._calculateAvgScore(evidence, 'depth');
    const avgAccuracy = this._calculateAvgScore(evidence, 'accuracy');

    console.log(`Overall:      ${avgQuality}%  ${this._createBar(avgQuality)}`);
    console.log(`Authority:    ${avgAuthority}%  ${this._createBar(avgAuthority)}`);
    console.log(`Recency:      ${avgRecency}%  ${this._createBar(avgRecency)}`);
    console.log(`Relevance:    ${avgRelevance}%  ${this._createBar(avgRelevance)}`);
    console.log(`Depth:        ${avgDepth}%  ${this._createBar(avgDepth)}`);
    console.log(`Accuracy:     ${avgAccuracy}%  ${this._createBar(avgAccuracy)}`);
  }

  /**
   * Print cross-validation statistics
   * @private
   */
  _printCrossValidation(results) {
    const stats = results.statistics || {};

    const overlaps = stats.mergedCount || 0;
    const uniqueClaude = stats.uniqueClaudeCount || 0;
    const uniqueGemini = stats.uniqueGeminiCount || 0;
    const contradictions = stats.contradictionsCount || 0;
    const agreement = stats.crossValidationRate || 0;

    console.log(`Overlaps:          ${overlaps} pieces (both models agree)`);
    console.log(`Unique Claude:     ${uniqueClaude} pieces (Claude only)`);
    console.log(`Unique Gemini:     ${uniqueGemini} pieces (Gemini only)`);
    console.log(`Contradictions:    ${contradictions} piece${contradictions !== 1 ? 's' : ' '} (models disagree)`);
    console.log(`Model Agreement:   ${agreement}%`);
  }

  /**
   * Print depth progression
   * @private
   */
  _printDepthProgression(results) {
    const depthProg = results.depthProgression;

    if (!depthProg || !depthProg.progression) {
      console.log('No depth progression data available');
      return;
    }

    const progression = depthProg.progression;

    progression.forEach((iter, index) => {
      const depth = Math.round(iter.avgDepth || iter.avgQuality || 0);
      const goal = this._getIterationGoal(iter.iteration);
      console.log(`Iteration ${iter.iteration}:  ${depth}%  ${this._createBar(depth)}  ${goal}`);
    });

    const convergence = results.metrics?.convergenceIteration || results.iterations?.length || progression.length;
    const reason = results.stoppingReasons?.[0] || 'max iterations';
    console.log(`Convergence:  Iteration ${convergence} (${reason})`);
  }

  /**
   * Print readiness status
   * @private
   */
  _printReadinessStatus(results) {
    const evidence = results.evidence || [];
    const avgQuality = this._calculateAvgQuality(evidence);

    const isReady = evidence.length >= 3 && avgQuality >= 80;

    console.log('\n');
    if (isReady) {
      console.log('✅ READY FOR /innovate');
    } else {
      console.log('⚠️  NOT READY FOR /innovate');
      if (evidence.length < 3) {
        console.log(`  - Need more evidence (${evidence.length}/3 minimum)`);
      }
      if (avgQuality < 80) {
        console.log(`  - Need higher quality (${avgQuality}%/80% minimum)`);
      }
    }
  }

  /**
   * Create ASCII bar chart
   * @private
   */
  _createBar(percentage, width = 20) {
    if (!this.options.showASCIICharts) return '';

    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}]`;
  }

  /**
   * Calculate average quality
   * @private
   */
  _calculateAvgQuality(evidence) {
    if (evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + (e.quality?.overall || 0), 0);
    return Math.round(sum / evidence.length);
  }

  /**
   * Calculate average score for a specific quality dimension
   * @private
   */
  _calculateAvgScore(evidence, dimension) {
    if (evidence.length === 0) return 0;
    const sum = evidence.reduce((acc, e) => acc + (e.quality?.[dimension] || 0), 0);
    return Math.round(sum / evidence.length);
  }

  /**
   * Get iteration goal name
   * @private
   */
  _getIterationGoal(iteration) {
    const goals = {
      1: 'BROAD_OVERVIEW',
      2: 'NARROW_FOCUS',
      3: 'DEEP_DIVE',
      4: 'VALIDATION',
      5: 'REFINEMENT'
    };
    return goals[iteration] || 'UNKNOWN';
  }

  /**
   * Export research results
   *
   * @param {Object} results - Research results
   * @param {string} outputPath - Output file path
   * @param {string} format - Export format (json | csv)
   */
  async export(results, outputPath, format = 'json') {
    if (format === 'json') {
      await this._exportJSON(results, outputPath);
    } else if (format === 'csv') {
      await this._exportCSV(results, outputPath);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    console.log(`\n✅ Exported to: ${outputPath}`);
  }

  /**
   * Export to JSON
   * @private
   */
  async _exportJSON(results, outputPath) {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        mode: results.metadata?.mode || 'standard',
        researchPhase: results.metadata?.researchPhase || 'N/A'
      },
      summary: {
        totalEvidence: results.evidence?.length || 0,
        avgQuality: this._calculateAvgQuality(results.evidence || []),
        crossValidationRate: results.statistics?.crossValidationRate || null,
        researchTime: results.metrics?.totalTime || results.metrics?.synthesisTime || 0
      },
      evidence: results.evidence || [],
      statistics: results.statistics || {},
      metrics: results.metrics || {}
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Export to CSV
   * @private
   */
  async _exportCSV(results, outputPath) {
    const evidence = results.evidence || [];

    const headers = [
      'ID',
      'Title',
      'Source',
      'Type',
      'Quality',
      'Confidence',
      'Found By',
      'Agreement'
    ];

    const rows = evidence.map(e => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.source?.url || 'N/A'}"`,
      e.source?.type || 'N/A',
      e.quality?.overall || 0,
      e.crossValidation?.confidence || 'N/A',
      e.crossValidation?.foundBy?.join('+') || 'N/A',
      e.crossValidation?.agreement || 'N/A'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    fs.writeFileSync(outputPath, csv, 'utf8');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const dashboard = new ResearchDashboard();

  if (command === 'display') {
    const contextDir = args.find(a => a.startsWith('--context='))?.split('=')[1];
    const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'standard';

    if (!contextDir) {
      console.error('❌ Missing --context argument');
      process.exit(1);
    }

    // Load research results from context directory
    const evidencePath = path.join(contextDir, 'research-results.json');
    if (!fs.existsSync(evidencePath)) {
      console.error(`❌ No research results found at: ${evidencePath}`);
      process.exit(1);
    }

    const results = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    dashboard.display(results, mode);

  } else if (command === 'export') {
    const contextDir = args.find(a => a.startsWith('--context='))?.split('=')[1];
    const outputPath = args.find(a => a.startsWith('--output='))?.split('=')[1];
    const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'json';

    if (!contextDir || !outputPath) {
      console.error('❌ Missing required arguments: --context and --output');
      process.exit(1);
    }

    const evidencePath = path.join(contextDir, 'research-results.json');
    if (!fs.existsSync(evidencePath)) {
      console.error(`❌ No research results found at: ${evidencePath}`);
      process.exit(1);
    }

    const results = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    dashboard.export(results, outputPath, format).catch(err => {
      console.error('❌ Export failed:', err.message);
      process.exit(1);
    });

  } else {
    console.log(`
Research Dashboard - Usage:

  Display dashboard:
    node research-dashboard.js display --context=<context-dir> --mode=<mode>

  Export results:
    node research-dashboard.js export --context=<context-dir> --output=<file> --format=<json|csv>

  Modes: standard | multi-model | deep | combined
    `);
    process.exit(1);
  }
}

module.exports = ResearchDashboard;
