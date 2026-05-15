# Widget 11.36: ModalWidget

**Type**: Overlay Widget
**Role**: Reusable modal component with customizable size and layout
**Technology**: React 19, TypeScript, React Portal
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET ModalWidget {
  ROLE: "Reusable modal dialog component"

  RESPONSIBILITIES: [
    "Render modal with customizable size",
    "Handle escape key to close",
    "Implement focus trap",
    "Manage body overflow",
    "Support header, content, footer sections",
    "Use React Portal for DOM independence"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    portal: "React createPortal API",
    state_management: "React useRef, useEffect",
    ui_library: "Custom UI components (@/shared/ui/)",
    icons: "lucide-react"
  }

  DOMAIN_CONTEXT: {
    use_case: "Generic modal for forms, dialogs, confirmations",
    sizes: ["sm", "md", "lg", "xl"]
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN ModalWidget_Widget {
  PURPOSE: "Provide reusable modal component for dialogs and forms"

  PROBLEM: "Need accessible, flexible modals without building each time"

  SOLUTION: "Portal-based modal with focus trap, escape handling, and sticky sections"

  USE_CASES: [
    "Forms (create, edit)",
    "Confirmation dialogs",
    "Information display",
    "Wizards"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW ModalWidget_Workflow {
  INPUT: {
    isOpen: boolean,
    onClose: Function,
    title?: string,
    description?: string,
    children: ReactNode,
    size?: "sm" | "md" | "lg" | "xl",
    showCloseButton?: boolean,
    footer?: ReactNode,
    onEscapeKey?: Function
  }

  PRECONDITIONS: [
    "onClose callback must be provided",
    "isOpen controls visibility"
  ]

  STEPS: {
    STEP_1_ESCAPE_HANDLING: {
      description: "Handle Escape key to close modal"
      logic: |
        IF NOT isOpen THEN return
        END IF

        ON Escape key:
          CALL onEscapeKey() if provided
          CALL onClose()
    }

    STEP_2_FOCUS_TRAP: {
      description: "Trap focus within modal"
      logic: |
        ON mount:
          SAVE previousActiveElement
          FOCUS modal content element

        ON unmount:
          RESTORE previousActiveElement
    }

    STEP_3_BODY_OVERFLOW: {
      description: "Prevent background scroll"
      logic: |
        WHEN isOpen:
          SET document.body.style.overflow = 'hidden'

        ON cleanup:
          SET document.body.style.overflow = 'unset'
    }

    STEP_4_RENDER_PORTAL: {
      description: "Render modal via Portal to document.body"
      logic: |
        IF NOT isOpen THEN return null
        END IF

        USE createPortal(modalContent, document.body)
    }

    STEP_5_RENDER_OVERLAY: {
      description: "Render semi-transparent overlay"
      logic: |
        RENDER overlay div with:
          - position: fixed, inset-0
          - bg-black/50
          - z-50
          - role: presentation

        ON overlay click:
          CALL onClose()
    }

    STEP_6_RENDER_MODAL: {
      description: "Render modal container"
      logic: |
        RENDER modal div with:
          - position: relative
          - size based on size prop (sm/md/lg/xl)
          - max-h-[90vh] overflow-y-auto
          - role: dialog
          - aria-modal: true
          - aria-labelledby: modal-title (if title)
          - aria-describedby: modal-description (if description)
    }

    STEP_7_RENDER_HEADER: {
      description: "Render sticky header section"
      logic: |
        RENDER header with:
          - sticky top-0 z-10
          - border-bottom
          - p-6

        SHOW title if provided
        SHOW description if provided

        IF showCloseButton THEN
          SHOW close button (X icon)
        END IF
    }

    STEP_8_RENDER_CONTENT: {
      description: "Render scrollable content"
      logic: |
        RENDER content section with:
          - p-6
          - bg-white
          - children passed in
    }

    STEP_9_RENDER_FOOTER: {
      description: "Render sticky footer section"
      logic: |
        IF footer THEN
          RENDER footer with:
            - sticky bottom-0 z-10
            - border-top
            - p-6
            - bg-gray-50
            - flex justify-end gap-3
            - footer content
        END IF
    }
  }

  ERROR_HANDLING: {
    FocusTrapError: "Fallback to basic close",
    PortalError: "Render inline instead",
    EscapeError: "Log and continue"
  }

  OUTPUT: {
    rendered_component: PortalElement,
    visible: isOpen,
    z_index: 50,
    accessible: true,
    responsive: true
  }

  POSTCONDITIONS: [
    "Modal renders only when isOpen=true",
    "Escape key closes modal",
    "Focus trapped in modal",
    "Background doesn't scroll"
  ]
}
```

---

## Key Interfaces

```typescript
// Component Props
interface ModalWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  onEscapeKey?: () => void;
  className?: string;
}

// Component Signature
function ModalWidget(props: ModalWidgetProps): JSX.Element | null

// Size Map
const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl'
}
```

---

## Integration Points

```pseudo
INTEGRATION ModalWidget_Integration {
  PARENT_COMPONENTS: [
    "Any component that needs modal",
    "Forms (create, edit)",
    "Confirmation dialogs"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for isOpen in parent",
    global_state: "Zustand overlay store"
  }

  STYLING: {
    theme: "Tailwind CSS",
    sizes: "sm, md, lg, xl",
    max_height: "90vh with overflow",
    z_index: "50 (below dropdown 60)"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE ModalWidget {
  SCENARIO: "Show form in modal dialog"

  FLOW: {
    const [isOpen, setIsOpen] = useState(false)

    CALL ModalWidget({
      isOpen: isOpen,
      onClose: () => setIsOpen(false),
      title: "Tạo tài liệu mới",
      description: "Nhập thông tin tài liệu",
      size: "lg",
      footer: [
        <Button onClick={() => setIsOpen(false)}>Hủy</Button>,
        <Button onClick={handleSubmit}>Tạo</Button>
      ],
      children: <CreateDocumentForm />
    })
  }
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 271
**Status**: Completed
