# Block/Screen Rendering Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 56.1–56.5 |
| **Source Paths** | `src/presentation/ui/components/core/block/` |
| **File Count** | 1 main file (~1,120 lines) + support components |
| **Naming Convention** | `block/index.tsx` for renderer |
| **Barrel Export** | N/A (single file) |
| **Imports From** | Domain: entity interfaces (IScreen, IBlock, IComponent) |
| **Imported By** | Presentation: page-builder containers, screen containers |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application supports dynamic screen composition using a 3-tier entity model: `IScreen` → `IBlock` → `IComponent`. Each screen contains blocks, and each block contains components. The single monolithic file `block/index.tsx` (~1,120 lines) renders components by dispatching on `IComponent.componentType` via the `FormcomponentTypes` enum (if/else at component level). react-grid-layout provides responsive grid positioning. Container components handle data; block/component sub-components are purely presentational.

---

## Key Concepts

### 56.1 — 3-Tier Entity Model: IScreen → IBlock → IComponent

```typescript
// domain/entities/screen.ts
interface IScreen {
  id: string;
  screenId: string;
  screenCode: string;
  blocks: IBlock[];
}

interface IBlock {
  id: string;
  screenId: string;
  blockTitle: string;
  blockType: string;
  components: IComponent[];
  layout: GridLayout;
}

interface IComponent {
  id: string;
  componentType: string;   // dispatched via FormcomponentTypes enum
  label: string;
  required: boolean;
  readOnly: boolean;
  // ... additional component-specific fields
}
```

### 56.2 — Single-File Component Renderer

All component types are rendered from a single file (`block/index.tsx`, ~1,120 lines).
Dispatch uses if/else on `element.componentType === FormcomponentTypes.XXX` at the
IComponent level (NOT switch/case on blockType).
There is NO registry pattern and NO separate `blockRegistry.ts` file.

### 56.3 — Two-Level Render Loop

The parent screen component iterates `screen.blocks`, and for each block, iterates
`block.components`. Each component is rendered via dispatch on `componentType`.

### 56.4 — react-grid-layout Integration

Each block carries a `layout` field (x, y, w, h, minW, minH). The grid wrapper reads these to position blocks responsively.

### 56.5 — Container/Presentational Split

- `List` container fetches screen definition and dispatches to Redux
- Block sub-components render from props only — no direct store access

---

## Code Examples

### Component Renderer (Pattern 56.2)

```typescript
// src/presentation/ui/components/core/block/index.tsx
// Single file, ~1,120 lines — dispatches on IComponent.componentType
import React from 'react';
import { FormcomponentTypes } from '@/domain/enums';

// Dispatch at IComponent level using if/else on componentType
function renderComponent(element: IComponent, form?: FormInstance) {
  if (element.componentType === FormcomponentTypes.TEXT_INPUT) {
    return <TextInputComponent element={element} form={form} />;
  } else if (element.componentType === FormcomponentTypes.SELECT) {
    return <SelectComponent element={element} form={form} />;
  } else if (element.componentType === FormcomponentTypes.CHECKBOX) {
    return <CheckboxComponent element={element} form={form} />;
  } else if (element.componentType === FormcomponentTypes.DATE_PICKER) {
    return <DatePickerComponent element={element} form={form} />;
  } else if (element.componentType === FormcomponentTypes.TABLE) {
    return <TableComponent element={element} />;
  } else if (element.componentType === FormcomponentTypes.ADDRESS) {
    return <AddressComponent element={element} form={form} />;
  }
  // ... handles all FormcomponentTypes enum values
  return null;
}
```

### Two-Level Render Loop with Grid Layout (Pattern 56.3)

```typescript
// Within a screen container component
import ReactGridLayout from 'react-grid-layout';

function renderScreen(screen: IScreen, form: FormInstance) {
  const layouts = screen.blocks.map((b) => ({ i: b.id, ...b.layout }));

  return (
    <ReactGridLayout layout={layouts} cols={12} rowHeight={30} isResizable isDraggable={false}>
      {screen.blocks.map((block) => (
        <div key={block.id}>
          <BlockWrapper block={block}>
            {block.components.map((component) => (
              <React.Fragment key={component.id}>
                {renderComponent(component, form)}
              </React.Fragment>
            ))}
          </BlockWrapper>
        </div>
      ))}
    </ReactGridLayout>
  );
}
```

### Container Loading Screen (Pattern 56.5)

```typescript
// containers/ScreenContainer.tsx
export function ScreenContainer({ screenCode }: { screenCode: string }) {
  const dispatch = useAppDispatch();
  const screen = useAppSelector(selectScreen(screenCode));

  useEffect(() => {
    getScreenFactory({ screenCode }).then((s) => dispatch(setScreen(s)));
  }, [screenCode]);

  if (!screen) return <Skeleton active />;
  return renderScreen(screen);
}
```

---

## Anti-Patterns

- Fetching data inside a Block/Component sub-component (they are presentational)
- Hardcoding screen layout instead of reading from `IBlock.layout`
- Creating a separate registry file when conditional rendering is sufficient
- Dispatching on `blockType` instead of `componentType` (actual dispatches at IComponent level)
- Passing the entire Redux store slice to a block via props
- Adding new component types without updating the if/else chain in `block/index.tsx`
- Ignoring the 3-tier model (IScreen→IBlock→IComponent) by flattening to 2 tiers

---

## Related Specialists

- `antd-form-specialist.md` — FormBlock internals
- `module-organization-specialist.md` — Where block files live
- `redux-toolkit-specialist.md` — layoutSlice for block state
