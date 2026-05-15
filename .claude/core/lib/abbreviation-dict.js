// core/lib/abbreviation-dict.js
// Dictionary for smart abbreviation algorithm
// Based on SMART_ABBREVIATION_ALGORITHM.md

const ABBREVIATION_DICT = {
  // Account & Management
  account: "ACCT",
  management: "MGMT",
  admin: "ADMN",
  user: "USER",
  profile: "PROF",
  settings: "SETT",

  // Transactions
  transaction: "TXNP",
  processing: "PROC",
  payment: "PYMT",
  transfer: "TXFR",
  deposit: "DPST",
  withdrawal: "WDRL",

  // Balance & Banking
  balance: "BALN",
  inquiry: "INQY",
  statement: "STMT",
  history: "HIST",
  summary: "SUMM",

  // Loan Operations
  loan: "LOAN",
  origination: "ORGN",
  approval: "APVL",
  disbursement: "DISB",
  repayment: "RPMT",
  collection: "COLL",
  closure: "CLSR",
  refinance: "RFIN",

  // Authentication & Security
  authentication: "AUTH",
  authorization: "ATHZ",
  login: "LGIN",
  logout: "LGOT",
  password: "PSWD",
  reset: "RSET",
  recovery: "RCVR",
  security: "SCTY",
  mfa: "MFA", // Multi-Factor Auth (3 chars - allowed)
  biometric: "BIOM",
  session: "SESS",
  registration: "RGST",

  // Communication
  email: "MAIL",
  phone: "PHON",
  social: "SOCL",
  notification: "NOTF",
  message: "MESG",
  alert: "ALRT",

  // Reporting & Analytics
  reporting: "REPT",
  dashboard: "DASH",
  analytics: "ANLY",
  metrics: "METR",
  statistics: "STAT",

  // Documents & Verification
  document: "DOCS",
  verification: "VRFY",
  kyc: "KYC", // Know Your Customer (3 chars - allowed)
  kyca: "KYCA", // KYC/AML combined (4 chars)
  aml: "AML", // Anti-Money Laundering (3 chars - allowed)
  compliance: "CMPL",

  // Risk & Scoring
  risk: "RISK",
  scoring: "SCOR",
  assessment: "ASMT",
  evaluation: "EVAL",
  rating: "RATE",

  // Financial
  interest: "INTR",
  calculation: "CALC",
  fee: "FEE",
  charge: "CHRG",
  discount: "DISC",

  // Status & Workflow
  status: "STAT",
  workflow: "WFLW",
  pending: "PEND",
  active: "ACTV",
  complete: "COMP",

  // Integration
  integration: "INTG",
  api: "API",
  webhook: "WEBH",
  callback: "CLBK",
  sync: "SYNC",

  // Banking specific
  banking: "BNK",
  lending: "LND",
  insurance: "INS",

  // Common operations
  create: "CRET",
  read: "READ",
  update: "UPDT",
  delete: "DELT",
  list: "LIST",
  search: "SRCH",

  // Core features
  core: "CORE",
  base: "BASE",
  common: "COMM",
  shared: "SHRD",
};

// Feature dictionary integration
const fs = require("fs");
const path = require("path");

class FeatureLookup {
  constructor() {
    // Load project-specific dictionary from config
    const dictPath = path.join(
      process.cwd(),
      ".claude/config/feature-dictionary.json",
    );
    if (fs.existsSync(dictPath)) {
      this.dictionary = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    } else {
      this.dictionary = null;
    }
  }

  /**
   * Get readable folder name from module and code
   */
  getFolderName(module, code) {
    if (!this.dictionary) return null;

    const moduleInfo = this.dictionary.modules[module];
    if (!moduleInfo) return null;

    const subfeature = moduleInfo.subfeatures[code];
    return subfeature ? subfeature.folder : null;
  }

  /**
   * Build document path with correct folder structure
   */
  buildDocumentPath(params) {
    const { module, code, doctype } = params;

    if (!this.dictionary) {
      // Fallback to old style
      return `documents/features/${module}-${module.toLowerCase()}/${module}-${code}-${doctype}.md`;
    }

    const moduleInfo = this.dictionary.modules[module];
    if (!moduleInfo) {
      throw new Error(`Unknown module: ${module}`);
    }

    const basePath = "documents/features";
    const featureFolder = `${module}-${moduleInfo.name}`;
    const folderName = this.getFolderName(module, code);

    if (folderName) {
      const subFolder = `${module}-${folderName}`;
      const fileName = `${module}-${code}-${doctype}.md`;
      return path.join(basePath, featureFolder, subFolder, fileName);
    } else {
      const fileName = `${module}-${code}-${doctype}.md`;
      return path.join(basePath, featureFolder, fileName);
    }
  }

  /**
   * Ensure folder structure exists
   */
  ensureFolderStructure(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created folder: ${dir}`);
    }
  }
}

// CLI support for backward compatibility
if (require.main === module) {
  const lookup = new FeatureLookup();
  const command = process.argv[2];

  try {
    switch (command) {
      case "build-path": {
        const [module, code, doctype] = process.argv.slice(3);
        const filePath = lookup.buildDocumentPath({ module, code, doctype });
        console.log(filePath);
        break;
      }
      case "ensure-folder": {
        const filePath = process.argv[3];
        lookup.ensureFolderStructure(filePath);
        break;
      }
      default:
        console.log(
          "Usage: build-path <module> <code> <type> | ensure-folder <path>",
        );
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

module.exports = { ABBREVIATION_DICT, FeatureLookup };
