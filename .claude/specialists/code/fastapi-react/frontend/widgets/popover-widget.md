# Widget 11.38: PopoverWidget

**Type**: Overlay Widget
**Role**: Contextual popover with flexible positioning
**Technology**: React 19, TypeScript, React Portal
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET PopoverWidget {
  ROLE: "Contextual popover overlay"

  RESPONSIBILITIES: [
    "Position popover relative to trigger",
    "Support four positions (top/bottom/left/right)",
    "Support three alignments (start/center/end)",
    "Close on escape key",
    "Close on outside click",
    "Use React Portal for DOM independence"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    portal: "React createPortal API",
    positioning: "Fixed positioning with Tailwind",
    event_handling: "Event listeners for escape and click-outside"
  }

  DOMAIN_CONTEXT: {
    use_case: "Contextual menus, info popups, quick actions"
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN PopoverWidget_Widget {
  PURPOSE: "Flexible positioning popover for contextual content"

  PROBLEM: "Need popover that positions relative to trigger element"

  SOLUTION: "Portal-based popover with four positions and escape/outside-click close"

  USE_CASES: [
    "Contextual menus",
    "Info popups",
    "Quick action panels",
    "Tooltips with content"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW PopoverWidget_Workflow {
  INPUT: {
    isOpen: boolean,
    onClose: Function,
    trigger: ReactNode,
    children: ReactNode,
    position?: "top" | "bottom" | "left" | "right",
    align?: "start" | "center" | "end",
    showCloseButton?: boolean
  }

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize position tracking"
      logic: |
        CREATE triggerRef for trigger element
        CREATE popoverRef for popover element
        SET mounted = false initially
    }

    STEP_2_HANDLE_HYDRATION: {
      description: "Handle SSR hydration"
      logic: |
        USE useEffect to set mounted = true on client
        PREVENTS hydration mismatch
    }

    STEP_3_HANDLE_ESCAPE: {
      description: "Close on Escape key"
      logic: |
        IF NOT isOpen THEN return
        END IF

        ON Escape key:
          CALL onClose()
    }

    STEP_4_HANDLE_CLICK_OUTSIDE: {
      description: "Close when clicking outside popover or trigger"
      logic: |
        IF NOT isOpen THEN return
        END IF

        ON mousedown outside popover AND outside trigger:
          CALL onClose()
    }

    STEP_5_RENDER_TRIGGER: {
      description: "Render trigger element in document"
      logic: |
        RENDER div with triggerRef
        RENDER trigger content inside
    }

    STEP_6_RENDER_POPOVER_PORTAL: {
      description: "Render popover via Portal"
      logic: |
        IF NOT isOpen THEN return null
        END IF

        IF NOT mounted THEN return null
        END IF

        USE createPortal(popover, document.body)
    }

    STEP_7_APPLY_POSITIONING: {
      description: "Apply position and alignment classes"
      logic: |
        POSITION classes:
          - top: bottom-full mb-2
          - bottom: top-full mt-2
          - left: right-full mr-2
          - right: left-full ml-2

        ALIGN classes:
          - start: left-0 / top-0
          - center: left-1/2 -translate-x-1/2 / top-1/2 -translate-y-1/2
          - end: right-0 / bottom-0

        COMBINE position + align classes
    }

    STEP_8_RENDER_POPOVER_CONTENT: {
      description: "Render popover with content"
      logic: |
        RENDER popover div with:
          - fixed z-50
          - bg-white border rounded shadow-lg
          - position and align classes
          - min-w-[200px] max-w-xs

        SHOW optional close button

        RENDER children content inside
    }
  }

  ERROR_HANDLING: {
    PositioningError: "Default to bottom center",
    ClickError: "Fallback to blur event",
    RefError: "Use fallback positioning"
  }

  OUTPUT: {
    rendered_component: TriggerAndPortal,
    visible: isOpen,
    z_index: 50,
    responsive: true
  }

  POSTCONDITIONS: [
    "Popover positions correctly",
    "Escape key closes",
    "Click outside closes",
    "Portal renders independently"
  ]
}
```

---

## Key Interfaces

```typescript
// Component Props
interface PopoverWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  showCloseButton?: boolean;
  className?: string;
}

// Component Signature
function PopoverWidget(props: PopoverWidgetProps): JSX.Element
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE PopoverWidget {
  SCENARIO: "Show contextual menu on button click"

  FLOW: {
    const [isOpen, setIsOpen] = useState(false)

    CALL PopoverWidget({
      isOpen: isOpen,
      onClose: () => setIsOpen(false),
      position: "bottom",
      align: "center",
      trigger: <Button>Tùy chọn</Button>,
      children: <QuickActionsMenu />
    })
  }
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 215
**Status**: Completed
