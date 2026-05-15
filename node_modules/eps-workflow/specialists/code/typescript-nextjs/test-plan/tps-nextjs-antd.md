---
id: tps-nextjs-antd
stack: typescript-nextjs
type: antd
category: test-plan
subcategory: nextjs
version: 1.0
lines: ~200
token_cost: ~2000
evidence: [E9]
---

# Ant Design 5 Test Patterns for Next.js
# Next.js + Ant Design 5のテストパターン

## SECTION 1: PATTERNS

### Select Component Testing
- `fireEvent.mouseDown(getByRole('combobox'))` — open Select dropdown
- `within(document.querySelector('.ant-select-dropdown'))` — scope to dropdown
- `fireEvent.click(getByText('Option Label'))` — select option
- `waitFor(() => expect(...))` — wait for selection state update

### Modal Component Testing
- `fireEvent.click(trigger)` — open modal
- `within(document.querySelector('.ant-modal'))` — scope to modal container
- `screen.getByText('OK')` — find modal action buttons
- `waitFor(() => expect(modal).not.toBeInTheDocument())` — verify close

### Table Component Testing
- `screen.getAllByRole('row')` — get table rows
- `within(rows[0]).getByText(expectedCell)` — verify cell content
- `fireEvent.click(columnHeader)` — trigger sort
- `fireEvent.change(searchInput)` — trigger table filter

### Form Component Testing
- `fireEvent.change(input, { target: { value: 'test' } })` — fill field
- `fireEvent.submit(form)` — trigger form submission
- `waitFor(() => expect(getByText('Required')))` — verify validation message
- `Form.useForm()` — test form instance methods (setFieldsValue, resetFields)

### DatePicker / TimePicker
- `fireEvent.mouseDown(getByPlaceholderText('Select date'))` — open picker
- Navigate calendar via `.ant-picker-cell` clicks
- `fireEvent.click(getByText(dayNumber))` — select date
- Verify formatted display value after selection

## SECTION 2: DECISION MATRIX

| Scenario | Pattern | Why |
|----------|---------|-----|
| Select dropdown | mouseDown + within(dropdown) | Ant renders dropdown in portal |
| Modal interaction | click trigger + within(modal) | Modal renders in portal too |
| Table data display | getAllByRole('row') + within | Standard table queries |
| Table sort/filter | click header + verify order | User-driven table operations |
| Form validation | change + submit + waitFor(error) | Async Ant Design validation |
| Form prefill | setFieldsValue + verify display | API data → form mapping |

## SECTION 3: QUALITY CRITERIA

### Naming Convention
- Pattern: `describe('AntdComponentName') → it('should [behavior] when [interaction]')`
- Example: `it('should show validation error when submitting empty required field')`

### Assertion Requirements
- Minimum 2 assertions per Ant Design component test
- Must verify: interaction result + visual feedback (error, selected state)
- Portal components (Select, Modal, Popover): MUST use `within()` scoping

### Coverage Targets
- Every Ant Design component used in the feature has interaction test
- Form: valid submission + validation error for each field type
- Table: render + sort + filter + pagination
- Select: open + select + clear
