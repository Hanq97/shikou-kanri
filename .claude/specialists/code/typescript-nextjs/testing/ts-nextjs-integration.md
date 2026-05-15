---
id: ts-nextjs-integration
stack: typescript-nextjs
type: integration
category: code-gen
subcategory: nextjs
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E12]
---

# Code Generation Template: Next.js Integration Tests
# コード生成テンプレート：Next.js統合テスト

## Template: MSW Setup

```tsx
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('${apiBaseUrl}/${resource}', () => {
    return HttpResponse.json(${mockData});
  }),
  http.post('${apiBaseUrl}/${resource}', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '${newId}', ...body }, { status: 201 });
  }),
  http.get('${apiBaseUrl}/${resource}/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, ...${mockDetailData} });
  }),
];

export const server = setupServer(...handlers);
```

## Template: Integration Test with MSW

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { ${ComponentName} } from './${ComponentName}';
import { renderWithProviders } from '../helpers/renderWithProviders';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('${ComponentName} Integration', () => {
  it('should fetch and display ${resource} list', async () => {
    renderWithProviders(<${ComponentName} />);

    // Verify loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('${expectedItemText}')).toBeInTheDocument();
    });

    // Verify data rendered correctly
    expect(screen.getAllByRole('row')).toHaveLength(${expectedCount});
  });

  it('should handle API error gracefully', async () => {
    server.use(
      http.get('${apiBaseUrl}/${resource}', () => {
        return HttpResponse.json(
          { message: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<${ComponentName} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should create ${resource} and refresh list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<${ComponentName} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('${expectedItemText}')).toBeInTheDocument();
    });

    // Open create form
    await user.click(screen.getByRole('button', { name: /add|create/i }));

    // Fill form
    await user.type(screen.getByLabelText('${fieldLabel}'), '${fieldValue}');

    // Submit
    await user.click(screen.getByRole('button', { name: /save|submit/i }));

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('${successMessage}')).toBeInTheDocument();
    });
  });
});
```

## Template: API Client Test

```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { ${apiClientName} } from '../../infrastructure/api/${apiClientFile}';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('${apiClientName}', () => {
  it('should fetch ${resource} by id', async () => {
    const result = await ${apiClientName}.getById('${testId}');

    expect(result).toBeDefined();
    expect(result.id).toBe('${testId}');
    expect(result.${field}).toBe(${expectedValue});
  });

  it('should handle 404 response', async () => {
    server.use(
      http.get('${apiBaseUrl}/${resource}/:id', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    await expect(${apiClientName}.getById('nonexistent'))
      .rejects.toThrow(/not found/i);
  });

  it('should handle 401 and trigger auth refresh', async () => {
    server.use(
      http.get('${apiBaseUrl}/${resource}', () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(${apiClientName}.getAll())
      .rejects.toThrow(/unauthorized/i);
  });
});
```

## Template: renderWithProviders Helper

```tsx
import { render, RenderOptions } from '@testing-library/react';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { rootReducer, RootState } from '../../store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: EnhancedStore;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({ reducer: rootReducer, preloadedState }),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
```
