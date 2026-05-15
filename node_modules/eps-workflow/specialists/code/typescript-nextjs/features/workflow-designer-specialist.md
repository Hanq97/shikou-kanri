# Workflow Designer Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (UI) + Core (services) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 60.1–60.4 |
| **Source Paths** | `src/presentation/ui/modules/cmn015000/`, `src/core/services/workflowLoaderService.ts`, `src/core/services/workflowScreenService.ts` |
| **File Count** | cmn015000 module files + 2 core services + provider files |
| **Naming Convention** | Standard module convention (containers/ + blocks/) |
| **Barrel Export** | `cmn015000/index.ts` |
| **Imports From** | Core: workflow services; Infrastructure: workflow API |
| **Imported By** | App: route mapping for workflow screens |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The `cmn015000` module provides a visual workflow designer built on ReactFlow 11.11.4. Users build DAG (Directed Acyclic Graph) workflows by dragging nodes from a palette. `WorkflowProvider` manages runtime state. Hook-based APIs expose workflow operations. React-DnD handles drag-and-drop from palette to canvas.

---

## Key Concepts

### 60.1 — Module Structure

```
cmn015000_workflow_designer/
  cmn015001_list/        # Workflow list screen
  cmn015002_designer/    # Visual DAG builder
  cmn015005_version_history/  # Version history viewer
```

### 60.2 — WorkflowProvider Context

Provides the ReactFlow instance, node registry, and execution state to all child components. Must wrap the designer screen.

### 60.3 — Designer Hooks

| Hook | Purpose |
|------|---------|
| `useWorkflowScreen()` | Access current screen definition |
| `useWorkflowState()` | Read nodes, edges, execution state |
| `useWorkflowTestExecutor()` | Test-run the workflow from a node |
| `useWorkflowDispatch()` | Trigger workflow save/publish/reset |

### 60.4 — React-DnD Integration

Palette items are drag sources; the ReactFlow canvas is the drop target. On drop, a new node is created at the drop coordinates with a default config.

---

## Code Examples

### WorkflowProvider (Pattern 60.2)

```typescript
// src/presentation/ui/modules/cmn015000/providers/WorkflowProvider.tsx
import { ReactFlowProvider } from 'reactflow';
import { WorkflowContext, WorkflowContextValue } from './WorkflowContext';

interface Props {
  workflowId: string;
  children: React.ReactNode;
}

export function WorkflowProvider({ workflowId, children }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');

  const value: WorkflowContextValue = {
    workflowId, nodes, edges,
    onNodesChange, onEdgesChange,
    executionState, setExecutionState,
  };

  return (
    <ReactFlowProvider>
      <WorkflowContext.Provider value={value}>
        {children}
      </WorkflowContext.Provider>
    </ReactFlowProvider>
  );
}
```

### useWorkflowState Hook (Pattern 60.3)

```typescript
// src/presentation/ui/modules/cmn015000/hooks/useWorkflowState.ts
import { useContext } from 'react';
import { WorkflowContext } from '../providers/WorkflowContext';

export function useWorkflowState() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflowState must be inside WorkflowProvider');
  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    executionState: ctx.executionState,
  };
}
```

### Designer Canvas (Pattern 60.2)

```typescript
// cmn015002_designer/blocks/WorkflowCanvas.tsx
import ReactFlow, { Controls, MiniMap, Background } from 'reactflow';
import { useWorkflowState } from '../hooks/useWorkflowState';
import { NODE_TYPES } from '../nodeTypes';

export function WorkflowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useWorkflowState();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={NODE_TYPES}
      fitView
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" gap={12} size={1} />
    </ReactFlow>
  );
}
```

### Drag-and-Drop from Palette (Pattern 60.4)

```typescript
// cmn015002_designer/blocks/NodePalette.tsx
import { useDrag } from 'react-dnd';

interface PaletteItemProps {
  nodeType: string;
  label: string;
}

export function PaletteItem({ nodeType, label }: PaletteItemProps) {
  const [, dragRef] = useDrag(() => ({
    type: 'WORKFLOW_NODE',
    item: { nodeType },
  }));

  return (
    <div ref={dragRef} className="palette-item">
      {label}
    </div>
  );
}
```

---

## Anti-Patterns

- Calling ReactFlow hooks outside `ReactFlowProvider`
- Storing node/edge data in Redux (workflow state belongs in WorkflowProvider)
- Creating circular edges (DAG validation must reject back-edges)
- Embedding workflow designer inside a modal (needs full-height layout)

---

## Related Specialists

- `block-screen-specialist.md` — General block rendering concepts
- `redux-toolkit-specialist.md` — Only execution logs go to Redux, not graph state
- `module-organization-specialist.md` — cmn015000 module structure
