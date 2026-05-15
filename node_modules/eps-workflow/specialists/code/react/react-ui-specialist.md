# React UI Component Library Specialist
**Version**: 1.0.0
**Technology**: shadcn/ui + Tailwind CSS 3.x + React 19
**Integration**: C# ASP.NET Core Backend
**Created**: 2025-12-31
**Specialist Type**: React Frontend - UI Components & Styling

---

## 🎯 SPECIALIST OVERVIEW

This specialist enforces shadcn/ui + Tailwind CSS patterns for:
- Component library setup (shadcn/ui)
- Utility-first styling with Tailwind CSS
- Responsive design and dark mode
- Accessible components (radix-ui primitives)
- Custom component variants
- Design system consistency

**shadcn/ui + Tailwind CSS** is the recommended UI approach for StarX4CRM (NO Material-UI, NO Bootstrap).

---

## 📋 UI PATTERNS (15 Total)

### Pattern 1: shadcn-ui-setup
**Category**: Setup
**Description**: Install and configure shadcn/ui with Tailwind CSS

```bash
# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui CLI
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... other color tokens
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

**Why This Pattern**:
- ✅ Copy-paste component code (not npm package)
- ✅ Full customization control
- ✅ TypeScript + Tailwind integration

---

### Pattern 2: button-variants
**Category**: Components
**Description**: Button component with variants using class-variance-authority

```typescript
// components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

```typescript
// Usage
import { Button } from '@/components/ui/button';

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="lg">Outline Large</Button>
<Button variant="ghost" size="icon"><Icons.X /></Button>
```

**Why This Pattern**:
- ✅ Type-safe variant system
- ✅ Consistent design tokens
- ✅ Composable with `asChild` prop

---

### Pattern 3: form-components
**Category**: Components
**Description**: Form components with shadcn/ui + React Hook Form

```typescript
// components/ui/form.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export { Form, FormItem, FormLabel, FormControl, FormMessage, FormField };
```

