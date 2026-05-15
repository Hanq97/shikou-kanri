# Widget 11.40: ConfirmDialogWidget

**Type**: Overlay Widget
**Role**: Confirmation dialog for destructive actions
**Technology**: React 19, TypeScript, React Portal
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET ConfirmDialogWidget {
  ROLE: "Confirmation dialog for destructive actions"

  RESPONSIBILITIES: [
    "Display confirmation dialog with warning/danger variant",
    "Show loading state during action",
    "Handle async confirm callback",
    "Support customizable button labels",
    "Prevent action if dangerous and loading",
    "Use React Portal for DOM independence",
    "Show variant-specific icon and colors"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    portal: "React createPortal API",
    async_handling: "Promise-based callbacks",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Delete confirmation, destructive action confirmation",
    variants: ["danger", "warning", "info", "success"],
    vietnamese_labels: {
      confirm: "Xác nhận",
      cancel: "Hủy",
      processing: "Đang xử lý..."
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN ConfirmDialogWidget_Widget {
  PURPOSE: "Confirm destructive actions with user warning"

  PROBLEM: "Critical actions need user confirmation to prevent accidents"

  SOLUTION: "Alert dialog with variant-specific styling and async handling"

  USE_CASES: [
    "Delete confirmation (danger variant)",
    "Archive confirmation (warning variant)",
    "Important action (info variant)",
    "Success notification (success variant)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW ConfirmDialogWidget_Workflow {
  INPUT: {
    isOpen: boolean,
    onClose: Function,
    onConfirm: Function,
    title: string,
    description?: string,
    confirmLabel?: string,
    cancelLabel?: string,
    variant?: "danger" | "warning" | "info" | "success",
    isLoading?: boolean,
    isDangerous?: boolean
  }

  PRECONDITIONS: [
    "onClose and onConfirm callbacks required",
    "title must be provided",
    "isLoading controls button state"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize dialog state"
      logic: |
        LOAD variant config (icon, colors, button styles)
        SET contentRef for focus management
        SET isLoading = false (default)
    }

    STEP_2_HANDLE_ESCAPE: {
      description: "Close on Escape key, but not while loading"
      logic: |
        IF NOT isOpen THEN return
        END IF

        ON Escape key:
          IF NOT isLoading THEN
            CALL onClose()
          END IF
    }

    STEP_3_HANDLE_CONFIRM: {
      description: "Execute confirm action with async support"
      logic: |
        ON confirm button click:
          TRY:
            CALL await onConfirm()
          CATCH error:
            SHOW error toast
          FINALLY:
            CALL onClose()
          END TRY
    }

    STEP_4_RENDER_PORTAL: {
      description: "Render dialog via Portal to document.body"
      logic: |
        IF NOT isOpen THEN return null
        END IF

        USE createPortal(dialogContent, document.body)
    }

    STEP_5_RENDER_OVERLAY: {
      description: "Render semi-transparent overlay"
      logic: |
        RENDER overlay with:
          - position: fixed, inset-0
          - bg-black/50
          - z-50

        ON overlay click (if not loading):
          CALL onClose()
    }

    STEP_6_RENDER_DIALOG: {
      description: "Render alert dialog container"
      logic: |
        RENDER dialog with:
          - position: relative
          - max-w-sm w-full
          - bg-white rounded-lg shadow-lg
          - role: alertdialog
          - aria-labelledby: confirm-title
          - aria-describedby: confirm-description
    }

    STEP_7_RENDER_HEADER: {
      description: "Render colored header with icon"
      logic: |
        RENDER header section with:
          - bg-color from variant
          - padding: p-6

        SHOW icon (AlertTriangle for danger/warning, etc.)
        SHOW title in variant color
        IF description:
          SHOW description in gray
        END IF
    }

    STEP_8_RENDER_FOOTER: {
      description: "Render action buttons"
      logic: |
        RENDER footer with:
          - border-top
          - p-6
          - bg-gray-50
          - flex justify-end gap-3

        RENDER cancel button:
          - variant: outline
          - disabled if isLoading
          - CALL onClose()

        RENDER confirm button:
          - color from variant
          - disabled if isLoading
          - aria-busy: isLoading
          - SHOW loading text if isLoading
          - CALL onConfirm()
    }
  }

  ERROR_HANDLING: {
    ConfirmError: "Show error toast and stay open",
    EscapeError: "Log and continue",
    RenderError: "Show fallback dialog"
  }

  OUTPUT: {
    rendered_component: PortalElement,
    visible: isOpen,
    z_index: 50,
    role: "alertdialog",
    variant_themed: true
  }

  POSTCONDITIONS: [
    "Dialog shows only when isOpen=true",
    "Loading state prevents actions",
    "Variant colors display correctly",
    "Icon matches variant type"
  ]
}
```

---

## Key Interfaces

```typescript
// Variant Configuration
type Variant = 'danger' | 'warning' | 'info' | 'success'

interface VariantConfig {
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  buttonColor: string;
}

// Component Props
interface ConfirmDialogWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  isLoading?: boolean;
  isDangerous?: boolean;
}

// Component Signature
function ConfirmDialogWidget(props: ConfirmDialogWidgetProps): JSX.Element | null

// Variant Config Map
const variantConfig: Record<Variant, VariantConfig> = {
  danger: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-600',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    buttonColor: 'bg-green-600 hover:bg-green-700 text-white'
  }
}
```

---

## Integration Points

```pseudo
INTEGRATION ConfirmDialogWidget_Integration {
  PARENT_COMPONENTS: [
    "DeleteButton (uses danger variant)",
    "ArchiveButton (uses warning variant)",
    "ConfirmAction (uses custom variant)",
    "CriticalAction (uses danger variant)"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for isOpen",
    global_state: "Zustand overlay store"
  }

  STYLING: {
    theme: "Tailwind CSS",
    variants: "danger (red), warning (yellow), info (blue), success (green)",
    icons: "lucide-react matching variant",
    animation: "Fade-in on open"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE ConfirmDialogWidget {
  SCENARIO: "Confirm document deletion"

  FLOW: {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    FUNCTION handleConfirm() {
      SET isLoading = true
      TRY:
        AWAIT deleteDocument(docId)
        SHOW_TOAST("Xóa thành công")
      FINALLY:
        SET isLoading = false
        SET isOpen = false
      END TRY
    }

    CALL ConfirmDialogWidget({
      isOpen: isOpen,
      onClose: () => setIsOpen(false),
      onConfirm: handleConfirm,
      title: "Xóa tài liệu?",
      description: "Hành động này không thể hoàn tác",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy",
      variant: "danger",
      isLoading: isLoading
    })
  }
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 297
**Status**: Completed
