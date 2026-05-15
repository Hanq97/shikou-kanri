# Frontend UI Components Specialist

**Role**: UI primitive design and implementation expert
**Focus**: Shadcn/ui components, Radix UI primitives, accessible design
**Technology**: React 19, TypeScript 5, Shadcn/ui, Radix UI, CVA, Tailwind CSS
**Domain**: Vietnamese Legal P2P Insurance & Lending Platform
**Patterns**: 14.1-14.20 (UI Primitives - 20 patterns)
**Last Updated**: 2026-01-03

---

## Specialist Identity

```pseudo
SPECIALIST UIComponentsSpecialist {
  ROLE: "UI primitive design expert for accessible, reusable components"

  RESPONSIBILITIES: [
    "Implement Shadcn/ui component library with Radix UI primitives",
    "Create accessible UI components (ARIA, keyboard navigation)",
    "Design variant systems with CVA (class-variance-authority)",
    "Build form components (Button, Input, Select, Checkbox, Radio)",
    "Create layout components (Card, Dialog, Sheet, Tabs, Accordion)",
    "Implement feedback components (Toast, Alert, Badge, Skeleton, Spinner)",
    "Build data display components (Avatar, Table, Pagination, Tooltip, Popover)",
    "Ensure compound component patterns",
    "Optimize performance with React.forwardRef and React.memo"
  ]

  TECH_STACK: {
    framework: "React 19",
    language: "TypeScript 5",
    ui_library: "Shadcn/ui + Radix UI",
    styling: "Tailwind CSS + CVA",
    icons: "Lucide React",
    architecture: "Feature-Sliced Design (FSD)"
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    accessibility: "WCAG 2.1 AA compliance",
    localization: "Vietnamese primary, English fallback"
  }
}
```

---

## Pattern 14.1: Button Component

### Overview

```pseudo
PATTERN ButtonComponent {
  PURPOSE: "Reusable button with variants, sizes, loading states, polymorphic behavior"

  PROBLEM: "Need consistent button styling across application with multiple variants"

  SOLUTION: "CVA-based variant system + Radix Slot for polymorphism + loading state"

  USE_CASES: [
    "Submit forms with loading state",
    "Polymorphic buttons (render as Link)",
    "Icon-only buttons",
    "Destructive actions (delete, cancel)"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW Button_Component {
  INPUT: {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link",
    size?: "default" | "sm" | "lg" | "icon",
    asChild?: boolean,  # Polymorphic via Radix Slot
    loading?: boolean,
    disabled?: boolean,
    onClick?: (e: MouseEvent) => void,
    children: ReactNode
  }

  FILE_STRUCTURE: |
    shared/ui/
    ├── button.tsx              # Button component with CVA variants
    ├── input.tsx               # Input with validation states
    ├── select.tsx              # Dropdown select (Radix UI)
    ├── checkbox.tsx            # Checkbox (Radix UI)
    └── radio.tsx               # Radio group (Radix UI)

  STEPS: {
    STEP_1_DEFINE_VARIANTS: {
      description: "Define CVA variant system"
      logic: |
        buttonVariants = CVA({
          base_classes: "inline-flex items-center justify-center rounded-md transition-colors focus-visible:ring-2",

          variants: {
            variant: {
              default: "bg-primary text-primary-foreground hover:bg-primary/90",
              destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              outline: "border border-input hover:bg-accent",
              secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
              ghost: "hover:bg-accent hover:text-accent-foreground",
              link: "text-primary underline-offset-4 hover:underline"
            },
            size: {
              default: "h-10 px-4 py-2",
              sm: "h-9 px-3",
              lg: "h-11 px-8",
              icon: "h-10 w-10"
            }
          },

          defaultVariants: { variant: "default", size: "default" }
        })
    }

    STEP_2_HANDLE_POLYMORPHISM: {
      description: "Support rendering as different elements (button, Link)"
      logic: |
        Comp = IF asChild THEN Radix.Slot ELSE "button"

        // Example: <Button asChild><Link href="/users">Users</Link></Button>
        // Renders as: <Link> with button styles
    }

    STEP_3_RENDER_LOADING: {
      description: "Show spinner when loading"
      logic: |
        IF loading THEN
          RENDER <Spinner className="mr-2 h-4 w-4 animate-spin" />
        END IF

        disabled_state = disabled OR loading
    }

    STEP_4_APPLY_ACCESSIBILITY: {
      description: "Ensure ARIA attributes and keyboard support"
      logic: |
        ARIA_ATTRIBUTES = {
          role: "button",
          "aria-busy": loading,
          "aria-disabled": disabled OR loading,
          tabIndex: 0
        }

        keyboard_handler: SPACE or ENTER triggers onClick
    }
  }

  OUTPUT: {
    component: "React.forwardRef<HTMLButtonElement, ButtonProps>",
    display: "Button with variants, loading state, polymorphic rendering, full accessibility"
  }
}
```

