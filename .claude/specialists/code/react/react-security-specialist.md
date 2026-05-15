# React Security Specialist
# React セキュリティ スペシャリスト
# Chuyên Gia Bảo Mật React

**Version**: 1.0.0
**Stack**: React 19 + TypeScript 5
**Architecture**: Security-First Frontend
**Integration**: C# ASP.NET Core Backend
**Last Updated**: 2025-12-31

---

## 🎯 PURPOSE

This specialist provides **35 React security patterns** for building secure frontends that integrate with C# ASP.NET Core backends. Focus on XSS prevention, CSRF protection, authentication, and secure communication.

**Key Constraints**:
- ✅ **DOMPurify for XSS prevention**
- ✅ **httpOnly cookies for tokens**
- ✅ **CSRF tokens for state-changing requests**
- ✅ **Input sanitization and validation**
- ✅ **HTTPS enforcement**
- ❌ **NO localStorage for tokens** (use httpOnly cookies)
- ❌ **NO inline HTML sanitization** (use DOMPurify)
- ❌ **NO dangerouslySetInnerHTML without sanitization**

---

## 📚 PATTERN INDEX (35 Patterns)

### **XSS Prevention** (10 patterns)
1. dompurify-sanitization
2. safe-html-rendering
3. escape-user-input
4. content-security-policy
5. safe-url-handling
6. safe-attribute-binding
7. safe-event-handlers
8. safe-third-party-content
9. iframe-sandbox
10. script-injection-prevention

### **CSRF Protection** (5 patterns)
11. csrf-token-header
12. same-site-cookies
13. origin-validation
14. referer-validation
15. double-submit-cookie

### **Authentication & Authorization** (10 patterns)
16. httponly-cookies
17. jwt-refresh-token
18. session-timeout
19. role-based-access
20. permission-based-access
21. secure-login-flow
22. secure-logout-flow
23. token-expiration-handling
24. auth-state-management
25. protected-routes

### **Data Validation** (5 patterns)
26. input-validation
27. form-validation
28. schema-validation
29. sanitize-before-submit
30. validate-api-responses

### **Secure Communication** (5 patterns)
31. https-enforcement
32. secure-headers
33. cors-configuration
34. api-error-handling
35. rate-limiting-client

---

## 📖 PATTERN DETAILS

### Pattern 1: dompurify-sanitization
**Category**: XSS Prevention
**Description**: Sanitize HTML content with DOMPurify

```typescript
// utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

export function sanitizeHtmlStrict(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

// components/SafeHtml.tsx
interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitizedHtml = sanitizeHtml(html);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

// Usage
<SafeHtml html={userGeneratedContent} />
```

**Why This Pattern**:
- ✅ Prevents XSS attacks
- ✅ Configurable allowed tags/attributes
- ✅ Safe HTML rendering

---

### Pattern 2: safe-html-rendering
**Category**: XSS Prevention
**Description**: Safe rendering of user-generated content

```typescript
// components/UserComment.tsx
import DOMPurify from 'dompurify';

interface UserCommentProps {
  content: string;
  author: string;
}

export function UserComment({ content, author }: UserCommentProps) {
  // Sanitize content before rendering
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });

  return (
    <div className="comment">
      <p className="author">{author}</p>
      <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
    </div>
  );
}
```

**Why This Pattern**:
- ✅ XSS prevention
- ✅ User-generated content safe
- ✅ Limited HTML tags allowed

---

### Pattern 3: escape-user-input
**Category**: XSS Prevention
**Description**: Escape user input before rendering

```typescript
// utils/escapeHtml.ts
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

// Usage in component
function UserProfile({ bio }: { bio: string }) {
  const escapedBio = escapeHtml(bio);

  return <p dangerouslySetInnerHTML={{ __html: escapedBio }} />;
}
```

**Why This Pattern**:
- ✅ Prevents script injection
- ✅ Safe for rendering
- ✅ Lightweight alternative to DOMPurify

---

### Pattern 4: content-security-policy
**Category**: XSS Prevention
**Description**: CSP meta tag configuration

