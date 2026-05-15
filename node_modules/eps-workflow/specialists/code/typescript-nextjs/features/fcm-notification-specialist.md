# FCM Notification Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation (provider) |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 61.1–61.3 |
| **Source Paths** | `src/presentation/providers/FCMNotificationProvider.tsx` |
| **File Count** | 1 provider + firebase config |
| **Naming Convention** | `{Feature}Provider.tsx` |
| **Barrel Export** | N/A (direct import) |
| **Imports From** | Core: constants (firebase config) |
| **Imported By** | App: root layout wraps with this provider |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

The application uses Firebase 12.4.0 for browser push notifications. `FCMNotificationProvider` initializes the Firebase app, requests notification permission, and manages the FCM token. `useNotification()` provides typed notification methods backed by Ant Design's `App.useApp()` for in-app toast/message display.

---

## Key Concepts

### 61.1 — FCMNotificationProvider

Initializes Firebase, requests browser notification permission, registers service worker, and obtains the FCM token. Stores the token for backend registration.

### 61.2 — useNotification Hook

Returns a 6-part object: `success`, `info`, `warning`, `error`, `message`, `config`. Note: `success()` takes NO arguments. Internally uses Ant Design `App.useApp()` for consistent placement and styling. Channel configuration via `getChannelConfigFactory()`.

### 61.3 — Global Notification Configuration

Configured once via `App` from Ant Design with:
- `placement: 'topRight'`
- `maxCount: 5`
- `duration: 4` (seconds)

---

## Code Examples

### FCMNotificationProvider (Pattern 61.1)

```typescript
// src/presentation/providers/FCMNotificationProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FCMContextValue {
  fcmToken: string | null;
  permissionGranted: boolean;
}

const FCMContext = createContext<FCMContextValue>({ fcmToken: null, permissionGranted: false });

export function FCMNotificationProvider({ children }: { children: React.ReactNode }) {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    Notification.requestPermission().then(async (permission) => {
      if (permission !== 'granted') return;
      setPermissionGranted(true);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      setFcmToken(token);
      // Register token with backend
      await registerFCMToken(token);
    });

    const unsubscribe = onMessage(messaging, (payload) => {
      // Dispatch to in-app notification system
    });
    return () => unsubscribe();
  }, []);

  return (
    <FCMContext.Provider value={{ fcmToken, permissionGranted }}>
      {children}
    </FCMContext.Provider>
  );
}

export const useFCM = () => useContext(FCMContext);
```

### useNotification Hook (Pattern 61.2)

```typescript
// src/presentation/hooks/useNotification.ts
import { App } from 'antd';

export function useNotification() {
  const { notification, message } = App.useApp();

  // Returns 6-part object:
  return {
    success: () => void,          // no arguments
    info: (msg: string) => void,
    warning: (msg: string) => void,
    error: (msg: string) => void,
    message,                      // Ant Design message API
    config: { ... },              // channel configuration
  };
}

// Usage
const notification = useNotification();
notification.success();                    // no args!
notification.error('エラーが発生しました');
```

### Global App Configuration (Pattern 61.3)

```typescript
// src/presentation/providers/AntdProvider.tsx (addition)
import { App } from 'antd';

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AntdConfigProvider>
        <App
          notification={{ placement: 'topRight', maxCount: 5, duration: 4 }}
          message={{ maxCount: 3, duration: 3 }}
        >
          {children}
        </App>
      </AntdConfigProvider>
    </ThemeProvider>
  );
}
```

### Usage in Component (Pattern 61.2)

```typescript
export function CustomerSaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const notification = useNotification();

  const handleSave = async () => {
    try {
      await onSave();
      notification.success();    // no arguments
    } catch {
      notification.error('保存に失敗しました');
    }
  };

  return <Button onClick={handleSave}>保存</Button>;
}
```

---

## Anti-Patterns

- Calling `notification.success()` from Ant Design directly without `App.useApp()` (breaks context)
- Initializing Firebase multiple times (check `getApps().length`)
- Storing the FCM token in Redux (use FCMContext)
- Requesting notification permission without user interaction trigger

---

## Related Specialists

- `theme-specialist.md` — AntdProvider that hosts App configuration
- `permission-specialist.md` — Notification content respects user permissions
- `data-fetching-specialist.md` — FCM token registration uses the same API layer
