# Pattern 12.27: ImportDataFeature

**Role**: File import handler with format detection and validation
**Focus**: CSV/Excel parsing, schema validation, preview rendering
**Technology**: React 19, Zod, Papa Parse, XLSX
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST ImportDataFeature {
  ROLE: "Intelligent file import with format detection, validation, and preview"

  RESPONSIBILITIES: [
    "Detect and parse CSV/Excel files",
    "Validate data against Zod schemas",
    "Generate preview before import",
    "Track import progress and errors",
    "Support column mapping"
  ]

  TECH_STACK: {
    primary: "React 19, TypeScript",
    libraries: ["zod", "papaparse", "xlsx", "lucide-react"],
    patterns: ["Client Component", "Modal Dialog", "Progress Tracking"]
  }

  DOMAIN_CONTEXT: {
    industry: "P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["ImportFile", "ParsedRow", "ImportData", "ImportError"]
  }
}
```

---

## Pattern 12.27: ImportDataFeature

### Overview

```pseudo
PATTERN ImportDataFeature {
  PURPOSE: "Enable users to import financial data from CSV/Excel with validation"

  PROBLEM: "Users need to bulk-import data with format verification, validation, preview"

  SOLUTION: "Multi-step import workflow: detect → parse → validate → preview → import"

  USE_CASES: [
    "Import customer records from CSV",
    "Import loan data from Excel",
    "Import insurance policies with validation"
  ]

  COMPLEXITY: "HIGH"
}
```

### Workflow

```pseudo
WORKFLOW ImportDataFeature_Workflow {
  INPUT: {
    file: File,
    schema: z.ZodSchema,
    onImport: (rows: ParsedRow[]) => Promise<void>,
    disabled?: boolean
  }

  PRECONDITIONS: [
    "File is not null and is valid File object",
    "Schema is valid Zod schema",
    "onImport callback is provided"
  ]

  STEPS: {
    STEP_1_FILE_VALIDATION: {
      description: "Validate file format and size"
      logic: |
        format = CALL detectFileFormat(file)

        IF format == "unknown" THEN
          THROW ERROR "Unsupported file format"
        END IF

        IF NOT validateFileSize(file, maxSizeMB: 10) THEN
          THROW ERROR "File size exceeds 10MB limit"
        END IF
    }

    STEP_2_FILE_PARSING: {
      description: "Parse file based on detected format"
      logic: |
        format = CALL detectFileFormat(file)

        SWITCH format:
          CASE "csv":
            rows = AWAIT parseCSV(file)
          CASE "excel":
            rows = AWAIT parseExcel(file)
          DEFAULT:
            THROW ERROR "Unsupported format"
        END SWITCH

        IF rows.length == 0 THEN
          THROW ERROR "File contains no data"
        END IF
    }

    STEP_3_DATA_VALIDATION: {
      description: "Validate parsed rows against schema"
      logic: |
        valid_rows = []
        invalid_rows = []

        FOR EACH row IN rows:
          TRY:
            validated = CALL schema.parse(row)
            valid_rows.APPEND(validated)
          CATCH ZodError error:
            FOR EACH issue IN error.issues:
              invalid_rows.APPEND({
                row: row._rowNumber,
                column: issue.path[0],
                message: issue.message,
                severity: "error"
              })
            END FOR
          END TRY
        END FOR
    }

    STEP_4_SHOW_PREVIEW: {
      description: "Display preview dialog with validation results"
      logic: |
        SET isOpen = true
        SET parsedRows = valid_rows
        SET errors = invalid_rows

        SHOW Dialog {
          title: "Xem trước nhập dữ liệu (Import Preview)",
          content: {
            summary: "valid_rows.length hợp lệ, errors.length lỗi",
            preview_rows: LIMIT(valid_rows, 10),
            error_details: errors
          },
          actions: ["Cancel", "Import"]
        }
    }

    STEP_5_EXECUTE_IMPORT: {
      description: "Execute import callback with validated data"
      logic: |
        SET isLoading = true

        TRY:
          AWAIT onImport(parsedRows)

          SHOW TOAST {
            title: "Nhập thành công",
            description: parsedRows.length + " dòng đã được nhập"
          }

          CLOSE Dialog
          CLEAR parsedRows
          CLEAR errors
        CATCH error:
          SHOW TOAST {
            title: "Lỗi (Error)",
            description: error.message,
            variant: "destructive"
          }
        FINALLY:
          SET isLoading = false
        END TRY
    }
  }

  ERROR_HANDLING: {
    UnsupportedFormatError: "Show toast and return to file selection",
    FileSizeError: "Show toast with size limit message",
    ParsingError: "Log error and show validation results",
    ValidationError: "Display inline errors in preview table",
    ImportError: "Retry or show detailed error report"
  }

  OUTPUT: {
    success: boolean,
    imported: number,
    errors: ImportError[],
    timestamp: string
  }

  POSTCONDITIONS: [
    "File is parsed or error is shown",
    "User sees preview before import",
    "Import callback executed or cancelled"
  ]
}
```

### Key Interfaces

```typescript
// File parsing types
interface ImportFile {
  file: File;
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface ParsedRow {
  [key: string]: any;
  _rowNumber: number;
  _errors?: string[];
}

interface ImportData {
  filename: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParsedRow[];
  errors: ImportError[];
}

interface ImportError {
  row: number;
  column?: string;
  message: string;
  value?: any;
  severity: 'error' | 'warning';
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: ImportError[];
  timestamp: string;
}

// Column mapping for field transformation
interface ColumnMapping {
  fileColumn: string;
  dataColumn: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
}

interface ImportProgress {
  total: number;
  processed: number;
  percentage: number;
  status: 'pending' | 'parsing' | 'validating' | 'importing' | 'complete' | 'error';
}

// Function signatures
function detectFileFormat(file: File): 'csv' | 'excel' | 'unknown';
function validateFileSize(file: File, maxSizeMB: number): boolean;
async function parseFile(file: File): Promise<ParsedRow[]>;
async function parseCSV(file: File): Promise<ParsedRow[]>;
async function parseExcel(file: File): Promise<ParsedRow[]>;
async function validateRows(
  rows: ParsedRow[],
  schema: z.ZodSchema
): Promise<{ valid: ParsedRow[]; invalid: ImportError[] }>;
```

### Integration Points

```pseudo
INTEGRATION ImportDataFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["ImportButton", "FileUploadZone"],
    displays: ["ImportPreview", "ImportProgress", "ErrorAlert"]
  }

  STATE_MANAGEMENT: {
    client_state: "React useState (local UI state, file data)",
    server_state: "TanStack Query (API import result caching)",
    persistence: "None (ephemeral import session)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/import/data",
    fallback: "None (client-side parsing first)"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui", "@/shared/lib/utils"],
    external: ["zod", "papaparse", "xlsx", "lucide-react"]
  }

  ERROR_HANDLING: {
    network_errors: "Show toast, allow retry",
    validation_errors: "Display inline in preview table",
    auth_errors: "Redirect to login if unauthorized",
    parsing_errors: "Show format error message"
  }

  EVENTS: {
    emits: ["onImportStart", "onImportSuccess", "onImportError", "onProgress"],
    listens: ["onFileSelected", "onValidationComplete"]
  }
}
```

### Vietnamese Domain Context

```pseudo
DOMAIN_CONTEXT {
  ENTITIES: {
    ImportFile: {
      vietnamese_term: "Tập tin nhập",
      supports: ["CSV", "Excel"],
      max_size: "10MB"
    },
    ParsedRow: {
      vietnamese_term: "Dòng dữ liệu",
      tracks: ["Row number", "Validation errors", "Data values"]
    },
    ImportError: {
      vietnamese_term: "Lỗi nhập",
      types: ["Format error", "Validation error", "Schema error"]
    }
  }

  BUSINESS_RULES: {
    file_format: "Only CSV and Excel formats supported",
    file_size: "Maximum 10MB per file",
    data_validation: "All rows must conform to Zod schema",
    preview_limit: "Show first 10 rows in preview",
    error_reporting: "Display validation errors before import"
  }

  LOCALIZATION: {
    primary_language: "Vietnamese",
    fallback_language: "English",
    date_format: "DD/MM/YYYY",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "Pattern 12.29 - AdvancedFilterFeature",
    relationship: "Uses filter logic to pre-filter imported data",
    integration: "Shares FilterCondition types"
  },
  {
    pattern: "Pattern 12.28 - BulkOperationsFeature",
    relationship: "Executes bulk import after validation",
    integration: "Uses same progress tracking patterns"
  }
]
```

---

## References

- **Architecture**: Feature-Sliced Design (FSD)
- **Technology Docs**: [React 19](https://react.dev), [Zod](https://zod.dev)
- **File Parsing**: [Papa Parse](https://www.papaparse.com), [XLSX](https://sheetjs.com)

**End of Pattern 12.27**