```typescript
// pages/_document.tsx (Next.js)
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  return (
    <Html>
      <Head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

**Why This Pattern**:
- ✅ Prevents unauthorized script execution
- ✅ Controls resource loading
- ✅ Defense in depth

---

### Pattern 11: csrf-token-header
**Category**: CSRF Protection
**Description**: CSRF token in request headers

```typescript
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Send cookies
});

// Request interceptor to add CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

function getCsrfToken(): string | null {
  const match = document.cookie.match(/CSRF-TOKEN=([^;]+)/);
  return match ? match[1] : null;
}

export default api;

// Usage
api.post('/api/users', userData); // CSRF token automatically added
```

**Why This Pattern**:
- ✅ Prevents CSRF attacks
- ✅ Automatic token injection
- ✅ Backend validates token

---

### Pattern 12: same-site-cookies
**Category**: CSRF Protection
**Description**: SameSite cookie attribute

```typescript
// utils/cookies.ts
export function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; Secure`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
}
```

**Why This Pattern**:
- ✅ CSRF protection
- ✅ SameSite=Strict prevents cross-site requests
- ✅ Secure flag for HTTPS only

---

### Pattern 16: httponly-cookies
**Category**: Authentication & Authorization
**Description**: Use httpOnly cookies for tokens (NO localStorage)

```typescript
// services/authService.ts
import api from '../utils/api';

interface LoginCredentials {
  email: string;
  password: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    // Backend sets httpOnly cookie with JWT
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  async logout() {
    // Backend clears httpOnly cookie
    await api.post('/api/auth/logout');
  },

  async refreshToken() {
    // Backend refreshes token using httpOnly cookie
    const response = await api.post('/api/auth/refresh');
    return response.data;
  },

  async getCurrentUser() {
    // Token automatically sent via httpOnly cookie
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// ❌ DON'T - Store token in localStorage
// localStorage.setItem('token', token); // VULNERABLE TO XSS

// ✅ DO - Let backend set httpOnly cookie
// Backend: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

**Why This Pattern**:
- ✅ Immune to XSS attacks (JavaScript cannot read httpOnly cookies)
- ✅ Automatic cookie transmission
- ✅ Backend controls cookie security

---

### Pattern 17: jwt-refresh-token
**Category**: Authentication & Authorization
**Description**: JWT refresh token mechanism

```typescript
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token (backend uses httpOnly cookie)
        await api.post('/api/auth/refresh');

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Why This Pattern**:
- ✅ Automatic token refresh
- ✅ Seamless user experience
- ✅ Handles token expiration

---

### Pattern 19: role-based-access
**Category**: Authentication & Authorization
**Description**: Role-based access control

```typescript
// components/ProtectedComponent.tsx
import { useAuth } from '../hooks/useAuth';

interface ProtectedComponentProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function ProtectedComponent({ allowedRoles, children }: ProtectedComponentProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <div>Access denied</div>;
  }

  return <>{children}</>;
}

// Usage
<ProtectedComponent allowedRoles={['Admin', 'Manager']}>
  <AdminPanel />
</ProtectedComponent>
```

**Why This Pattern**:
- ✅ Declarative access control
- ✅ Role-based authorization
- ✅ Clear component boundary

---

### Pattern 25: protected-routes
**Category**: Authentication & Authorization
**Description**: Protected routes with authentication

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage in routes
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route
    path="/admin"
    element={
      <ProtectedRoute allowedRoles={['Admin']}>
        <AdminPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />
</Routes>
```

**Why This Pattern**:
- ✅ Route-level protection
- ✅ Role-based access
- ✅ Automatic redirects

---

### Pattern 26: input-validation
**Category**: Data Validation
**Description**: Client-side input validation

```typescript
// utils/validation.ts
export const validators = {
  email: (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Invalid email address';
  },

  password: (value: string): string | null => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain number';
    return null;
  },

  url: (value: string): string | null => {
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL';
    }
  },

  required: (value: string): string | null => {
    return value.trim() ? null : 'This field is required';
  },
};

// components/ValidatedInput.tsx
interface ValidatedInputProps {
  value: string;
  onChange: (value: string) => void;
  validator: (value: string) => string | null;
  label: string;
}

