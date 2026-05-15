# Pattern 12.13: RegisterFeature

**Role**: New user registration with email verification
**Focus**: Registration form with password complexity validation
**Technology**: React 19, TypeScript 5, React Hook Form, Zod
**Domain**: Vietnamese legal platform (Đăng Ký)
**Last Updated**: 2026-01-02

---

## Feature Identity

```pseudo
FEATURE RegisterFeature {
  PURPOSE: "Enable new user registration with email verification workflow"

  RESPONSIBILITIES: [
    "Capture user registration data",
    "Validate passwords (strength + matching)",
    "Submit registration to API",
    "Send verification email",
    "Redirect to email verification page",
    "Handle registration errors"
  ]

  TECH_STACK: {
    primary: "React Hook Form + Zod validation",
    api_client: "Custom API client",
    navigation: "Next.js useRouter",
    validation: "Password complexity rules"
  }

  DOMAIN_CONTEXT: {
    entities: ["Người Dùng Mới (New User)", "Email Xác Minh (Email Verification)"],
    workflow: ["Registration → Email Sent → Verification → Activation"],
    password_rules: ["Min 8 chars", "Uppercase + lowercase + number"]
  }
}
```

---

## Workflow: RegisterFeature_Workflow

```pseudo
WORKFLOW RegisterFeature {
  INPUT: {
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  }

  PRECONDITIONS: [
    "User is not already logged in",
    "Registration API available"
  ]
}
```

### Step-by-Step Logic

```pseudo
STEP_1_INITIALIZE_FORM {
  description: "Setup registration form with validation"
  logic: |
    SCHEMA = RegisterSchema {
      name: required, min 2 chars, max 100 chars,
      email: required, valid email,
      password: required, min 8 chars, uppercase + lowercase + number,
      confirmPassword: required, must match password
    }

    FORM = useForm({
      resolver: zodResolver(SCHEMA),
      mode: 'onBlur'
    })

    RETURN form
}

STEP_2_VALIDATE_FORM {
  description: "Validate all form fields"
  logic: |
    VALIDATION_RULES = {
      name: {
        required: true,
        min: 2,
        max: 100
      },
      email: {
        required: true,
        format: "email"
      },
      password: {
        required: true,
        min: 8,
        pattern: "uppercase + lowercase + digit"
      },
      confirmPassword: {
        required: true,
        match: "password field"
      }
    }

    CUSTOM_VALIDATION = {
      confirmPassword: (value, context) => {
        IF value != context.password THEN
          RETURN "Mật khẩu không khớp / Passwords do not match"
        END IF
      }
    }
}

STEP_3_SUBMIT_REGISTRATION {
  description: "Call registration API"
  logic: |
    ON_SUBMIT = async (data) => {
      TRY:
        setIsLoading(true)

        response = AWAIT registerUser({
          name: data.name,
          email: data.email,
          password: data.password
        })

        IF response.success THEN
          SHOW_TOAST({
            title: "Đăng ký thành công / Registration successful",
            message: "Kiểm tra email để xác minh tài khoản / Check your email to verify your account"
          })

          // Redirect with email for pre-fill
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
        ELSE
          THROW new Error(response.message)
        END IF

      CATCH error:
        SHOW_TOAST({
          title: "Đăng ký thất bại / Registration failed",
          message: error.message,
          variant: "destructive"
        })
      FINALLY:
        setIsLoading(false)
      END TRY
    }
}

STEP_4_RENDER_FORM {
  description: "Render registration form"
  logic: |
    RENDER Form {
      Header: "Tạo Tài Khoản / Create Account",
      Subtitle: "Đăng ký để bắt đầu / Sign up to get started"

      Fields: [
        {
          name: "name",
          label: "Tên Đầy Đủ / Full Name",
          type: "text",
          required: true,
          error: errors.name?.message,
          placeholder: "Nguyễn Văn A / John Doe"
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          error: errors.email?.message,
          placeholder: "user@example.com"
        },
        {
          name: "password",
          label: "Mật Khẩu / Password",
          type: "password",
          required: true,
          error: errors.password?.message,
          placeholder: "Tối thiểu 8 ký tự / At least 8 characters",
          hint: "Phải chứa chữ hoa, chữ thường và số / Must contain uppercase, lowercase, and number"
        },
        {
          name: "confirmPassword",
          label: "Xác Nhận Mật Khẩu / Confirm Password",
          type: "password",
          required: true,
          error: errors.confirmPassword?.message,
          placeholder: "Nhập lại mật khẩu / Re-enter password"
        }
      ]

      Footer: [
        SubmitButton("Đăng Ký / Sign Up"),
        SignInLink("Đã có tài khoản? / Already have an account?")
      ]
    }
}

STEP_5_PASSWORD_STRENGTH_INDICATOR {
  description: "Show password strength feedback"
  logic: |
    password = watch('password')

    IF password THEN
      strength = calculatePasswordStrength(password)
      // Checks: length, uppercase, lowercase, digit, special chars

      RENDER PasswordStrengthBar {
        color: getStrengthColor(strength),
        text: getStrengthText(strength),
        percentage: strength.score
      }
    END IF
}
```

