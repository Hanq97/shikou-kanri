---
id: tps-nextjs-unit
stack: typescript-nextjs
type: unit
category: test-plan
subcategory: nextjs
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E8, E13]
---

# Unit Test Patterns for Next.js
# Next.jsのユニットテストパターン

## SECTION 1: PATTERNS

### Component Testing
- `render(<Component />)` — React Testing Library render
- `screen.getByText()`, `screen.getByRole()` — accessible queries
- `userEvent.click()`, `userEvent.type()` — user interaction simulation
- `waitFor(() => expect(...))` — async state update assertions

### Custom Hook Testing
- `renderHook(() => useCustomHook())` — isolated hook render
- `act(() => result.current.method())` — trigger hook state updates
- `waitForNextUpdate()` — wait for async hook effects
- Test both initial state and state transitions

### Redux Store Testing
- `configureStore({ reducer: { key: reducer } })` — create test store
- `store.dispatch(action)` — trigger state changes
- `store.getState().key` — assert state shape
- `renderWithProviders(<Component />, { store })` — connected component testing

### Utility / Service Testing
- Direct function import and assertion
- `vi.fn()` — mock functions for dependency injection
- `vi.spyOn(module, 'method')` — spy on module methods
- `vi.useFakeTimers()` — control time-dependent logic

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Component render | render() + screen.getBy* | RTL best practice, accessible queries |
| Hook with state | renderHook() + act() | Isolated hook testing without component |
| Redux-connected | renderWithProviders() + store mock | Full state integration testing |
| User interaction | userEvent.click/type | Simulates real user behavior |
| Async data fetch | waitFor() + mock | Verifies loading/success/error states |
| Pure utility | Direct import + assert | No DOM needed, fast |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `describe('ComponentName') → it('should [behavior] when [condition]')`
- Example: `it('should display error message when form validation fails')`

### Assertion Requirements
- Minimum 2 assertions per test
- Must verify: rendered output + user interaction effects
- Prefer accessible queries: `getByRole`, `getByLabelText` over `getByTestId`

### Coverage Targets
- 80% statement coverage, 60% branch coverage
- Every component has at least render test + interaction test
- Every custom hook has initial state + state transition test
