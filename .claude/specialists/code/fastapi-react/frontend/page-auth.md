# Page Authentication Specialist
# Chuyên Gia Trang Xác Thực

**Role**: Next.js 15 authentication page implementation specialist for Vietnamese legal AI platform
**Focus**: Login, Register, Forgot Password, Settings pages with secure auth flows
**Technology**: Next.js 15.3.0, React 19, TypeScript 5, Server Components
**Domain**: Vietnamese legal P2P insurance & lending platform
**Last Updated**: 2026-01-02

---

## Specialist Identity

```pseudo
SPECIALIST PageAuthentication {
  ROLE: "Next.js 15 authentication page implementation specialist"

  RESPONSIBILITIES: [
    "Implement secure login page with error handling",
    "Create user registration flow with validation",
    "Build password reset/recovery workflow",
    "Design user settings and profile management pages",
    "Integrate social authentication providers"
  ]

  TECH_STACK: {
    primary: "Next.js 15.3.0",
    libraries: ["React 19", "TypeScript 5", "next/headers", "next/navigation"],
    patterns: ["Server Components", "Metadata API", "Server Actions", "Form Validation"]
  }

  DOMAIN_CONTEXT: {
    industry: "Legal P2P Insurance & Lending",
    region: "Vietnam",
    key_entities: ["User/Người Dùng", "Session/Phiên", "Profile/Hồ Sơ"]
  }
}
```

---

## Pattern 10.26: Settings Page (Form-based)
## Pattern 10.26: Trang Cài Đặt (Dựa Trên Form)

### Overview