---

## Key Interfaces

```typescript
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}
```

---

## Integration Points

```pseudo
INTEGRATION RegisterFeature {
  UI_COMPONENTS: {
    triggers: ["Register link from login page"],
    displays: ["RegisterForm"],
    feedback: ["useToast()", "Password strength bar"]
  }

  STATE_MANAGEMENT: {
    form_state: "React Hook Form (temporary)",
    loading_state: "useState(isLoading)"
  }

  API_ENDPOINTS: {
    primary: "POST /api/v1/auth/register",
    validation: "POST /api/v1/auth/check-email"
  }

  NAVIGATION: {
    on_success: "Redirect to /verify-email?email={email}",
    on_failure: "Stay on /register"
  }

  EMAIL_VERIFICATION: {
    method: "Send verification link to user's email",
    link_format: "/verify-email?token={token}&email={email}",
    expiry: "Link expires in 24 hours"
  }

  ERROR_HANDLING: {
    DuplicateEmail: "Show 'Email already exists'",
    WeakPassword: "Show password requirements again",
    InvalidEmail: "Show email format error",
    NetworkError: "Show connection error with retry"
  }
}
```

---

## Vietnamese Domain Context

```pseudo
DOMAIN {
  MESSAGES: {
    title: "Tạo Tài Khoản / Create Account",
    subtitle: "Đăng ký để bắt đầu / Sign up to get started",
    submit_button: "Đăng Ký / Sign Up",
    submitting: "Đang đăng ký... / Registering...",
    success_title: "Đăng ký thành công / Registration successful",
    success_message: "Kiểm tra email để xác minh tài khoản / Check your email to verify your account",
    error_title: "Đăng ký thất bại / Registration failed",
    signin_link: "Đã có tài khoản? / Already have an account?",
    signin_text: "Đăng nhập / Sign in"
  }

  VALIDATION: {
    name_required: "Tên là bắt buộc / Name is required",
    name_min: "Tên phải có ít nhất 2 ký tự / Name must be at least 2 characters",
    email_required: "Email là bắt buộc / Email is required",
    email_invalid: "Email không hợp lệ / Invalid email address",
    email_exists: "Email đã tồn tại / Email already exists",
    password_required: "Mật khẩu là bắt buộc / Password is required",
    password_min: "Mật khẩu phải có ít nhất 8 ký tự / Password must be at least 8 characters",
    password_complexity: "Mật khẩu phải chứa chữ hoa, chữ thường và số / Password must contain uppercase, lowercase, and number",
    password_mismatch: "Mật khẩu không khớp / Passwords do not match"
  }

  PASSWORD_REQUIREMENTS: {
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_digit: true,
    require_special: false
  }

  STRENGTH_LEVELS: {
    weak: "Yếu / Weak",
    fair: "Trung bình / Fair",
    good: "Tốt / Good",
    strong: "Mạnh / Strong"
  }
}
```

---

## Related Patterns

```pseudo
RELATED_PATTERNS = [
  {
    pattern: "12.11 - LoginFeature",
    relationship: "User logs in after email verification",
    integration: "Both manage auth flow"
  },
  {
    pattern: "12.12 - LogoutFeature",
    relationship: "User may logout after registration",
    integration: "Share auth store management"
  }
]
```

---

## Email Verification Workflow

```pseudo
VERIFICATION_WORKFLOW {
  STEP_1: Registration form submitted
  STEP_2: User created in database (unverified)
  STEP_3: Verification email sent
  STEP_4: User redirected to /verify-email page
  STEP_5: User clicks email link
  STEP_6: Email verified in database
  STEP_7: User can now login
}
```

---

**End of Pattern 12.13**

*Feature component pattern for user registration*
*Email verification workflow with password complexity*
