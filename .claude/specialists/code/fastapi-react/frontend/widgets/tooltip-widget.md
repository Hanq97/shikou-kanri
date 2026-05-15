# Widget 11.39: TooltipWidget

**Type**: Overlay Widget
**Role**: Enhanced tooltip with hover activation and positioning
**Technology**: React 19, TypeScript, React Portal
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET TooltipWidget {
  ROLE: "Hover-activated tooltip component"

  RESPONSIBILITIES: [
    "Display tooltip on hover with delay",
    "Support four positioning options",
    "Show arrow pointing to trigger",
    "Handle hydration safely",
    "Use React Portal for DOM independence",
    "Clear timeout on unmount"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    portal: "React createPortal API",
    event_handling: "Mouse enter/leave events",
    animation: "CSS fade-in animation",
    positioning: "Fixed positioning with Tailwind"
  }

  DOMAIN_CONTEXT: {
    use_case: "Help text, button descriptions, field hints",
    vietnamese_labels: {
      help_text: "Chú thích",
      hint: "Gợi ý"
    }
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN TooltipWidget_Widget {
  PURPOSE: "Provide helpful tooltips on hover with minimal screen impact"

  PROBLEM: "Need accessible tooltips that don't clutter interface"

  SOLUTION: "Portal-based tooltip with delay, arrow, and smooth animation"

  USE_CASES: [
    "Button help text",
    "Input field hints",
    "Icon descriptions",
    "Abbreviation explanations"
  ]

  COMPLEXITY: "LOW"
}
```

---

## Workflow

```pseudo
WORKFLOW TooltipWidget_Workflow {
  INPUT: {
    content: ReactNode,
    children: ReactNode,
    position?: "top" | "bottom" | "left" | "right",
    delay?: number,
    className?: string
  }

  PRECONDITIONS: [
    "Children must be a valid React element",
    "Content can be string or JSX"
  ]

  STEPS: {
    STEP_1_INITIALIZE: {
      description: "Initialize tooltip state"
      logic: |
        SET isVisible = false
        SET mounted = false
        CREATE triggerRef for children element
        CREATE timeoutRef for delay timer
    }

    STEP_2_HYDRATION_CHECK: {
      description: "Handle SSR hydration"
      logic: |
        USE useEffect to set mounted = true
        PREVENTS hydration mismatch
    }

    STEP_3_HANDLE_MOUSE_ENTER: {
      description: "Show tooltip after delay on hover"
      logic: |
        ON mouse enter trigger:
          CLEAR existing timeout
          SET timeoutRef = setTimeout(() => {
            SET isVisible = true
          }, delay)  // default 200ms
    }

    STEP_4_HANDLE_MOUSE_LEAVE: {
      description: "Hide tooltip on mouse leave"
      logic: |
        ON mouse leave trigger:
          CLEAR timeout
          SET isVisible = false
    }

    STEP_5_CLEANUP_TIMEOUT: {
      description: "Clean up timeout on unmount"
      logic: |
        ON unmount:
          CALL clearTimeout(timeoutRef)
    }

    STEP_6_RENDER_TRIGGER: {
      description: "Render trigger element with ref"
      logic: |
        RENDER div with triggerRef
        APPLY inline-flex wrapper
        RENDER children inside
        ADD mouse enter/leave handlers
    }

    STEP_7_RENDER_TOOLTIP_PORTAL: {
      description: "Render tooltip via Portal"
      logic: |
        IF NOT isVisible THEN return null
        END IF

        IF NOT mounted THEN return null
        END IF

        USE createPortal(tooltip, document.body)
    }

    STEP_8_APPLY_POSITIONING: {
      description: "Apply position and center classes"
      logic: |
        POSITION classes:
          - top: bottom-full mb-2 left-1/2 -translate-x-1/2
          - bottom: top-full mt-2 left-1/2 -translate-x-1/2
          - left: right-full mr-2 top-1/2 -translate-y-1/2
          - right: left-full ml-2 top-1/2 -translate-y-1/2
    }

    STEP_9_RENDER_TOOLTIP_CONTENT: {
      description: "Render tooltip with arrow"
      logic: |
        RENDER tooltip div with:
          - fixed z-50
          - px-3 py-2 text-sm font-medium
          - text-white bg-gray-900
          - rounded-md pointer-events-none
          - animate-in fade-in duration-150
          - position classes

        RENDER arrow triangle:
          - Use CSS border trick
          - Border color matches tooltip bg
          - Position relative to tooltip position

        RENDER content inside
    }
  }

  ERROR_HANDLING: {
    MissingContent: "Don't render tooltip",
    PositioningError: "Default to top",
    RefError: "Use fallback positioning"
  }

  OUTPUT: {
    rendered_component: TriggerAndPortal,
    visible: isVisible,
    z_index: 50,
    animation: "fade-in"
  }

  POSTCONDITIONS: [
    "Tooltip shows after delay",
    "Tooltip positions correctly",
    "Arrow points to trigger",
    "Hides on mouse leave"
  ]
}
```

---

## Key Interfaces

```typescript
// Component Props
interface TooltipWidgetProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

// Component Signature
function TooltipWidget(props: TooltipWidgetProps): JSX.Element

// Position and Arrow Classes
const positionClasses = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2'
}

const arrowClasses = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-t-gray-900',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-b-gray-900',
  left: 'right-[-4px] top-1/2 -translate-y-1/2 border-l-gray-900',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-r-gray-900'
}
```

---

## Integration Points

```pseudo
INTEGRATION TooltipWidget_Integration {
  PARENT_COMPONENTS: [
    "FormInputs (for field hints)",
    "IconButtons (for descriptions)",
    "DataTables (for column headers)",
    "Dashboard (for metrics help)"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for visibility",
    global_state: "None (self-contained)"
  }

  STYLING: {
    theme: "Tailwind CSS",
    colors: "Gray-900 background, white text",
    animation: "Fade-in duration-150",
    arrow: "CSS border triangle"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE TooltipWidget {
  SCENARIO: "Show help text on hover"

  FLOW: {
    CALL TooltipWidget({
      position: "top",
      delay: 200,
      content: "Nhập email hợp lệ",
      children: <input type="email" placeholder="email@example.com" />
    })

    User hovers over input
    After 200ms, tooltip appears above
    User moves away, tooltip disappears
  }
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 262
**Status**: Completed
