---
id: ts-nextjs-unit
stack: typescript-nextjs
type: unit
category: code-gen
subcategory: nextjs
version: 1.0
lines: ~250
token_cost: ~2500
evidence: [E8, E13]
---

# Code Generation Template: Next.js Unit Tests
# コード生成テンプレート：Next.jsユニットテスト

## Template: Component Test

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ${ComponentName} } from './${ComponentName}';

describe('${ComponentName}', () => {
  it('should render ${expectedElement} when ${condition}', () => {
    render(<${ComponentName} ${props} />);

    expect(screen.getByText('${expectedText}')).toBeInTheDocument();
    expect(screen.getByRole('${role}')).toBeVisible();
  });

  it('should call ${handlerName} when ${action}', async () => {
    const ${handlerName} = vi.fn();
    render(<${ComponentName} ${handlerProp}={${handlerName}} />);

    await userEvent.click(screen.getByRole('button', { name: '${buttonLabel}' }));

    expect(${handlerName}).toHaveBeenCalledWith(${expectedArgs});
    expect(${handlerName}).toHaveBeenCalledTimes(1);
  });

  it('should display loading state when ${loadingCondition}', () => {
    render(<${ComponentName} loading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('${dataText}')).not.toBeInTheDocument();
  });
});
```

## Template: Custom Hook Test

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => ${hookName}(${initialArgs}));

    expect(result.current.${stateField}).toBe(${initialValue});
    expect(result.current.${loadingField}).toBe(false);
  });

  it('should update state when ${action} is called', async () => {
    const { result } = renderHook(() => ${hookName}(${initialArgs}));

    act(() => {
      result.current.${actionMethod}(${actionArgs});
    });

    await waitFor(() => {
      expect(result.current.${stateField}).toBe(${updatedValue});
    });
  });

  it('should handle error when ${errorCondition}', async () => {
    const { result } = renderHook(() => ${hookName}(${errorArgs}));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.${stateField}).toBe(${fallbackValue});
    });
  });
});
```

## Template: Redux Store Test

```tsx
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import ${sliceName}Reducer, {
  ${actionName},
  select${StateName},
} from './${sliceName}Slice';

describe('${sliceName}Slice', () => {
  function createTestStore() {
    return configureStore({
      reducer: { ${sliceKey}: ${sliceName}Reducer },
    });
  }

  it('should have correct initial state', () => {
    const store = createTestStore();

    expect(select${StateName}(store.getState())).toEqual(${initialState});
  });

  it('should handle ${actionName}', () => {
    const store = createTestStore();

    store.dispatch(${actionName}(${actionPayload}));

    expect(select${StateName}(store.getState())).toEqual(${expectedState});
  });

  it('should handle async thunk ${thunkName}', async () => {
    const store = createTestStore();

    await store.dispatch(${thunkName}(${thunkArgs}));

    const state = store.getState().${sliceKey};
    expect(state.loading).toBe(false);
    expect(state.data).toEqual(${expectedData});
  });
});
```

## Template: Utility Function Test

```tsx
import { describe, it, expect } from 'vitest';
import { ${functionName} } from './${utilFile}';

describe('${functionName}', () => {
  it('should return ${expected} when ${inputDescription}', () => {
    const result = ${functionName}(${input});

    expect(result).toEqual(${expected});
  });

  it('should throw when ${invalidInput}', () => {
    expect(() => ${functionName}(${invalidInput})).toThrow(${errorMessage});
  });
});
```
