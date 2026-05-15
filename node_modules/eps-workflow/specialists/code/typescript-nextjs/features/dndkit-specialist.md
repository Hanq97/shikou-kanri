# @dnd-kit Drag & Drop Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 65.1–65.6 |
| **Source Paths** | Drag-and-drop components in workflow and page builder |
| **File Count** | 5-10 components using dnd-kit |
| **Naming Convention** | Standard component naming |
| **Imports From** | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| **Imported By** | Workflow designer, page builder, settings modules |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application uses @dnd-kit (NOT react-beautiful-dnd or react-dnd) for 3 distinct drag-and-drop patterns: horizontal tab reordering, vertical table row reordering, and 2D kanban card dragging. Each pattern uses different sensor configurations.

---

## Key Concepts

### 65.1 — Package Versions

| Package | Version |
|---------|---------|
| `@dnd-kit/core` | ^6.3.1 |
| `@dnd-kit/sortable` | ^10.0.0 |
| `@dnd-kit/modifiers` | ^9.0.0 |
| `@dnd-kit/utilities` | ^3.2.2 |

### 65.2 — Pattern 1: Horizontal Tab Reordering

- **File**: `ctm001000/ctm001001_page_builder/DraggableTabs.tsx` (113 lines)
- **Strategy**: `horizontalListSortingStrategy`
- **Sensor**: `PointerSensor` with `activationConstraint: { distance: 10 }`
- **Integration**: Ant Design Tabs with custom tab bar renderer
- **Hooks**: `useSortable`, `useSensor`, `DndContext`

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
);

<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <SortableContext items={tabItems} strategy={horizontalListSortingStrategy}>
    {tabItems.map(item => <SortableTab key={item.key} {...item} />)}
  </SortableContext>
</DndContext>
```

### 65.3 — Pattern 2: Vertical Row Reordering

- **File**: `cmn005000/cmn005001_jobposition_management/JobPositionManagement.tsx`
- **Strategy**: `verticalListSortingStrategy`
- **Sensor**: `PointerSensor` with `activationConstraint: { distance: 1 }` (more sensitive)
- **Integration**: Ant Design Table rows with `onSortEnd` callback

### 65.4 — Pattern 3: Kanban 2D Drag

- **File**: `presentation/ui/components/core/block/TableCard.tsx` (100+ lines)
- **Sensors**: `PointerSensor` + `KeyboardSensor` (with `sortableKeyboardCoordinates`)
- **Collision**: `closestCorners` (cross-container detection)
- **Components**: `DragOverlay` for drag preview
- **Hooks**: `useSensor`, `useSensors`, `useSortable`, `useDroppable`

### 65.5 — DndContext + SortableContext Setup

```typescript
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <SortableContext items={items} strategy={verticalListSortingStrategy}>
    {items.map(item => <SortableItem key={item.id} id={item.id} />)}
  </SortableContext>
</DndContext>
```

### 65.6 — Sensor Configuration Comparison

| Pattern | Sensor | Distance | Reason |
|---------|--------|----------|--------|
| Tab reorder | PointerSensor | 10px | Prevents accidental drag on tab click |
| Row reorder | PointerSensor | 1px | Immediate drag response needed |
| Kanban | Pointer + Keyboard | 1px | Accessibility support required |

---

## Anti-Patterns

- Using `react-beautiful-dnd` or `react-dnd` (project uses @dnd-kit exclusively)
- Using `distance: 0` for tab reordering (causes accidental drags on click)
- Missing `KeyboardSensor` in kanban pattern (accessibility violation)
- Forgetting `DragOverlay` for kanban (causes visual glitches during drag)
- Using `closestCenter` for kanban (use `closestCorners` for cross-container)

---

## Related Specialists

- `crud-page-patterns-specialist.md` (82.x) — Table integration
- `table-datagrid-specialist.md` (83.x) — Row reorder in tables
- `workflow-designer-specialist.md` (60.x) — ReactFlow (different DnD lib)
