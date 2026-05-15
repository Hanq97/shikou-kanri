# ExportDataFeature Pattern

**Role**: Frontend data export specialist
**Focus**: Multi-format export (CSV, Excel, PDF) with column customization
**Technology**: React 19, TypeScript 5, Next.js 15
**Domain**: Vietnamese P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST ExportDataFeatureSpecialist {
  ROLE: "Multi-format data export handler"

  RESPONSIBILITIES: [
    "Validate export data and column selection",
    "Transform data for CSV, Excel, PDF formats",
    "Generate downloadable files with encoding",
    "Provide column picker and format selector UI",
    "Handle errors with bilingual feedback"
  ]

  TECH_STACK: {
    primary: "React 19 + TypeScript",
    libraries: ["papaparse", "xlsx", "jspdf", "jspdf-autotable"],
    patterns: ["Feature-Sliced Design", "Client Components"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["DataTable", "ExportColumn", "ExportOptions"]
  }
}
```

---

## Pattern 12.26: ExportDataFeature

### Overview

```pseudo
PATTERN ExportDataFeature {
  PURPOSE: "Enable tabular data export in CSV, Excel, PDF with column selection"

  PROBLEM: "Users need flexible data export with format choice and column customization
            while maintaining proper encoding and applying data formatters"

  SOLUTION: "Multi-step workflow: select visible columns → choose format → generate
             formatted file → trigger browser download with error handling"

  USE_CASES: [
    "Export contract list as CSV with date formatting",
    "Export user data as Excel with formatted currency amounts",
    "Generate PDF report with title and pagination",
    "Select specific columns to reduce file size"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW ExportDataFeature_Workflow {
  INPUT: {
    data: T[],
    filename: string,
    columns: ExportColumn[],
    format: 'csv' | 'excel' | 'pdf',
    title?: string,
    subtitle?: string,
    includeTimestamp?: boolean
  }

  PRECONDITIONS: [
    "data array is not empty",
    "at least one column is visible",
    "format is valid (csv, excel, pdf)",
    "filename contains only safe characters"
  ]

  STEPS: {
    STEP_1_VALIDATE: {
      description: "Validate data, columns, and format"
      logic: |
        IF data.length == 0 THEN
          THROW "Không có dữ liệu để xuất (No data to export)"
        END IF

        visibleCols = FILTER columns WHERE visible == true
        IF visibleCols.length == 0 THEN
          THROW "Không có cột nào được chọn (No columns selected)"
        END IF
    }

    STEP_2_PREPARE_DATA: {
      description: "Extract visible columns and apply formatters"
      logic: |
        headers = MAP visibleCols TO label
        rows = []

        FOR EACH record IN data:
          row = []
          FOR EACH col IN visibleCols:
            value = record[col.key]
            formatted = col.format ? col.format(value) : value ?? ''
            row.APPEND(formatted)
          END FOR
          rows.APPEND(row)
        END FOR

        RETURN { headers, rows, visibleCols }
    }

    STEP_3_GENERATE: {
      description: "Generate file blob based on format"
      logic: |
        SWITCH format:
          'csv': blob = CALL generateCSV(headers, rows)
          'excel': blob = CALL generateExcel(headers, rows, title, subtitle)
          'pdf': blob = CALL generatePDF(headers, rows, title, subtitle)
        END SWITCH
        RETURN blob
    }

    STEP_4_DOWNLOAD: {
      description: "Create filename and trigger download"
      logic: |
        sanitized = REPLACE(filename, /[^a-zA-Z0-9-_]/, '_')
        dateStr = includeTimestamp ? '_' + TODAY() : ''
        finalName = sanitized + dateStr + '.' + format

        url = CREATE_BLOB_URL(blob)
        link = CREATE_ELEMENT('a')
        link.href = url
        link.download = finalName
        CLICK(link)
        REVOKE_URL(url)
        SHOW_TOAST("Xuất thành công")
    }
  }

  ERROR_HANDLING: {
    ValidationError: "Show toast with validation details",
    EncodingError: "Retry with UTF-8 BOM",
    DOMError: "Log and show generic message"
  }

  OUTPUT: {
    success: boolean,
    filename?: string,
    error?: string
  }

  POSTCONDITIONS: [
    "File downloaded to user device",
    "User receives confirmation notification",
    "No sensitive data remains in memory"
  ]
}
```

### Key Interfaces

```typescript
interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
  width?: number;
  visible: boolean;
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filename: string;
  columns: ExportColumn[];
  title?: string;
  subtitle?: string;
  includeTimestamp?: boolean;
}

interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  timestamp: string;
}

// Function signatures
async function exportToCSV<T>(data: T[], columns: ExportColumn[], filename: string): Promise<void>;
async function exportToExcel<T>(data: T[], columns: ExportColumn[], options: ExportOptions): Promise<void>;
async function exportToPDF<T>(data: T[], columns: ExportColumn[], options: ExportOptions): Promise<void>;
```

### Integration Points

```pseudo
INTEGRATION ExportDataFeature_Integration {
  UI_COMPONENTS: {
    triggers: ["ExportButton - Format dropdown", "ExportFormatSelector - Column picker"],
    displays: ["Toast notifications", "Loading states"]
  }

  STATE_MANAGEMENT: {
    client_state: "useState(isExporting, columns)",
    events: "onColumnsChange, onExportComplete"
  }

  API_ENDPOINTS: {
    primary: "None - Client-side only",
    fallback: "POST /api/v1/export for large datasets (>10k rows)"
  }

  DEPENDENCIES: {
    internal: ["@/shared/ui/button", "@/shared/ui/use-toast"],
    external: ["papaparse", "xlsx", "jspdf", "jspdf-autotable", "lucide-react"]
  }

  ERROR_HANDLING: {
    validation: "Display inline error with reason",
    encoding: "Add UTF-8 BOM for compatibility",
    network: "Fallback to server-side export API"
  }
}
```

### Usage Example

```pseudo
USAGE_EXAMPLE {
  SCENARIO: "User exports contract data as Excel"

  FLOW: |
    STEP_1: User clicks ExportFormatSelector
            Popover shows columns with checkboxes
            User unchecks 'Status' column
            3/4 columns selected

    STEP_2: User clicks ExportButton, selects Excel
            System CALLS ExportDataFeature_Workflow({
              data: contractList,
              format: 'excel',
              filename: 'contracts',
              columns: [
                { key: 'id', label: 'ID', visible: true },
                { key: 'name', label: 'Tên hợp đồng', visible: true },
                { key: 'amount', label: 'Số tiền',
                  format: v => v.toLocaleString('vi-VN') + ' ₫',
                  visible: true },
                { key: 'status', label: 'Trạng thái', visible: false }
              ],
              title: 'Báo cáo hợp đồng',
              includeTimestamp: true
            })

    STEP_3: System validates and prepares data
            System generates Excel with styling
            System creates 'contracts_2026-01-02.xlsx'

    STEP_4: Browser downloads file
            Toast: "Xuất thành công"

  PSEUDO_CODE: |
    ASYNC FUNCTION handleExport(format) {
      SET isExporting = true
      TRY:
        IF visibleColumns.length == 0 THEN
          SHOW_TOAST("Chọn ít nhất một cột", variant: "destructive")
          RETURN
        END IF

        AWAIT ExportDataFeature_Workflow({
          data: tableData,
          format: format,
          columns: visibleColumns,
          filename: "export-data",
          includeTimestamp: true
        })

      CATCH error:
        SHOW_TOAST(error.message, variant: "destructive")
      FINALLY:
        SET isExporting = false
    }
}
```

### Testing Guidelines

```pseudo
TESTING ExportDataFeature_Tests {
  UNIT_TESTS: [
    "Should throw error when data is empty",
    "Should throw error when no columns visible",
    "Should apply custom formatters correctly",
    "Should sanitize filename",
    "Should add UTF-8 BOM to CSV",
    "Should generate valid Excel workbook",
    "Should handle null/undefined values"
  ],

  INTEGRATION_TESTS: [
    "Complete CSV export workflow",
    "Complete Excel export with styling",
    "Complete PDF export with pagination",
    "Column visibility affects export result",
    "Error recovery and retry"
  ],

  EDGE_CASES: [
    "Large datasets (>50k rows)",
    "Vietnamese special characters",
    "Concurrent exports",
    "Network timeout handling"
  ],

  COVERAGE_TARGET: "≥85%"
}
```

---

**File Size**: 249 lines | **Status**: Ready for integration | **Compliance**: ✅ Validated