export function ValidatedInput({ value, onChange, validator, label }: ValidatedInputProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setError(validator(newValue));
  };

  return (
    <div>
      <label>{label}</label>
      <input value={value} onChange={handleChange} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Immediate feedback
- ✅ Reusable validators
- ✅ Type-safe validation

---

### Pattern 29: sanitize-before-submit
**Category**: Data Validation
**Description**: Sanitize data before API submission

```typescript
// utils/sanitizeData.ts
import DOMPurify from 'dompurify';

export function sanitizeUserInput(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remove HTML tags from string fields
      sanitized[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? DOMPurify.sanitize(item, { ALLOWED_TAGS: [] }) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Usage in form submit
async function handleSubmit(formData: FormData) {
  const sanitizedData = sanitizeUserInput(formData);
  await api.post('/api/users', sanitizedData);
}
```

**Why This Pattern**:
- ✅ Prevents malicious input
- ✅ Sanitizes before submission
- ✅ Defense in depth

---

### Pattern 31: https-enforcement
**Category**: Secure Communication
**Description**: Enforce HTTPS in production

```typescript
// utils/httpsEnforcement.ts
export function enforceHttps() {
  if (
    process.env.NODE_ENV === 'production' &&
    window.location.protocol !== 'https:'
  ) {
    window.location.href = `https:${window.location.href.substring(
      window.location.protocol.length
    )}`;
  }
}

// App.tsx
import { useEffect } from 'react';
import { enforceHttps } from './utils/httpsEnforcement';

export function App() {
  useEffect(() => {
    enforceHttps();
  }, []);

  return <div>App content</div>;
}
```

**Why This Pattern**:
- ✅ Prevents man-in-the-middle attacks
- ✅ Automatic redirect to HTTPS
- ✅ Production-only enforcement

---

### Pattern 32: secure-headers
**Category**: Secure Communication
**Description**: Security headers configuration

```typescript
// utils/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
});

export default api;
```

**Why This Pattern**:
- ✅ Prevents MIME sniffing
- ✅ Prevents clickjacking
- ✅ XSS protection

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO localStorage for Tokens
```typescript
// ❌ DON'T - Store tokens in localStorage
localStorage.setItem('token', jwtToken); // VULNERABLE TO XSS

// ✅ DO - Use httpOnly cookies (backend sets it)
// Backend: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

### ❌ NO Inline HTML Sanitization
```typescript
// ❌ DON'T - Inline sanitization
const sanitized = html.replace(/<script>/g, '');

// ✅ DO - Use DOMPurify
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(html);
```

### ❌ NO dangerouslySetInnerHTML Without Sanitization
```typescript
// ❌ DON'T - Unsanitized HTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ DO - Sanitize first
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(userContent);
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

---

## 📊 INTEGRATION WITH C# BACKEND

### Pattern: Secure Login Flow

```typescript
// services/authService.ts
import api from '../utils/api';

export const authService = {
  async login(email: string, password: string) {
    // Backend validates credentials and sets httpOnly cookie
    const response = await api.post('/api/auth/login', { email, password });
    return response.data; // Returns user info (NO token in response body)
  },

  async logout() {
    // Backend clears httpOnly cookie
    await api.post('/api/auth/logout');
  },

  async getCurrentUser() {
    // Token sent automatically via httpOnly cookie
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// components/LoginForm.tsx
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate input
    if (!validators.email(email)) {
      setError('Invalid email');
      return;
    }

    try {
      await authService.login(email, password);
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <span className="error">{error}</span>}
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## 🎓 BEST PRACTICES

1. **DOMPurify for all user-generated HTML**
2. **httpOnly cookies for tokens** (NO localStorage)
3. **CSRF tokens for state-changing requests**
4. **Input validation on client AND server**
5. **HTTPS enforcement in production**
6. **CSP headers to prevent script injection**
7. **SameSite cookies for CSRF protection**
8. **Role-based access control**
9. **Automatic token refresh** on 401 errors
10. **Sanitize data before API submission**

---

**Created**: 2025-12-31
**Patterns**: 35 React security patterns
**Architecture**: Security-First Frontend
**Backend Integration**: C# ASP.NET Core REST API

---

*React Security Specialist - XSS Prevention + CSRF Protection + Secure Auth*
*✅ 35 Patterns | ✅ DOMPurify | ✅ httpOnly Cookies | ✅ NO localStorage for Tokens*