```pseudo
PATTERN SettingsPage {
  PURPOSE: "User account settings page with categorized forms for profile, notifications, security, and account management"

  PROBLEM: "Need centralized settings page with multiple configuration sections, proper data fetching, and real-time updates"

  SOLUTION: "Server Component page with parallel data fetching, Suspense boundaries for progressive loading, and categorized settings sections"

  USE_CASES: [
    "User profile information editing",
    "Notification preferences configuration",
    "Security settings (password, 2FA)",
    "Account management and deletion"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW SettingsPage_Render {
  INPUT: {
    user: {
      cookieStore: Cookies,
      sessionToken: string
    }
  }

  PRECONDITIONS: [
    "User is authenticated with valid session token",
    "Settings API endpoints are available",
    "Form components are implemented"
  ]

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Define static metadata for SEO"
      logic: |
        metadata = {
          title: "Settings - StarX4CRM",
          description: "Manage your account settings, preferences, and security options",
          openGraph: {
            title: "Account Settings - StarX4CRM",
            description: "Update your profile, notifications, and security settings",
            type: "website"
          }
        }
    }

    STEP_2_FETCH_USER_DATA: {
      description: "Fetch current user data from API"
      logic: |
        FUNCTION getCurrentUser():
          cookieStore = AWAIT GET_COOKIES()
          sessionToken = cookieStore.get('sessionToken')?.value

          IF NOT sessionToken:
            THROW Error('Unauthorized')

          response = AWAIT FETCH(API_URL + '/api/users/me', {
            headers: {
              'Authorization': 'Bearer ' + sessionToken,
              'Content-Type': 'application/json'
            },
            cache: 'no-store',
            credentials: 'include'
          })

          IF NOT response.ok:
            IF response.status == 401:
              THROW Error('Unauthorized')
            THROW Error('Failed to fetch user')

          RETURN AWAIT response.json()
    }

    STEP_3_FETCH_NOTIFICATION_PREFERENCES: {
      description: "Fetch user notification preferences"
      logic: |
        FUNCTION getNotificationPreferences(userId: string):
          cookieStore = AWAIT GET_COOKIES()
          sessionToken = cookieStore.get('sessionToken')?.value

          response = AWAIT FETCH(
            API_URL + '/api/users/' + userId + '/notification-preferences',
            {
              headers: {
                'Authorization': 'Bearer ' + sessionToken
              },
              next: { revalidate: 300 },
              credentials: 'include'
            }
          )

          IF NOT response.ok:
            THROW Error('Failed to fetch preferences')

          RETURN AWAIT response.json()
    }

    STEP_4_PARALLEL_DATA_FETCHING: {
      description: "Fetch user and preferences in parallel"
      logic: |
        [user, preferences] = AWAIT Promise.all([
          getCurrentUser(),
          getNotificationPreferences(user?.id || '')
        ])
    }

    STEP_5_RENDER_SETTINGS_SECTIONS: {
      description: "Render categorized settings sections with Suspense boundaries"
      logic: |
        RETURN (
          <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
              <h1>Settings</h1>
              <p>Manage your account preferences and security settings</p>
            </div>

            // Profile Settings Section
            <SettingsSectionCard
              title="Profile Information"
              description="Update your profile details, avatar, and personal information"
            >
              <Suspense fallback={<SettingsFormSkeleton />}>
                <ProfileSettingsForm user={user} />
              </Suspense>
            </SettingsSectionCard>

            // Notification Settings Section
            <SettingsSectionCard
              title="Notifications"
              description="Configure how you receive notifications and alerts"
            >
              <Suspense fallback={<SettingsFormSkeleton />}>
                <NotificationSettingsForm
                  preferences={preferences}
                  userId={user.id}
                />
              </Suspense>
            </SettingsSectionCard>

            // Security Settings Section
            <SettingsSectionCard
              title="Security"
              description="Manage your password and two-factor authentication"
            >
              <Suspense fallback={<SettingsFormSkeleton />}>
                <SecuritySettingsForm userId={user.id} />
              </Suspense>
            </SettingsSectionCard>

            // Danger Zone Section
            <SettingsSectionCard
              title="Danger Zone"
              description="Irreversible and destructive actions"
              variant="danger"
            >
              <Suspense fallback={<SettingsFormSkeleton />}>
                <DangerZone userId={user.id} email={user.email} />
              </Suspense>
            </SettingsSectionCard>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "SettingsPage",
    type: "Server Component",
    features: [
      "Parallel data fetching",
      "Suspense boundaries for progressive loading",
      "Categorized settings sections",
      "Security settings with danger zone",
      "Real-time updates via server actions"
    ]
  }

  VALIDATION: [
    "User must be authenticated",
    "Session token must be valid",
    "Forms must handle validation errors",
    "Danger zone actions must require confirmation"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE SettingsPageProps {
  // No props for top-level page
}

INTERFACE UserData {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

INTERFACE NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  marketing_emails: boolean
}

COMPONENT_SIGNATURE ProfileSettingsForm {
  PROPS: {
    user: UserData
  }
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE NotificationSettingsForm {
  PROPS: {
    preferences: NotificationPreferences
    userId: string
  }
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE SecuritySettingsForm {
  PROPS: {
    userId: string
  }
  RETURNS: ReactElement
}

COMPONENT_SIGNATURE DangerZone {
  PROPS: {
    userId: string
    email: string
  }
  RETURNS: ReactElement
}
```

---

## Pattern 10.31: Login Page (Authentication)
## Pattern 10.31: Trang Đăng Nhập (Xác Thực)

### Overview

