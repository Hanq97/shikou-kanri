# Widget 11.37: DrawerWidget

**Type**: Overlay Widget
**Role**: Slide-out drawer with left, right, or bottom positioning
**Technology**: React 19, TypeScript, React Portal
**Domain**: Vietnamese P2P Insurance & Lending Platform
**Status**: Production-Ready

---

## Specialist Identity

```pseudo
WIDGET DrawerWidget {
  ROLE: "Slide-out drawer overlay for side panels"

  RESPONSIBILITIES: [
    "Render drawer with flexible positioning (left/right/bottom)",
    "Support multiple size options",
    "Handle escape key to close",
    "Manage body overflow",
    "Support sticky header and footer",
    "Use React Portal for DOM independence"
  ]

  TECH_STACK: {
    primary: "React 19 with TypeScript",
    portal: "React createPortal API",
    state_management: "React useRef, useEffect",
    ui_library: "Custom UI components (@/shared/ui/)",
    animation: "Tailwind CSS transition"
  }

  DOMAIN_CONTEXT: {
    use_case: "Side panels for filters, details, forms",
    positions: ["left", "right", "bottom"]
  }
}
```

---

## Pattern Overview

```pseudo
PATTERN DrawerWidget_Widget {
  PURPOSE: "Slide-out drawer for side panels and mobile sheets"

  PROBLEM: "Need flexible drawer that can position left, right, or bottom"

  SOLUTION: "Portal-based drawer with smooth slide animation and multiple positions"

  USE_CASES: [
    "Right drawer for filters",
    "Right drawer for details",
    "Bottom sheet for mobile",
    "Left navigation on mobile"
  ]

  COMPLEXITY: "MEDIUM"
}
```

---

## Workflow

```pseudo
WORKFLOW DrawerWidget_Workflow {
  INPUT: {
    isOpen: boolean,
    onClose: Function,
    title?: string,
    description?: string,
    children: ReactNode,
    position?: "left" | "right" | "bottom",
    size?: "sm" | "md" | "lg",
    showCloseButton?: boolean,
    footer?: ReactNode
  }

  PRECONDITIONS: [
    "onClose callback required",
    "position determines animation direction"
  ]

  STEPS: {
    STEP_1_DETERMINE_DIMENSIONS: {
      description: "Calculate drawer dimensions based on position and size"
      logic: |
        IF position != "bottom" THEN
          width = size map (sm: w-64, md: w-80, lg: w-96)
        ELSE
          width = "w-full"
          height = "max-h-[80vh]"
        END IF
    }

    STEP_2_HANDLE_ESCAPE: {
      description: "Close drawer on Escape key"
      logic: |
        ON Escape key:
          CALL onClose()
    }

    STEP_3_MANAGE_SCROLL: {
      description: "Prevent body scroll when drawer open"
      logic: |
        WHEN open:
          SET document.body.style.overflow = 'hidden'
        ON close:
          SET document.body.style.overflow = 'unset'
    }

    STEP_4_RENDER_PORTAL: {
      description: "Use Portal to render outside DOM tree"
      logic: |
        IF NOT isOpen THEN return null
        END IF

        USE createPortal(drawerContent, document.body)
    }

    STEP_5_RENDER_OVERLAY: {
      description: "Render semi-transparent overlay"
      logic: |
        RENDER overlay with:
          - position: fixed, inset-0
          - bg-black/40
          - z-50
          - role: presentation

        ON overlay click:
          CALL onClose()
    }

    STEP_6_RENDER_DRAWER_CONTAINER: {
      description: "Render drawer with position and animation"
      logic: |
        POSITION drawer:
          - IF left: left-0 top-0
          - IF right: right-0 top-0
          - IF bottom: bottom-0 left-0 right-0

        APPLY animation:
          - transition-transform duration-300 ease-in-out

        SIZE drawer:
          - width from sizeMap
          - height: h-screen (left/right) or max-h-[80vh] (bottom)

        ROUND corners:
          - IF left: rounded-r-lg
          - IF right: rounded-l-lg
          - IF bottom: rounded-t-lg
    }

    STEP_7_RENDER_SECTIONS: {
      description: "Render header, content, footer"
      logic: |
        RENDER sticky header with:
          - border-b
          - title and description
          - close button

        RENDER scrollable content:
          - flex-1 overflow-y-auto
          - p-6

        RENDER sticky footer:
          - border-t
          - flex justify-end
          - gap-3
          - footer content
    }
  }

  ERROR_HANDLING: {
    OverflowError: "Set min-h for content",
    PositionError: "Default to right",
    SizeError: "Default to md"
  }

  OUTPUT: {
    rendered_component: PortalElement,
    visible: isOpen,
    position: left/right/bottom,
    animated: true,
    z_index: 50
  }

  POSTCONDITIONS: [
    "Drawer slides from correct direction",
    "Escape key closes drawer",
    "Body doesn't scroll when open",
    "Header/footer stay sticky"
  ]
}
```

---

## Key Interfaces

```typescript
// Component Props
interface DrawerWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

// Component Signature
function DrawerWidget(props: DrawerWidgetProps): JSX.Element | null

// Size Map
const sizeMap = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96'
}
```

---

## Integration Points

```pseudo
INTEGRATION DrawerWidget_Integration {
  PARENT_COMPONENTS: [
    "FilterPanel (right drawer for filters)",
    "DetailPanel (right drawer for details)",
    "MobileNavigation (bottom sheet on mobile)",
    "SidePanel (left drawer)"
  ]

  STATE_MANAGEMENT: {
    local_state: "useState for isOpen",
    global_state: "Zustand overlay store"
  }

  STYLING: {
    theme: "Tailwind CSS",
    positions: "left, right, bottom",
    sizes: "sm, md, lg",
    animation: "slide with 300ms duration"
  }
}
```

---

## Usage Example

```pseudo
USAGE_EXAMPLE DrawerWidget {
  SCENARIO: "Show filter drawer on right side"

  FLOW: {
    const [isOpen, setIsOpen] = useState(false)

    CALL DrawerWidget({
      isOpen: isOpen,
      onClose: () => setIsOpen(false),
      title: "Bộ lọc",
      position: "right",
      size: "md",
      children: <FilterContent />,
      footer: [
        <Button onClick={() => setIsOpen(false)}>Hủy</Button>,
        <Button onClick={applyFilters}>Áp dụng</Button>
      ]
    })
  }
}
```

---

**Last Updated**: 2026-01-02
**Lines**: 245
**Status**: Completed