---

## Pattern 14.2-14.5: Form Components

### Workflow

```pseudo
WORKFLOW FormComponents_Group {
  COMPONENTS: [
    {
      pattern: "14.2 - Input Component",
      features: ["Validation states (error, success)", "Leading/trailing icons", "Helper text", "Disabled state"],
      radix: "Native HTML input with enhanced styling"
    },
    {
      pattern: "14.3 - Select Component",
      features: ["Dropdown with keyboard nav", "Search/filter", "Multi-select support", "Grouped options"],
      radix: "@radix-ui/react-select"
    },
    {
      pattern: "14.4 - Checkbox Component",
      features: ["Checked, unchecked, indeterminate states", "Label integration", "Accessibility"],
      radix: "@radix-ui/react-checkbox"
    },
    {
      pattern: "14.5 - Radio Group Component",
      features: ["Mutually exclusive options", "Keyboard navigation (arrow keys)", "Label integration"],
      radix: "@radix-ui/react-radio-group"
    }
  ]

  COMMON_PATTERN: |
    1. Wrap Radix UI primitive
    2. Apply Tailwind CSS styling
    3. Add Vietnamese labels/placeholders
    4. Ensure WCAG 2.1 AA compliance
    5. Forward ref for form library integration (React Hook Form)
}
```

---

## Pattern 14.6-14.10: Layout Components

### Workflow

```pseudo
WORKFLOW LayoutComponents_Group {
  PATTERN_14_6_CARD: {
    purpose: "Content container with header, content, footer"
    compound_components: ["Card", "CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"]

    usage: |
      <Card>
        <CardHeader>
          <CardTitle>Tiêu đề</CardTitle>
          <CardDescription>Mô tả</CardDescription>
        </CardHeader>
        <CardContent>Nội dung</CardContent>
        <CardFooter>Buttons or actions</CardFooter>
      </Card>
  }

  PATTERN_14_7_DIALOG: {
    purpose: "Modal dialog with overlay and focus trap"
    radix: "@radix-ui/react-dialog"
    compound_components: ["Dialog", "DialogTrigger", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter"]

    features: [
      "Overlay with backdrop blur",
      "Esc key to close",
      "Click outside to close",
      "Focus trap (focus stays within dialog)",
      "Accessible (ARIA labels, role=dialog)"
    ]
  }

  PATTERN_14_8_SHEET: {
    purpose: "Slide-out panel (drawer) from left/right/top/bottom"
    radix: "@radix-ui/react-dialog (with position variants)"
    variants: ["left", "right", "top", "bottom"]

    usage: |
      <Sheet>
        <SheetTrigger><Button>Open</Button></SheetTrigger>
        <SheetContent side="right">
          <SheetHeader><SheetTitle>Title</SheetTitle></SheetHeader>
          Content here
        </SheetContent>
      </Sheet>
  }

  PATTERN_14_9_TABS: {
    purpose: "Tab navigation for content sections"
    radix: "@radix-ui/react-tabs"
    compound_components: ["Tabs", "TabsList", "TabsTrigger", "TabsContent"]

    features: ["Keyboard navigation (Arrow keys)", "ARIA tablist role", "Active tab indicator"]
  }

  PATTERN_14_10_ACCORDION: {
    purpose: "Collapsible content sections"
    radix: "@radix-ui/react-accordion"
    types: ["single (one open at a time)", "multiple (many open)"]

    features: ["Smooth height animation", "Keyboard navigation", "ARIA expanded state"]
  }
}
```

---

## Pattern 14.11-14.15: Feedback Components

### Workflow