```pseudo
PATTERN LoginPage {
  PURPOSE: "User authentication and sign-in workflow with error handling and social auth integration"

  PROBLEM: "Need secure login page with email/password auth, social providers, error handling, and redirect management"

  SOLUTION: "Server Component with pre-authentication check, form validation, error message display, and callback URL support"

  USE_CASES: [
    "Email/password login with validation",
    "Social authentication (Google, GitHub)",
    "Error handling with user-friendly messages",
    "Post-login redirect to callback URL",
    "Prevent logged-in users from accessing login page"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW LoginPage_Render {
  INPUT: {
    searchParams: {
      callbackUrl?: string
      error?: string
      success?: string
    }
  }

  PRECONDITIONS: [
    "Authentication API endpoints are configured",
    "Session management is implemented",
    "Social auth providers are registered"
  ]

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Define metadata with noindex for auth pages"
      logic: |
        metadata = {
          title: "Login - StarX4CRM",
          description: "Sign in to your StarX4CRM account",
          robots: "noindex, nofollow", // Prevent login page indexing
          openGraph: {
            title: "Login - StarX4CRM",
            description: "Access your CRM account",
            type: "website"
          }
        }
    }

    STEP_2_CHECK_EXISTING_AUTH: {
      description: "Check if user is already authenticated"
      logic: |
        FUNCTION checkAuth():
          cookieStore = AWAIT GET_COOKIES()
          sessionToken = cookieStore.get('sessionToken')?.value

          IF sessionToken:
            // Verify session is valid
            response = AWAIT FETCH(
              API_URL + '/api/auth/session',
              {
                headers: {
                  'Authorization': 'Bearer ' + sessionToken
                },
                cache: 'no-store'
              }
            )

            IF response.ok:
              // Already authenticated, redirect to callback URL or home
              REDIRECT(decodeURIComponent(searchParams?.callbackUrl || '/'))
    }

    STEP_3_DEFINE_ERROR_MESSAGES: {
      description: "Map error codes to user-friendly messages"
      logic: |
        errorMessages = {
          'CredentialsSignin': 'Invalid email or password. Please try again.',
          'EmailNotVerified': 'Please verify your email before signing in.',
          'AccountDisabled': 'Your account has been disabled.',
          'TooManyAttempts': 'Too many login attempts. Please try again later.'
        }

        error = searchParams.error
          ? errorMessages[searchParams.error] || 'An error occurred. Please try again.'
          : null
    }

    STEP_4_PROCESS_CALLBACK_URL: {
      description: "Extract and decode callback URL"
      logic: |
        callbackUrl = searchParams.callbackUrl
          ? decodeURIComponent(searchParams.callbackUrl)
          : '/'
    }

    STEP_5_RENDER_LOGIN_PAGE: {
      description: "Render login page with form and social auth"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md space-y-8 p-8">
              // Header
              <div className="text-center">
                <h1>Welcome back</h1>
                <p>Sign in to your StarX4CRM account to continue</p>
              </div>

              // Error Message Display
              IF error:
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>

              // Success Message Display
              IF searchParams.success:
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-600 font-medium">
                    {searchParams.success}
                  </p>
                </div>

              // Login Form
              <LoginForm callbackUrl={callbackUrl} />

              // Divider
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white">Or continue with</span>
                </div>
              </div>

              // Social Login
              <SocialLoginButtons callbackUrl={callbackUrl} />

              // Additional Links
              <div className="space-y-3 text-center text-sm">
                <div>
                  <span>Don't have an account? </span>
                  <Link href="/register">Create one</Link>
                </div>
                <div>
                  <Link href="/forgot-password">Forgot your password?</Link>
                </div>
              </div>

              // JSON-LD Schema
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebApplication',
                  name: 'StarX4CRM Login',
                  url: 'https://starx4crm.com/login',
                  applicationCategory: 'BusinessApplication'
                })}
              </script>
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "LoginPage",
    type: "Server Component",
    features: [
      "Pre-authentication check with redirect",
      "Error handling with user-friendly messages",
      "Social authentication integration",
      "Callback URL support",
      "JSON-LD schema for SEO"
    ]
  }

  VALIDATION: [
    "Authenticated users must be redirected",
    "Errors must display user-friendly messages",
    "Callback URL must be validated",
    "Login page must not be indexed by search engines"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE LoginPageProps {
  searchParams: {
    callbackUrl?: string
    error?: string
    success?: string
  }
}

COMPONENT_SIGNATURE LoginForm {
  PROPS: {
    callbackUrl: string
  }
  RETURNS: ReactElement
  CLIENT_COMPONENT: true
}

COMPONENT_SIGNATURE SocialLoginButtons {
  PROPS: {
    callbackUrl: string
  }
  RETURNS: ReactElement
  CLIENT_COMPONENT: true
}
```

---

## Pattern 10.32: Register Page (User Registration)
## Pattern 10.32: Trang Đăng Ký (Đăng Ký Người Dùng)

### Overview

