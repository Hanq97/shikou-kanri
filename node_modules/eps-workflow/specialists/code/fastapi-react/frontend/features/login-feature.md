# Pattern 12.11: LoginFeature

**Role**: User authentication with Zustand state management
**Focus**: Login form with credential validation and session persistence
**Technology**: React 19, TypeScript 5, React Hook Form, Zod, Zustand
**Domain**: Vietnamese legal platform (Đăng Nhập)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE LoginFeature {
  PURPOSE: "Authenticate users and manage session state"

  RESPONSIBILITIES: [
    "Capture email and password credentials",
    "Validate form inputs with Zod",
    "Call authentication API",
    "Store token and user in Zustand store",
    "Navigate to dashboard on success",
    "Show error messages on failure"
  ]

  TECH_STACK: {
    primary: "React Hook Form + Zod validation",
    state_management: "Zustand (auth store)",
    api_client: "Custom API client",
    navigation: "Next.js useRouter"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng (User)", "Token (Chứng Thực)"],
    security: ["Password hashing", "JWT tokens", "HTTPS only"],
    session: ["Token persistence", "Auto-logout"]
  }
}
```

---

## Workflow: LoginFeature_Workflow

```pseudo
WORKFLOW LoginFeature {
  INPUT: {
    email: string,
    password: string
  }

  PRECONDITIONS: [
    "User is not already authenticated",
    "API endpoint is available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_FORM {
  description: "Setup login form with validation"
  logic: |
    SCHEMA = LoginSchema {
      email: required, valid email,
      password: required, min 8 chars
    }

    FORM = useForm({
      resolver: zodResolver(SCHEMA),
      mode: 'onBlur'
    })

    RETURN form
}

STEP_2_VALIDATE_CREDENTIALS {
  description: "Validate email and password"
  logic: |
    ON_SUBMIT = async (data) => {
      // Form validation happens automatically via Zod

      IF NOT data.email THEN
        SHOW_ERROR("Email là bắt buộc / Email is required")
        RETURN
      END IF

      IF NOT data.password THEN
        SHOW_ERROR("Mật khẩu là bắt buộc / Password is required")
        RETURN
      END IF

      IF NOT isValidEmail(data.email) THEN
        SHOW_ERROR("Email không hợp lệ / Invalid email format")
        RETURN
      END IF

      IF data.password.length < 8 THEN
        SHOW_ERROR("Mật khẩu phải có ít nhất 8 ký tự / Password must be at least 8 characters")
        RETURN
      END IF

      CALL STEP_3_CALL_LOGIN_API(data)
    }
}

STEP_3_CALL_LOGIN_API {
  description: "Call authentication API"
  logic: |
    TRY:
      setIsLoading(true)

      response = AWAIT login({
        email: data.email,
        password: data.password
      })

      IF response.token AND response.user THEN
        CALL STEP_4_SAVE_AUTH_STATE(response)
      ELSE
        THROW new Error("Invalid response from server")
      END IF
    CATCH error:
      SHOW_TOAST({
        title: "Đăng nhập thất bại / Login failed",
        message: error.message || "Thông tin đăng nhập không hợp lệ / Invalid credentials",
        variant: "destructive"
      })
    FINALLY:
      setIsLoading(false)
    END TRY
}

STEP_4_SAVE_AUTH_STATE {
  description: "Store token and user in Zustand"
  logic: |
    authStore = useAuthStore()

    authStore.setToken(response.token)
    authStore.setUser(response.user)

    // Token is persisted to localStorage by Zustand
}

STEP_5_REDIRECT_TO_DASHBOARD {
  description: "Navigate to dashboard"
  logic: |
    router = useRouter()

    SHOW_TOAST({
      title: "Đăng nhập thành công / Login successful",
      message: "Chào mừng {user.name}! / Welcome back, {user.name}!"
    })

    AWAIT delay(500) // Let user see success toast

    router.push('/dashboard')
}

STEP_6_RENDER_FORM {
  description: "Render login form"
  logic: |
    RENDER Form {
      Header: "Chào Mừng Trở Lại / Welcome Back"
      Subtitle: "Nhập thông tin của bạn để truy cập tài khoản / Enter your credentials to access your account"

      Fields: [
        {
          label: "Email",
          type: "email",
          required: true,
          error: errors.email?.message,
          placeholder: "user@example.com"
        },
        {
          label: "Mật Khẩu / Password",
          type: "password",
          required: true,
          error: errors.password?.message,
          placeholder: "Nhập mật khẩu / Enter password",
          link: "Quên mật khẩu? / Forgot password?"
        }
      ]

      Footer: [
        SubmitButton("Đăng Nhập / Sign In"),
        SignUpLink("Đăng ký / Sign up")
      ]
    }
}
```

---

## Key Interfaces

```typescript
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'luatsu' | 'user' | 'viewer';
    avatar?: string;
  };
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}
```

---

## Integration Points

```pseudo
INTEGRATION LoginFeature {
  UI_COMPONENTS: {
    triggers: ["Login button on auth page"],
    displays: ["LoginForm"],
    feedback: ["useToast()"]
  }

  STATE_MANAGEMENT: {
    form_state: "React Hook Form (temporary)",
    auth_state: "Zustand store (persistent)",
    session: "localStorage (token persistence)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/auth/login",
    validate: "POST /api/v1/auth/validate-token"
  }

  STORE_UPDATES: {
    setUser: "Save user profile data",
    setToken: "Save JWT token",
    persist: "localStorage via Zustand middleware"
  }

  ERROR_HANDLING: {
    InvalidCredentials: "Show 'Email or password incorrect'",
    AccountLocked: "Show 'Account is locked, contact admin'",
    NetworkError: "Show 'Connection error, please try again'",
    ServerError: "Show 'Server error, please try again later'"
  }

  NAVIGATION: {
    on_success: "Push to /dashboard",
    on_failure: "Stay on /login",
    forgot_password: "Push to /forgot-password"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    welcome_title: "Chào Mừng Trở Lại / Welcome Back",
    welcome_subtitle: "Nhập thông tin của bạn để truy cập tài khoản / Enter your credentials to access your account",
    login_button: "Đăng Nhập / Sign In",
    signing_in: "Đang đăng nhập... / Signing in...",
    forgot_password: "Quên mật khẩu? / Forgot password?",
    no_account: "Chưa có tài khoản? / Don't have an account?",
    sign_up: "Đăng ký / Sign up",
    success_title: "Đăng nhập thành công / Login successful",
    success_message: "Chào mừng {name}! / Welcome back, {name}!",
    error_title: "Đăng nhập thất bại / Login failed",
    error_invalid_credentials: "Thông tin đăng nhập không hợp lệ / Invalid credentials"
  }

  VALIDATION: {
    email_required: "Email là bắt buộc / Email is required",
    email_invalid: "Email không hợp lệ / Invalid email address",
    password_required: "Mật khẩu là bắt buộc / Password is required",
    password_too_short: "Mật khẩu phải có ít nhất 8 ký tự / Password must be at least 8 characters"
  }

  SECURITY: {
    https_required: "All login requests must use HTTPS",
    token_expiry: "Tokens expire after 24 hours",
    refresh_token: "Refresh tokens valid for 7 days",
    auto_logout: "Auto-logout after 30 minutes of inactivity"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.12 - LogoutFeature",
    relationship: "Inverse operation (logout)",
    integration: "Both manage auth store state"
  },
  {
    pattern: "12.13 - RegisterFeature",
    relationship: "Login after registration",
    integration: "Share auth store and navigation"
  }
]
```

---

## Security Considerations

```pseudo
SECURITY {
  PASSWORD_TRANSMISSION: "Use HTTPS only, never HTTP",
  TOKEN_STORAGE: "localStorage (HttpOnly alternative not available in SPA)",
  CSRF_PROTECTION: "Include CSRF token in requests",
  RATE_LIMITING: "API rate-limits login attempts (e.g., 5 attempts per 15 mins)",
  SESSION_TIMEOUT: "Auto-logout after 30 mins of inactivity",
  TOKEN_REFRESH: "Refresh token before expiry (24 hour expiry)"
}
```

---

**End of Pattern 12.11**

*Feature component pattern for user login*
*Zustand-based authentication state management*