```pseudo
WORKFLOW FeedbackComponents_Group {
  PATTERN_14_11_TOAST: {
    purpose: "Global toast notification system"
    implementation: |
      WORKFLOW ToastSystem {
        STATE: {
          toasts: Toast[],  # Max 5 toasts
          reducer: (state, action) => newState
        }

        ACTIONS: [
          "ADD_TOAST",
          "REMOVE_TOAST",
          "UPDATE_TOAST"
        ]

        FEATURES: [
          "Auto-dismiss after 5 seconds",
          "Stacking (bottom-right corner)",
          "Variants (default, destructive, success)",
          "Action button support",
          "Close button"
        ]

        HOOK: useToast() {
          RETURN {
            toast: (options) => dispatch({ type: "ADD_TOAST", toast }),
            dismiss: (toastId) => dispatch({ type: "REMOVE_TOAST", toastId })
          }
        }
      }
  }

  PATTERN_14_12_ALERT: {
    purpose: "Static alert messages for important information"
    variants: ["default", "destructive", "warning", "success", "info"]

    compound_components: ["Alert", "AlertTitle", "AlertDescription"]
  }

  PATTERN_14_13_BADGE: {
    purpose: "Small status indicator"
    variants: ["default", "secondary", "destructive", "outline", "success"]
    sizes: ["sm", "md", "lg"]

    usage: |
      <Badge variant="success">Active / Hoạt động</Badge>
      <Badge variant="destructive">Error / Lỗi</Badge>
  }

  PATTERN_14_14_SKELETON: {
    purpose: "Loading placeholder"
    animation: "pulse (opacity 0.5 → 1.0)"

    usage: |
      WHILE loading:
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-3/4" />
  }

  PATTERN_14_15_SPINNER: {
    purpose: "Loading spinner"
    sizes: ["sm", "md", "lg"]

    implementation: |
      <svg className="animate-spin" viewBox="0 0 24 24">
        <circle className="opacity-25" ... />
        <path className="opacity-75" ... />
      </svg>
  }
}
```

---

## Pattern 14.16-14.20: Data Display Components

### Workflow

```pseudo
WORKFLOW DataDisplayComponents_Group {
  PATTERN_14_16_AVATAR: {
    purpose: "User avatar with fallback"
    radix: "@radix-ui/react-avatar"

    workflow: |
      IF image_url_exists AND image_loads THEN
        RENDER <AvatarImage src={image_url} alt={name} />
      ELSE
        RENDER <AvatarFallback>{getInitials(name)}</AvatarFallback>
      END IF

    features: ["Circular or rounded", "Status indicator dot", "Size variants", "Fallback to initials"]
  }

  PATTERN_14_17_TABLE: {
    purpose: "Data table with sorting, pagination"

    compound_components: ["Table", "TableHeader", "TableBody", "TableRow", "TableHead", "TableCell", "TableCaption"]

    features: [
      "Sortable columns (click header)",
      "Row selection (checkbox)",
      "Sticky header",
      "Responsive (horizontal scroll on mobile)",
      "Vietnamese column headers"
    ]
  }

  PATTERN_14_18_PAGINATION: {
    purpose: "Page navigation for lists"

    workflow: |
      WORKFLOW Pagination {
        INPUT: { page: number, pageSize: number, total: number }

        CALCULATE: {
          totalPages = Math.ceil(total / pageSize),
          hasNext = page < totalPages,
          hasPrev = page > 1
        }

        RENDER: [
          <PrevButton disabled={!hasPrev} />,
          <PageNumbers current={page} total={totalPages} />,
          <NextButton disabled={!hasNext} />
        ]
      }
  }

  PATTERN_14_19_TOOLTIP: {
    purpose: "Contextual hint on hover"
    radix: "@radix-ui/react-tooltip"

    features: [
      "Show on hover after 300ms delay",
      "Keyboard accessible (focus trigger)",
      "Position: top, bottom, left, right",
      "Arrow indicator"
    ]
  }

  PATTERN_14_20_POPOVER: {
    purpose: "Floating content container"
    radix: "@radix-ui/react-popover"

    usage: |
      <Popover>
        <PopoverTrigger><Button>Open</Button></PopoverTrigger>
        <PopoverContent>
          Complex content (forms, lists, etc.)
        </PopoverContent>
      </Popover>

    features: ["Click to toggle", "Position auto-adjust", "Close on outside click", "Esc to close"]
  }
}
```

---

## Accessibility Patterns

```pseudo
WORKFLOW AccessibilityGuidelines {
  WCAG_2_1_AA_COMPLIANCE: {
    semantic_html: "Use native HTML elements (button, input, select, etc.)",

    aria_attributes: [
      "role (button, dialog, tablist, etc.)",
      "aria-label (descriptive labels)",
      "aria-labelledby (reference label element)",
      "aria-describedby (additional description)",
      "aria-expanded (collapsible state)",
      "aria-pressed (toggle button state)",
      "aria-disabled (disabled state)",
      "aria-live (dynamic content updates)"
    ],

    keyboard_navigation: [
      "Tab: Navigate between focusable elements",
      "Enter/Space: Activate buttons",
      "Esc: Close dialogs/modals",
      "Arrow keys: Navigate lists, tabs, radio groups",
      "Home/End: First/last item in list"
    ],

    focus_management: [
      "Visible focus indicators (ring-2 ring-offset-2)",
      "Focus trap in dialogs",
      "Return focus after close",
      "Skip links for screen readers"
    ],

    color_contrast: [
      "Text: 4.5:1 minimum contrast",
      "Interactive elements: 3:1 minimum",
      "Use Tailwind contrast utilities"
    ]
  }

  VIETNAMESE_ACCESSIBILITY: {
    labels: "Provide Vietnamese labels for all form fields",
    error_messages: "Vietnamese error messages",
    announcements: "Vietnamese ARIA live region messages"
  }
}
```