```pseudo
PATTERN RegisterPage {
  PURPOSE: "New user account registration and onboarding with email verification"

  PROBLEM: "Need self-registration flow with validation, email verification, initial profile setup, and terms acceptance"

  SOLUTION: "Server Component with registration form, step indicators, validation, and terms/privacy links"

  USE_CASES: [
    "New user account creation",
    "Email pre-filling from query params",
    "Registration step progress indication",
    "Terms and privacy policy acceptance",
    "Email verification workflow"
  ]

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW RegisterPage_Render {
  INPUT: {
    searchParams: {
      email?: string
      error?: string
    }
  }

  PRECONDITIONS: [
    "Registration API endpoint is available",
    "Email service is configured for verification",
    "Terms and privacy policy pages exist"
  ]

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Define metadata with noindex for registration page"
      logic: |
        metadata = {
          title: "Create Account - StarX4CRM",
          description: "Sign up for a new StarX4CRM account and start managing your CRM",
          robots: "noindex, nofollow",
          openGraph: {
            title: "Create Account - StarX4CRM",
            description: "Join StarX4CRM today",
            type: "website"
          }
        }
    }

    STEP_2_CHECK_EXISTING_AUTH: {
      description: "Redirect if already authenticated"
      logic: |
        FUNCTION checkAuth():
          cookieStore = AWAIT GET_COOKIES()
          sessionToken = cookieStore.get('sessionToken')?.value

          IF sessionToken:
            response = AWAIT FETCH(
              API_URL + '/api/auth/session',
              {
                headers: {
                  'Authorization': 'Bearer ' + sessionToken
                },
                cache: 'no-store'
              }
            )

            IF response.ok:
              REDIRECT('/')
    }

    STEP_3_DEFINE_ERROR_MESSAGES: {
      description: "Map registration errors to user-friendly messages"
      logic: |
        errorMessages = {
          'EmailExists': 'This email is already registered. Please sign in instead.',
          'InvalidEmail': 'Please enter a valid email address.',
          'WeakPassword': 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
          'TermsRequired': 'You must accept the terms and conditions to continue.'
        }

        error = searchParams.error
          ? errorMessages[searchParams.error] || 'An error occurred. Please try again.'
          : null
    }

    STEP_4_RENDER_REGISTER_PAGE: {
      description: "Render registration page with form and step indicators"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md space-y-8 p-8">
              // Header
              <div className="text-center">
                <h1>Get started</h1>
                <p>Create your StarX4CRM account in just a few minutes</p>
              </div>

              // Registration Steps Indicator
              <RegistrationSteps />

              // Error Message Display
              IF error:
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>

              // Registration Form
              <RegisterForm initialEmail={searchParams.email} />

              // Terms Notice
              <p className="text-xs text-center">
                By signing up, you agree to our{' '}
                <Link href="/terms">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy">Privacy Policy</Link>
              </p>

              // Sign In Link
              <div className="text-center text-sm">
                <span>Already have an account? </span>
                <Link href="/login">Sign in</Link>
              </div>

              // JSON-LD Schema
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebApplication',
                  name: 'StarX4CRM Registration',
                  url: 'https://starx4crm.com/register',
                  applicationCategory: 'BusinessApplication'
                })}
              </script>
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "RegisterPage",
    type: "Server Component",
    features: [
      "Email pre-filling from query params",
      "Registration step progress indication",
      "Error handling with validation messages",
      "Terms and privacy policy links",
      "JSON-LD schema for SEO"
    ]
  }

  VALIDATION: [
    "Email must be validated before submission",
    "Password must meet strength requirements",
    "Terms acceptance must be required",
    "Duplicate emails must be prevented"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE RegisterPageProps {
  searchParams: {
    email?: string
    error?: string
  }
}

COMPONENT_SIGNATURE RegisterForm {
  PROPS: {
    initialEmail?: string
  }
  RETURNS: ReactElement
  CLIENT_COMPONENT: true
}

COMPONENT_SIGNATURE RegistrationSteps {
  PROPS: {}
  RETURNS: ReactElement
  CLIENT_COMPONENT: true
}
```

---

## Pattern 10.33: Forgot Password Page
## Pattern 10.33: Trang Quên Mật Khẩu

### Overview

