"use strict";

/**
 * gate-check — Validate quality gates D1-D4, G0, T-COV, T-QUAL, G0-DD
 * Wraps guards/gates/quality-gates.js (or falls back to startx4crm logic)
 *
 * Args:
 *   --gate <D1|D2|D3|D4|G0|T-COV|T-QUAL|G0-DD>  Gate to check (required)
 *   --contextPath <path>          Override context path (optional)
 *   --featureId <id>              Override feature ID (optional)
 *
 * Returns: { gate, passed, details }
 */

const path = require("path");
const fs = require("fs");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const gate = args.gate;
    const VALID_GATES = ["D1", "D2", "D3", "D4", "G0", "T-COV", "T-QUAL", "G0-DD"];
    if (!gate || !VALID_GATES.includes(gate)) {
      return { error: `gate-check requires --gate ${VALID_GATES.join("|")}` };
    }

    try {
      // Prefer local guards/gates/quality-gates.js if it exists
      const localGatesPath = path.join(pkgRoot, "guards/gates/quality-gates.js");
      let qualityGates;

      if (fs.existsSync(localGatesPath)) {
        qualityGates = require(localGatesPath);
      } else {
        // Dynamically require from core state path as fallback
        return {
          gate,
          passed: null,
          error: "quality-gates.js not found in guards/gates/",
          details: null,
        };
      }

      // Resolve context path
      let contextPath = args.contextPath || null;
      if (!contextPath) {
        const { findActiveContext } = require(path.join(pkgRoot, "core/state/state-manager"));
        contextPath = findActiveContext();
      }

      if (!contextPath) {
        return { gate, passed: false, error: "No active context found", details: null };
      }

      // Resolve feature ID
      let featureId = args.featureId || null;
      if (!featureId) {
        const { loadContext } = require(path.join(pkgRoot, "core/state/state-manager"));
        const context = loadContext(contextPath);
        featureId = context.featureName || "unknown";
      }

      // G0: Pre-execution confidence check
      function checkGateG0() {
        const plansDir = path.join(contextPath, "plans");
        let planExists = false;
        let confidence = 0;

        if (fs.existsSync(plansDir)) {
          const planFiles = fs.readdirSync(plansDir)
            .filter(f => f.endsWith("-implementation.md") || f.endsWith("-implementation-plan.md"));
          planExists = planFiles.length > 0;

          for (const pf of planFiles) {
            const content = fs.readFileSync(path.join(plansDir, pf), "utf8");
            const match = content.match(/Confidence[:\s]*(\d+)/i);
            if (match) confidence = Math.max(confidence, parseInt(match[1]));
          }
        }

        return {
          passed: planExists && confidence >= 90,
          gate: "G0",
          planExists,
          confidence,
          requiredConfidence: 90,
        };
      }

      // T-COV: Test coverage threshold
      function checkGateTCOV() {
        const tcovPath = path.join(pkgRoot, "guards/gates/test-coverage-gate.js");
        if (!fs.existsSync(tcovPath)) {
          return { passed: false, gate: "T-COV", error: "test-coverage-gate.js not found" };
        }
        const tcov = require(tcovPath);
        const reportPath = path.join(process.cwd(), "cache", "validation-report.json");
        const report = fs.existsSync(reportPath)
          ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
          : {};
        return { ...tcov.checkCoverage(report), gate: "T-COV" };
      }

      // T-QUAL: Test quality
      function checkGateTQUAL() {
        const tqualPath = path.join(pkgRoot, "guards/gates/test-quality-gate.js");
        if (!fs.existsSync(tqualPath)) {
          return { passed: false, gate: "T-QUAL", error: "test-quality-gate.js not found" };
        }
        const tqual = require(tqualPath);
        const reportPath = path.join(process.cwd(), "cache", "test-files.json");
        const testFiles = fs.existsSync(reportPath)
          ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
          : [];
        return { ...tqual.checkQuality(testFiles), gate: "T-QUAL" };
      }

      // G0-DD: Innovate DD approval
      function checkGateG0DD() {
        const selectionPath = path.join(contextPath, "innovate-dd-selection.md");
        const exists = fs.existsSync(selectionPath);
        let approved = false;
        if (exists) {
          const content = fs.readFileSync(selectionPath, "utf8");
          approved = /approved|selected/i.test(content);
        }
        return { passed: exists && approved, gate: "G0-DD", selectionExists: exists, approved };
      }

      // Run the requested gate
      const checkers = {
        D1: () => qualityGates.checkGateD1(contextPath),
        D2: () => qualityGates.checkGateD2(contextPath, featureId),
        D3: () => qualityGates.checkGateD3(contextPath, featureId),
        D4: () => qualityGates.checkGateD4(contextPath, featureId),
        G0: () => checkGateG0(),
        "T-COV": () => checkGateTCOV(),
        "T-QUAL": () => checkGateTQUAL(),
        "G0-DD": () => checkGateG0DD(),
      };

      const result = checkers[gate]();
      const errorMsg = result.passed ? null : qualityGates.formatGateError(result);

      return {
        gate,
        passed: result.passed,
        details: result,
        errorMessage: errorMsg,
        contextPath,
        featureId,
      };
    } catch (err) {
      return {
        gate,
        passed: false,
        error: `gate-check failed: ${err.message}`,
        details: null,
      };
    }
  },
};