```typescript
// Usage
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function UserForm() {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

**Why This Pattern**:
- ✅ Automatic ARIA attributes
- ✅ Integrated with React Hook Form
- ✅ Accessible by default

---

### Pattern 4: responsive-design
**Category**: Styling
**Description**: Responsive breakpoints with Tailwind CSS

```typescript
// components/ResponsiveGrid.tsx
export function ResponsiveGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {items.map((item) => (
        <div key={item.id} className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
```

**Tailwind Breakpoints**:
- `sm` - 640px
- `md` - 768px
- `lg` - 1024px
- `xl` - 1280px
- `2xl` - 1536px

**Why This Pattern**:
- ✅ Mobile-first responsive design
- ✅ Consistent breakpoints
- ✅ No media query CSS

---

### Pattern 5: dark-mode
**Category**: Theming
**Description**: Dark mode with next-themes

```bash
npm install next-themes
```

```typescript
// components/theme-provider.tsx
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```typescript
// components/theme-toggle.tsx
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

**Why This Pattern**:
- ✅ System preference detection
- ✅ Smooth theme transitions
- ✅ CSS variable-based theming

---

### Pattern 6: dialog-modal
**Category**: Components
**Description**: Dialog/Modal component

```typescript
// components/ui/dialog.tsx (shadcn/ui)
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };
```

```typescript
// Usage
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete User</DialogTitle>
    </DialogHeader>
    <p>Are you sure you want to delete this user?</p>
    <div className="flex justify-end gap-4">
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </div>
  </DialogContent>
</Dialog>
```

**Why This Pattern**:
- ✅ Accessible (focus trap, ESC to close)
- ✅ Radix UI primitives
- ✅ Portal rendering

---

### Pattern 7: data-table
**Category**: Components
**Description**: Data table with sorting and filtering

```typescript
// components/DataTable.tsx
import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Type-safe columns
- ✅ Built-in sorting/filtering
- ✅ Headless UI library (@tanstack/react-table)

---

### Pattern 8: toast-notifications
**Category**: Components
**Description**: Toast notifications with sonner

```bash
npm install sonner
```

```typescript
// components/ui/toast.tsx
'use client';

import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border bg-background text-foreground',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
    />
  );
}
```

```typescript
// app/layout.tsx
import { Toaster } from '@/components/ui/toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

```typescript
// Usage
import { toast } from 'sonner';

toast.success('User created successfully!');
toast.error('Failed to create user');
toast.loading('Creating user...');
toast.promise(createUser(), {
  loading: 'Creating user...',
  success: 'User created!',
  error: 'Failed to create user',
});
```

**Why This Pattern**:
- ✅ Simple API
- ✅ Promise-based toasts
- ✅ Accessible

---

### Pattern 9: utility-classes
**Category**: Styling
**Description**: Common Tailwind utility patterns

```typescript
// Flexbox
<div className="flex items-center justify-between gap-4">

// Grid
<div className="grid grid-cols-3 gap-6">

// Spacing
<div className="p-6 m-4 space-y-4">

// Typography
<h1 className="text-3xl font-bold tracking-tight">

// Colors
<div className="bg-primary text-primary-foreground">

// Borders & Shadows
<div className="border rounded-lg shadow-sm">

// Hover & Focus
<button className="hover:bg-accent focus:ring-2 focus:ring-ring">

// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">

// Dark Mode
<div className="bg-white dark:bg-gray-900">
```

**Why This Pattern**:
- ✅ No custom CSS needed
- ✅ Consistent design system
- ✅ Responsive by default

---

### Pattern 10: cn-utility
**Category**: Utilities
**Description**: Class name utility with clsx and tailwind-merge

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```typescript
// Usage - Merge Tailwind classes correctly
import { cn } from '@/lib/utils';

<div className={cn(
  'px-4 py-2 rounded-md',
  variant === 'primary' && 'bg-blue-500 text-white',
  variant === 'secondary' && 'bg-gray-200 text-gray-900',
  className
)} />
```

**Why This Pattern**:
- ✅ Prevents class conflicts
- ✅ Conditional classes
- ✅ tailwind-merge resolves conflicts

---

### Pattern 11: card-component
**Category**: Components
**Description**: Card component for content containers

```typescript
// Usage
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
    <CardDescription>Manage your profile settings</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Name: John Doe</p>
    <p>Email: john@example.com</p>
  </CardContent>
  <CardFooter>
    <Button>Edit Profile</Button>
  </CardFooter>
</Card>
```

**Why This Pattern**:
- ✅ Consistent card layout
- ✅ Semantic structure
- ✅ Composable sections

---

### Pattern 12: dropdown-menu
**Category**: Components
**Description**: Dropdown menu component

```typescript
// Usage
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Why This Pattern**:
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Accessible (Radix UI)

---

### Pattern 13: skeleton-loading
**Category**: Loading States
**Description**: Skeleton loading placeholders

```typescript
// components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
```

```typescript
// Usage
<div className="space-y-4">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

**Why This Pattern**:
- ✅ Better perceived performance
- ✅ Consistent loading states
- ✅ Simple implementation

---

### Pattern 14: alert-component
**Category**: Components
**Description**: Alert component for messages

```typescript
// Usage
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Failed to create user. Please try again.
  </AlertDescription>
</Alert>
```

**Why This Pattern**:
- ✅ Consistent message display
- ✅ Semantic variants
- ✅ Icon support

---

### Pattern 15: badge-component
**Category**: Components
**Description**: Badge component for status indicators

```typescript
// Usage
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Inactive</Badge>
<Badge variant="outline">Draft</Badge>
```

**Why This Pattern**:
- ✅ Status indicators
- ✅ Consistent styling
- ✅ Multiple variants

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Material-UI
```typescript
// ❌ DON'T - Use Material-UI
import { Button } from '@mui/material';

// ✅ DO - Use shadcn/ui
import { Button } from '@/components/ui/button';
```

### ❌ NO Bootstrap
```html
<!-- ❌ DON'T - Use Bootstrap classes -->
<div class="container">
  <button class="btn btn-primary">Click</button>
</div>

<!-- ✅ DO - Use Tailwind classes -->
<div className="max-w-7xl mx-auto px-4">
  <Button variant="default">Click</Button>
</div>
```

### ❌ NO Inline Styles
```typescript
// ❌ DON'T - Inline styles
<div style={{ padding: '16px', backgroundColor: '#blue' }}>

// ✅ DO - Tailwind classes
<div className="p-4 bg-blue-500">
```

---

## ✅ BEST PRACTICES

1. **Use shadcn/ui Components** - Copy-paste, full control
2. **Utility-First Styling** - Tailwind CSS classes
3. **Dark Mode Support** - next-themes integration
4. **Responsive Design** - Mobile-first breakpoints
5. **Accessibility** - Radix UI primitives
6. **Design Tokens** - CSS variables for theming
7. **TypeScript** - Type-safe component props

---

## 🔗 INTEGRATION WITH C# BACKEND

shadcn/ui + Tailwind CSS handles frontend UI only. Backend integration uses:
- React Query for data fetching
- React Hook Form for forms
- Next.js API routes as BFF

---

**Integration**: Works with React Component, Hooks, Query, Form, Router Specialists
**Backend**: C# ASP.NET Core REST API
**Styling**: Tailwind CSS 3.x utility-first
**Components**: shadcn/ui (Radix UI primitives)
**Version**: shadcn/ui latest + Tailwind CSS 3.x