```pseudo
PATTERN ForgotPasswordPage {
  PURPOSE: "Password reset request and email verification workflow"

  PROBLEM: "Need secure password recovery flow with email verification and two-step confirmation"

  SOLUTION: "Server Component with email submission form and confirmation message display"

  USE_CASES: [
    "Password reset request submission",
    "Email verification for account recovery",
    "Two-step confirmation workflow",
    "Security-focused reset link generation",
    "Account enumeration prevention"
  ]

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ForgotPasswordPage_Render {
  INPUT: {
    searchParams: {
      email?: string
      submitted?: boolean
    }
  }

  PRECONDITIONS: [
    "Password reset API endpoint is available",
    "Email service is configured",
    "Reset token generation is implemented"
  ]

  STEPS: {
    STEP_1_DEFINE_METADATA: {
      description: "Define metadata for password reset page"
      logic: |
        metadata = {
          title: "Reset Password - StarX4CRM",
          description: "Reset your StarX4CRM account password",
          robots: "noindex, nofollow",
          openGraph: {
            title: "Reset Password - StarX4CRM",
            description: "Recover access to your account",
            type: "website"
          }
        }
    }

    STEP_2_CHECK_SUBMISSION_STATUS: {
      description: "Determine if email was submitted"
      logic: |
        submitted = searchParams.submitted === 'true'
    }

    STEP_3_RENDER_FORGOT_PASSWORD_PAGE: {
      description: "Render page with conditional content based on submission status"
      logic: |
        RETURN (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md space-y-8 p-8">
              // Header (conditional based on submission)
              <div className="text-center">
                <h1>
                  {submitted ? 'Check your email' : 'Reset your password'}
                </h1>
                <p>
                  {submitted
                    ? 'We sent a password reset link to your email address'
                    : 'Enter your email address and we\'ll send you a link to reset your password'}
                </p>
              </div>

              // Conditional Content
              IF submitted:
                <ForgotPasswordInstructions email={searchParams.email} />
              ELSE:
                <ForgotPasswordForm />

              // Back to Login Link
              <div className="text-center text-sm">
                <Link href="/login">Back to login</Link>
              </div>

              // JSON-LD Schema
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebApplication',
                  name: 'StarX4CRM Password Recovery',
                  url: 'https://starx4crm.com/forgot-password',
                  applicationCategory: 'BusinessApplication'
                })}
              </script>
            </div>
          </div>
        )
    }
  }

  OUTPUT: {
    component: "ForgotPasswordPage",
    type: "Server Component",
    features: [
      "Two-step password reset workflow",
      "Email submission and confirmation",
      "Security-focused token-based reset",
      "Account enumeration prevention",
      "JSON-LD schema for SEO"
    ]
  }

  VALIDATION: [
    "Email must be validated before submission",
    "Reset links must expire after set time",
    "Account enumeration must be prevented",
    "Success message must be shown regardless of email existence"
  ]
}
```

### Interface Signatures

```pseudo
INTERFACE ForgotPasswordPageProps {
  searchParams: {
    email?: string
    submitted?: boolean
  }
}

COMPONENT_SIGNATURE ForgotPasswordForm {
  PROPS: {}
  RETURNS: ReactElement
  CLIENT_COMPONENT: true
}

COMPONENT_SIGNATURE ForgotPasswordInstructions {
  PROPS: {
    email?: string
  }
  RETURNS: ReactElement
}
```

---

## Summary

This **Page Authentication Specialist** provides comprehensive pseudo-code workflows for:

1. **Pattern 10.26 (Settings Page)**: User account settings with categorized forms, parallel data fetching, and Suspense boundaries
2. **Pattern 10.31 (Login Page)**: Secure authentication with error handling, social auth, and callback URL support
3. **Pattern 10.32 (Register Page)**: User registration with email verification, step indicators, and terms acceptance
4. **Pattern 10.33 (Forgot Password)**: Two-step password reset workflow with secure token-based recovery

**Key Features**:
- Server Components with async data fetching
- Metadata API with noindex for auth pages
- Error handling with user-friendly messages
- Social authentication integration
- JSON-LD structured data for SEO
- Vietnamese/English bilingual support

**Technology Stack**: Next.js 15.3.0, React 19, TypeScript 5, Server Components
**Domain Context**: Vietnamese legal P2P insurance & lending platform
**Format**: Pseudo-code WORKFLOW format with interface signatures only

---

*Page Authentication Specialist v1.0*
*Created: 2026-01-02*
*Patterns 10.26, 10.31-10.33 Coverage*
