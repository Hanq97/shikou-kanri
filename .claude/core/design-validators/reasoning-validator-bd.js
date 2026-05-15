"use strict";
/**
 * Basic Design Reasoning Validator v4.0
 *
 * Validates reasoning.json output from bd-reasoning-agent
 * Checkpoint C0: Post-Reasoning validation
 *
 * Evidence:
 * - Zod for TypeScript runtime validation (Evidence 5.1)
 * - NIST Zero-Trust (hard stop validation)
 *
 * Exit codes:
 * - 0: Valid
 * - 1: Invalid schema (retry agent)
 * - 2: Critical error (abort workflow)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReasoningJson = validateReasoningJson;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ZOD SCHEMAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Component schema
 * Requirements:
 * - name: UPPERCASE_WITH_UNDERSCORES
 * - responsibility: Vietnamese description
 * - frs: ≥1 FR reference (e.g., FR-BNK-001)
 * - rationale: Why component needed
 */
const ComponentSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .regex(/^[A-Z_]+$/, "Component name must be UPPERCASE_WITH_UNDERSCORES"),
    responsibility: zod_1.z.string().min(10, "Responsibility must be ≥10 chars"),
    frs: zod_1.z
        .array(zod_1.z.string().regex(/^FR-[A-Z]+-\d{3}$/, "FR format: FR-XXX-001"))
        .min(1, "Must reference ≥1 FR"),
    rationale: zod_1.z.string().min(10, "Rationale must be ≥10 chars"),
});
/**
 * Pattern schema
 * Requirements:
 * - name: Pattern name (any format)
 * - category: One of 5 valid categories
 * - nfrs: ≥1 NFR reference (e.g., NFR-PER-01)
 * - rationale: Why pattern selected
 */
const PatternSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Pattern name must be ≥3 chars"),
    category: zod_1.z.enum([
        "Architecture",
        "Integration",
        "Performance",
        "Security",
        "Reliability",
    ]),
    nfrs: zod_1.z
        .array(zod_1.z.string().regex(/^NFR-[A-Z]+-\d{2}$/, "NFR format: NFR-XXX-01"))
        .min(1, "Must reference ≥1 NFR"),
    rationale: zod_1.z.string().min(10, "Rationale must be ≥10 chars"),
});
/**
 * Technology schema
 * Requirements:
 * - name: Technology name (PostgreSQL, Redis, etc.)
 * - purpose: What technology used for
 * - nfrJustification: Which NFR requires this technology
 */
const TechnologySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Technology name must be ≥2 chars"),
    purpose: zod_1.z.string().min(10, "Purpose must be ≥10 chars"),
    nfrJustification: zod_1.z.string().min(10, "NFR justification must be ≥10 chars"),
});
/**
 * Metadata schema
 * Requirements:
 * - srsReference: [FEATURE]-[SUB]-srs.md
 * - timestamp: ISO 8601 format
 * - validated: boolean
 */
const MetadataSchema = zod_1.z.object({
    srsReference: zod_1.z
        .string()
        .regex(/^[A-Z]{3,4}-[A-Z]{3,4}-srs\.md$/, "SRS reference format: XXX-XXX-srs.md"),
    timestamp: zod_1.z
        .string()
        .datetime({ message: "Timestamp must be ISO 8601 format" }),
    validated: zod_1.z.boolean(),
});
/**
 * Root reasoning schema
 * Requirements:
 * - components: 3-5 components (Evidence 1.2 - optimal complexity)
 * - patterns: 4-6 patterns (covers all NFR categories)
 * - technologies: ≥1 technology
 * - metadata: Required
 */
const ReasoningSchema = zod_1.z.object({
    components: zod_1.z
        .array(ComponentSchema)
        .min(3, "Must have ≥3 components")
        .max(5, "Must have ≤5 components (avoid over-engineering)"),
    patterns: zod_1.z
        .array(PatternSchema)
        .min(4, "Must have ≥4 patterns (cover Architecture, Integration, Performance, Security, Reliability)")
        .max(6, "Must have ≤6 patterns (avoid pattern overload)"),
    technologies: zod_1.z.array(TechnologySchema).min(1, "Must have ≥1 technology"),
    metadata: MetadataSchema,
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VALIDATION FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Validate reasoning.json against Zod schema
 *
 * @param filePath - Path to reasoning.json
 * @returns Validation result
 */
function validateReasoningJson(filePath) {
    try {
        // Read reasoning.json
        if (!fs.existsSync(filePath)) {
            return {
                valid: false,
                errors: [
                    {
                        path: "file",
                        message: `File not found: ${filePath}`,
                        code: "FILE_NOT_FOUND",
                    },
                ],
            };
        }
        const content = fs.readFileSync(filePath, "utf-8");
        // Parse JSON
        let data;
        try {
            data = JSON.parse(content);
        }
        catch (parseError) {
            return {
                valid: false,
                errors: [
                    {
                        path: "json",
                        message: `Invalid JSON: ${parseError.message}`,
                        code: "INVALID_JSON",
                    },
                ],
            };
        }
        // Validate with Zod
        ReasoningSchema.parse(data);
        // Success
        return { valid: true, errors: [] };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            // Zod validation errors
            return {
                valid: false,
                errors: error.errors.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                    code: e.code,
                })),
            };
        }
        else if (error instanceof Error) {
            // Other errors (file I/O, etc.)
            return {
                valid: false,
                errors: [
                    { path: "unknown", message: error.message, code: "UNKNOWN_ERROR" },
                ],
            };
        }
        else {
            // Unknown error type
            return {
                valid: false,
                errors: [
                    {
                        path: "unknown",
                        message: "Unknown error occurred",
                        code: "UNKNOWN_ERROR",
                    },
                ],
            };
        }
    }
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI INTERFACE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    if (!filePath) {
        console.error("Usage: ts-node reasoning-validator-bd.ts <reasoning.json path>");
        console.error("Example: ts-node reasoning-validator-bd.ts ./reasoning.json");
        process.exit(2); // Exit code 2 = Critical error (abort workflow)
    }
    const result = validateReasoningJson(filePath);
    if (result.valid) {
        console.log("✅ Reasoning validation: PASS");
        console.log("Schema compliant:");
        console.log("  - Components: 3-5 ✓");
        console.log("  - Patterns: 4-6 ✓");
        console.log("  - Technologies: ≥1 ✓");
        console.log("  - FR/NFR references: Valid ✓");
        process.exit(0); // Success
    }
    else {
        console.error("❌ Reasoning validation: FAIL");
        console.error("\nErrors:");
        result.errors.forEach((err) => {
            console.error(`  [${err.path}] ${err.message}`);
        });
        console.error("\nFix errors and regenerate reasoning.json");
        // Exit code 1 = Validation failed (retry agent)
        process.exit(1);
    }
}
