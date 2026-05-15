"use strict";

/**
 * gemini-call — Call Gemini API via GeminiIntegrator
 *
 * Args:
 *   --prompt <text>         Prompt text (required)
 *   --type <INNOVATE_SRS|INNOVATE_BD|INNOVATE_DD>  Call type (default: INNOVATE_BD)
 *   --contextDir <path>     Memory-bank context directory for auto-context loading
 *   --outputFile <path>     Write result to file (optional)
 *
 * Returns: { available, response, outputFile? }
 */

const path = require("path");
const fs = require("fs");

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      // Check if Gemini SDK is available
      let sdkAvailable = false;
      try {
        require("@google/generative-ai");
        sdkAvailable = true;
      } catch (_) {
        sdkAvailable = false;
      }
      return { test: true, available: true, sdkAvailable };
    }

    const prompt = args.prompt;
    if (!prompt) {
      return { error: "gemini-call requires --prompt" };
    }

    try {
      const GeminiIntegrator = require(path.join(pkgRoot, "core/gemini/gemini-integrator"));
      const integrator = new GeminiIntegrator();
      const initialized = await integrator.initialize();

      if (!initialized || !integrator.isAvailable) {
        return {
          available: false,
          error: "Gemini not available — check API key in config/external-apis.json or GEMINI_API_KEY env",
        };
      }

      const callType = args.type || "INNOVATE_BD";
      const contextDir = args.contextDir || null;

      // Build call options mirroring GeminiIntegrator.callGemini() signature
      const callOpts = {
        type: callType,
        taskSummary: prompt,
        contextDir,
        ragQuery: args["no-rag"] ? false : true,
      };

      const response = await integrator.callGemini(callOpts);

      // Optionally persist result
      if (args.outputFile) {
        const outPath = path.isAbsolute(args.outputFile)
          ? args.outputFile
          : path.join(pkgRoot, args.outputFile);
        fs.writeFileSync(outPath, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
      }

      return {
        available: true,
        response,
        callType,
        outputFile: args.outputFile || null,
      };
    } catch (err) {
      return {
        available: false,
        error: `gemini-call failed: ${err.message}`,
      };
    }
  },
};