---

## CVA Variant System

```pseudo
WORKFLOW CVA_VariantSystem {
  PURPOSE: "Type-safe variant styling with class-variance-authority"

  IMPLEMENTATION: |
    import { cva, type VariantProps } from 'class-variance-authority'

    componentVariants = cva(
      "base_classes_applied_to_all_variants",
      {
        variants: {
          variant: {
            default: "classes_for_default",
            destructive: "classes_for_destructive",
            outline: "classes_for_outline"
          },
          size: {
            sm: "small_size_classes",
            md: "medium_size_classes",
            lg: "large_size_classes"
          }
        },
        compoundVariants: [
          {
            variant: "destructive",
            size: "lg",
            className: "additional_classes_when_both_match"
          }
        ],
        defaultVariants: {
          variant: "default",
          size: "md"
        }
      }
    )

  TYPE_EXTRACTION: |
    type ComponentProps = React.ComponentProps<'button'> & VariantProps<typeof componentVariants>

  USAGE: |
    <Button variant="outline" size="lg">Click me</Button>
}
```

---

## Performance Optimization

```pseudo
WORKFLOW OptimizeUIComponents {
  TECHNIQUES: {
    FORWARD_REF: {
      description: "Enable ref forwarding for form library integration"
      usage: |
        const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
          RETURN <button ref={ref} {...props} />
        })
    }

    MEMO: {
      description: "Memoize expensive components"
      usage: |
        export const Card = React.memo(CardComponent)
    }

    LAZY_LOAD: {
      description: "Code-split heavy components (Dialog, Sheet)"
      usage: |
        const Dialog = React.lazy(() => import('./dialog'))
    }

    VIRTUALIZATION: {
      description: "Virtualize long tables/lists"
      library: "@tanstack/react-virtual"
    }
  }
}
```

---

## Testing Strategy

```pseudo
WORKFLOW TestUIComponents {
  UNIT_TESTS: {
    test_variants: |
      DESCRIBE "Button variants" {
        IT "renders default variant" {
          RENDER <Button variant="default">Click</Button>
          EXPECT button.classList.contains("bg-primary")
        }

        IT "renders destructive variant" {
          RENDER <Button variant="destructive">Delete</Button>
          EXPECT button.classList.contains("bg-destructive")
        }
      }

    test_loading_state: |
      IT "shows spinner when loading" {
        RENDER <Button loading={true}>Submit</Button>
        EXPECT screen.getByRole("img", { name: /loading/i })
      }

    test_polymorphism: |
      IT "renders as Link when asChild" {
        RENDER <Button asChild><Link href="/users">Users</Link></Button>
        EXPECT screen.getByRole("link")
      }
  }

  ACCESSIBILITY_TESTS: {
    test_keyboard_nav: |
      IT "activates button on Enter key" {
        const onClick = jest.fn()
        RENDER <Button onClick={onClick}>Click</Button>

        fireEvent.keyDown(button, { key: "Enter" })
        EXPECT onClick.toHaveBeenCalled()
      }

    test_aria_attributes: |
      IT "has correct ARIA attributes when loading" {
        RENDER <Button loading={true}>Submit</Button>
        EXPECT button.getAttribute("aria-busy") toBe "true"
      }

    test_screen_reader: |
      IT "is accessible to screen readers" {
        const { container } = RENDER <Button>Click</Button>
        const results = await axe(container)
        EXPECT results.violations.length toBe 0
      }
  }
}
```

---

## Reference Patterns

**Full Implementation**: See `/tmp/day13-context/fsd-shared-layer-patterns.md`

**Additional Patterns**:
- Patterns 14.21-14.40: Utilities (covered in utilities-specialist.md)
- Patterns 14.41-14.50: API Clients (covered in api-hooks-specialist.md)
- Patterns 14.51-14.55: Custom Hooks (covered in api-hooks-specialist.md)

---

**End of UI Components Specialist**
