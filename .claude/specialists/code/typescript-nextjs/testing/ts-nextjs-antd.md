---
id: ts-nextjs-antd
stack: typescript-nextjs
type: antd
category: code-gen
subcategory: nextjs
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E9]
---

# Code Generation Template: Ant Design 5 Component Tests
# コード生成テンプレート：Ant Design 5コンポーネントテスト

## Template: Select Component Test

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { ${ComponentName} } from './${ComponentName}';

describe('${ComponentName} Select', () => {
  it('should open dropdown and select option', async () => {
    const onChange = vi.fn();
    render(<${ComponentName} onChange={onChange} />);

    // Open Select dropdown (Ant Design requires mouseDown on combobox)
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Scope to dropdown portal
    const dropdown = document.querySelector('.ant-select-dropdown')!;
    const option = within(dropdown as HTMLElement).getByText('${optionLabel}');
    fireEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('${optionValue}', expect.any(Object));
    });
  });

  it('should filter options on search', async () => {
    render(<${ComponentName} showSearch />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '${searchTerm}' } });

    const dropdown = document.querySelector('.ant-select-dropdown')!;
    const options = within(dropdown as HTMLElement).getAllByRole('option');
    expect(options).toHaveLength(${filteredCount});
  });
});
```

## Template: Modal Component Test

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${ComponentName} } from './${ComponentName}';

describe('${ComponentName} Modal', () => {
  it('should open modal and display content', async () => {
    const user = userEvent.setup();
    render(<${ComponentName} />);

    // Click trigger to open modal
    await user.click(screen.getByRole('button', { name: '${triggerLabel}' }));

    // Scope to modal portal
    const modal = document.querySelector('.ant-modal')!;
    expect(within(modal as HTMLElement).getByText('${modalTitle}')).toBeInTheDocument();
  });

  it('should submit form in modal and close', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<${ComponentName} onSubmit={onSubmit} />);

    // Open modal
    await user.click(screen.getByRole('button', { name: '${triggerLabel}' }));

    // Fill form inside modal
    const modal = document.querySelector('.ant-modal')!;
    const input = within(modal as HTMLElement).getByLabelText('${fieldLabel}');
    await user.type(input, '${testValue}');

    // Click OK button
    await user.click(within(modal as HTMLElement).getByText('OK'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(document.querySelector('.ant-modal')).toBeNull();
    });
  });
});
```

## Template: Table Component Test

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${ComponentName} } from './${ComponentName}';

describe('${ComponentName} Table', () => {
  const mockData = [
    { key: '1', ${field}: '${value1}' },
    { key: '2', ${field}: '${value2}' },
  ];

  it('should render table with data rows', () => {
    render(<${ComponentName} dataSource={mockData} />);

    const rows = screen.getAllByRole('row');
    // First row is header
    expect(rows).toHaveLength(mockData.length + 1);
    expect(within(rows[1]).getByText('${value1}')).toBeInTheDocument();
  });

  it('should sort column on header click', async () => {
    const user = userEvent.setup();
    render(<${ComponentName} dataSource={mockData} />);

    // Click column header to sort
    await user.click(screen.getByText('${columnTitle}'));

    const rows = screen.getAllByRole('row');
    // Verify sort order changed
    expect(within(rows[1]).getByText('${sortedFirstValue}')).toBeInTheDocument();
  });

  it('should paginate when data exceeds page size', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      key: String(i),
      ${field}: \`Item \${i}\`,
    }));
    render(<${ComponentName} dataSource={largeData} pagination={{ pageSize: 10 }} />);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(11); // 10 data + 1 header
    expect(screen.getByText('1 / 3')).toBeInTheDocument(); // pagination info
  });
});
```

## Template: Form Validation Test

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${FormComponentName} } from './${FormComponentName}';

describe('${FormComponentName} Validation', () => {
  it('should show validation errors for required fields', async () => {
    const user = userEvent.setup();
    render(<${FormComponentName} />);

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /submit|save/i }));

    await waitFor(() => {
      expect(screen.getByText('${requiredFieldError}')).toBeInTheDocument();
    });
  });

  it('should submit successfully with valid data', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<${FormComponentName} onFinish={onFinish} />);

    // Fill all required fields
    await user.type(screen.getByLabelText('${fieldLabel}'), '${validValue}');

    // Submit form
    await user.click(screen.getByRole('button', { name: /submit|save/i }));

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({ ${fieldName}: '${validValue}' })
      );
    });
  });
});
```
