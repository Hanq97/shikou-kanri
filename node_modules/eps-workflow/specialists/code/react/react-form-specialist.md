# React Form Management Specialist
**Version**: 1.0.0
**Technology**: React Hook Form 7.x + Zod 3.x + React 19
**Integration**: C# ASP.NET Core Backend
**Created**: 2025-12-31
**Specialist Type**: React Frontend - Form Management & Validation

---

## 🎯 SPECIALIST OVERVIEW

This specialist enforces React Hook Form patterns with Zod validation for:
- Form state management with React Hook Form
- Schema-based validation with Zod
- Type-safe form handling with TypeScript
- Complex form scenarios (nested objects, arrays, dynamic fields)
- File uploads and multipart forms
- Form submission to C# backend
- Error handling and display
- Accessibility (ARIA attributes)

**React Hook Form + Zod** is the recommended pattern for StarX4CRM forms (NO Formik, NO manual useState).

---

## 📋 FORM PATTERNS (20 Total)

### Pattern 1: basic-form-setup
**Category**: Basic Setup
**Description**: Basic form setup with React Hook Form

```typescript
// components/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    console.log('Form data:', data);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('Login successful');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <span role="alert" className="error">
            {errors.email.message}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && (
          <span role="alert" className="error">
            {errors.password.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `register()` connects inputs to form state
- ✅ Built-in validation with `required`, `pattern`, `minLength`
- ✅ `errors` object for validation errors
- ✅ `isSubmitting` for loading state

---

### Pattern 2: zod-schema-validation
**Category**: Validation
**Description**: Schema-based validation with Zod

```typescript
// lib/schemas/user-schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['User', 'Admin'], {
    errorMap: () => ({ message: 'Role must be User or Admin' }),
  }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
```

```typescript
// components/CreateUserForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, CreateUserFormData } from '@/lib/schemas/user-schema';

export function CreateUserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('User created successfully');
        reset(); // Reset form after successful submission
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="role">Role</label>
        <select id="role" {...register('role')}>
          <option value="">Select role</option>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
        </select>
        {errors.role && <span className="error">{errors.role.message}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Type-safe validation with Zod schema
- ✅ Automatic TypeScript types with `z.infer`
- ✅ Complex validation rules (regex, custom messages)
- ✅ `zodResolver` integrates Zod with React Hook Form

---

### Pattern 3: default-values
**Category**: Basic Setup
**Description**: Setting default values and edit mode

```typescript
// components/EditUserForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { updateUserSchema, UpdateUserFormData } from '@/lib/schemas/user-schema';

interface EditUserFormProps {
  userId: string;
}

export function EditUserForm({ userId }: EditUserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
  });

  // Load user data and set as default values
  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch(`/api/users/${userId}`);
      const user = await response.json();

      // Set default values
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
      });
    };

    fetchUser();
  }, [userId, reset]);

  const onSubmit = async (data: UpdateUserFormData) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('User updated successfully');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="role">Role</label>
        <select id="role" {...register('role')}>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
        </select>
        {errors.role && <span className="error">{errors.role.message}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Updating...' : 'Update User'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `reset()` sets default values from API
- ✅ Edit mode for existing records
- ✅ Pre-populate form fields

---

### Pattern 4: nested-objects
**Category**: Complex Forms
**Description**: Handling nested object structures

```typescript
// lib/schemas/profile-schema.ts
import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  address: z.object({
    street: z.string().min(5, 'Street is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  }),
  preferences: z.object({
    newsletter: z.boolean(),
    notifications: z.boolean(),
    theme: z.enum(['light', 'dark']),
  }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
```

```typescript
// components/ProfileForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, ProfileFormData } from '@/lib/schemas/profile-schema';

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      preferences: {
        newsletter: false,
        notifications: true,
        theme: 'light',
      },
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    console.log('Profile data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset>
        <legend>Personal Information</legend>

        <div>
          <label htmlFor="name">Name</label>
          <input id="name" {...register('name')} />
          {errors.name && <span className="error">{errors.name.message}</span>}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...register('email')} />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </div>
      </fieldset>

      <fieldset>
        <legend>Address</legend>

        <div>
          <label htmlFor="address.street">Street</label>
          <input id="address.street" {...register('address.street')} />
          {errors.address?.street && (
            <span className="error">{errors.address.street.message}</span>
          )}
        </div>

        <div>
          <label htmlFor="address.city">City</label>
          <input id="address.city" {...register('address.city')} />
          {errors.address?.city && (
            <span className="error">{errors.address.city.message}</span>
          )}
        </div>

        <div>
          <label htmlFor="address.state">State</label>
          <input id="address.state" {...register('address.state')} />
          {errors.address?.state && (
            <span className="error">{errors.address.state.message}</span>
          )}
        </div>

        <div>
          <label htmlFor="address.zipCode">ZIP Code</label>
          <input id="address.zipCode" {...register('address.zipCode')} />
          {errors.address?.zipCode && (
            <span className="error">{errors.address.zipCode.message}</span>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>Preferences</legend>

        <div>
          <label>
            <input type="checkbox" {...register('preferences.newsletter')} />
            Subscribe to newsletter
          </label>
        </div>

        <div>
          <label>
            <input type="checkbox" {...register('preferences.notifications')} />
            Enable notifications
          </label>
        </div>

        <div>
          <label htmlFor="preferences.theme">Theme</label>
          <select id="preferences.theme" {...register('preferences.theme')}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </fieldset>

      <button type="submit">Save Profile</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Nested object validation with Zod
- ✅ Dot notation for nested fields (`address.street`)
- ✅ Organized fieldsets for grouped data

---

### Pattern 5: dynamic-array-fields
**Category**: Complex Forms
**Description**: Dynamic array of fields (add/remove)

```typescript
// lib/schemas/order-schema.ts
import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0),
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type OrderFormData = z.infer<typeof orderSchema>;
```

```typescript
// components/OrderForm.tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, OrderFormData } from '@/lib/schemas/order-schema';

export function OrderForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: '',
      items: [{ productId: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = async (data: OrderFormData) => {
    console.log('Order data:', data);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('Order created successfully');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="customerName">Customer Name</label>
        <input id="customerName" {...register('customerName')} />
        {errors.customerName && (
          <span className="error">{errors.customerName.message}</span>
        )}
      </div>

      <fieldset>
        <legend>Order Items</legend>

        {fields.map((field, index) => (
          <div key={field.id} className="order-item">
            <div>
              <label htmlFor={`items.${index}.productId`}>Product ID</label>
              <input id={`items.${index}.productId`} {...register(`items.${index}.productId`)} />
              {errors.items?.[index]?.productId && (
                <span className="error">{errors.items[index]?.productId?.message}</span>
              )}
            </div>

            <div>
              <label htmlFor={`items.${index}.quantity`}>Quantity</label>
              <input
                id={`items.${index}.quantity`}
                type="number"
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
              />
              {errors.items?.[index]?.quantity && (
                <span className="error">{errors.items[index]?.quantity?.message}</span>
              )}
            </div>

            <div>
              <label htmlFor={`items.${index}.price`}>Price</label>
              <input
                id={`items.${index}.price`}
                type="number"
                step="0.01"
                {...register(`items.${index}.price`, { valueAsNumber: true })}
              />
              {errors.items?.[index]?.price && (
                <span className="error">{errors.items[index]?.price?.message}</span>
              )}
            </div>

            {fields.length > 1 && (
              <button type="button" onClick={() => remove(index)}>
                Remove Item
              </button>
            )}
          </div>
        ))}

        {errors.items && typeof errors.items.message === 'string' && (
          <span className="error">{errors.items.message}</span>
        )}

        <button
          type="button"
          onClick={() => append({ productId: '', quantity: 1, price: 0 })}
        >
          Add Item
        </button>
      </fieldset>

      <button type="submit">Create Order</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `useFieldArray` manages dynamic arrays
- ✅ `append()` adds new items
- ✅ `remove()` removes items
- ✅ Each field has unique `key={field.id}`

---

### Pattern 6: file-upload-single
**Category**: File Uploads
**Description**: Single file upload with validation

```typescript
// lib/schemas/avatar-schema.ts
import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const avatarSchema = z.object({
  avatar: z
    .instanceof(FileList)
    .refine((files) => files.length === 1, 'Avatar is required')
    .refine(
      (files) => files[0]?.size <= MAX_FILE_SIZE,
      'Max file size is 5MB'
    )
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
      'Only .jpg, .jpeg, .png and .webp formats are supported'
    ),
});

export type AvatarFormData = z.infer<typeof avatarSchema>;
```

```typescript
// components/AvatarUploadForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { avatarSchema, AvatarFormData } from '@/lib/schemas/avatar-schema';
import { useState } from 'react';

export function AvatarUploadForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AvatarFormData>({
    resolver: zodResolver(avatarSchema),
  });

  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: AvatarFormData) => {
    const formData = new FormData();
    formData.append('avatar', data.avatar[0]);

    try {
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData, // NO Content-Type header for multipart/form-data
      });

      if (response.ok) {
        console.log('Avatar uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="avatar">Upload Avatar</label>
        <input
          id="avatar"
          type="file"
          accept="image/*"
          {...register('avatar')}
          onChange={(e) => {
            register('avatar').onChange(e);
            handleFileChange(e);
          }}
        />
        {errors.avatar && <span className="error">{errors.avatar.message}</span>}
      </div>

      {preview && (
        <div>
          <img src={preview} alt="Avatar preview" style={{ maxWidth: '200px' }} />
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Uploading...' : 'Upload Avatar'}
      </button>
    </form>
  );
}
```

**C# Backend (ASP.NET Core)**:
```csharp
[HttpPost("avatar")]
public async Task<IActionResult> UploadAvatar(IFormFile avatar)
{
    if (avatar == null || avatar.Length == 0)
        return BadRequest("No file uploaded");

    var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
    if (!allowedTypes.Contains(avatar.ContentType))
        return BadRequest("Invalid file type");

    if (avatar.Length > 5 * 1024 * 1024)
        return BadRequest("File too large");

    var fileName = $"{Guid.NewGuid()}{Path.GetExtension(avatar.FileName)}";
    var filePath = Path.Combine("uploads", "avatars", fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await avatar.CopyToAsync(stream);
    }

    return Ok(new { fileName, url = $"/uploads/avatars/{fileName}" });
}
```

**Why This Pattern**:
- ✅ File validation with Zod (size, type)
- ✅ Preview before upload
- ✅ FormData for multipart/form-data
- ✅ C# IFormFile integration

---

### Pattern 7: file-upload-multiple
**Category**: File Uploads
**Description**: Multiple file upload

```typescript
// lib/schemas/documents-schema.ts
import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const documentsSchema = z.object({
  documents: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, 'At least one document is required')
    .refine((files) => files.length <= 5, 'Maximum 5 files allowed')
    .refine(
      (files) => Array.from(files).every((file) => file.size <= MAX_FILE_SIZE),
      'Each file must be less than 10MB'
    )
    .refine(
      (files) => Array.from(files).every((file) => ACCEPTED_DOC_TYPES.includes(file.type)),
      'Only PDF and Word documents are allowed'
    ),
});

export type DocumentsFormData = z.infer<typeof documentsSchema>;
```

```typescript
// components/DocumentsUploadForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentsSchema, DocumentsFormData } from '@/lib/schemas/documents-schema';

export function DocumentsUploadForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<DocumentsFormData>({
    resolver: zodResolver(documentsSchema),
  });

  const documents = watch('documents');

  const onSubmit = async (data: DocumentsFormData) => {
    const formData = new FormData();

    // Append multiple files
    Array.from(data.documents).forEach((file, index) => {
      formData.append(`documents`, file);
    });

    try {
      const response = await fetch('/api/users/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Documents uploaded successfully');
      }
    } catch (error) {
      console.error('Failed to upload documents:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="documents">Upload Documents (PDF, Word)</label>
        <input
          id="documents"
          type="file"
          accept=".pdf,.doc,.docx"
          multiple
          {...register('documents')}
        />
        {errors.documents && <span className="error">{errors.documents.message}</span>}
      </div>

      {documents && documents.length > 0 && (
        <div>
          <h4>Selected Files ({documents.length}):</h4>
          <ul>
            {Array.from(documents).map((file, index) => (
              <li key={index}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Uploading...' : 'Upload Documents'}
      </button>
    </form>
  );
}
```

**C# Backend**:
```csharp
[HttpPost("documents")]
public async Task<IActionResult> UploadDocuments(List<IFormFile> documents)
{
    if (documents == null || documents.Count == 0)
        return BadRequest("No files uploaded");

    if (documents.Count > 5)
        return BadRequest("Maximum 5 files allowed");

    var uploadedFiles = new List<string>();

    foreach (var file in documents)
    {
        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine("uploads", "documents", fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        uploadedFiles.Add(fileName);
    }

    return Ok(new { files = uploadedFiles });
}
```

**Why This Pattern**:
- ✅ Multiple file validation
- ✅ File count limits
- ✅ Individual file size validation
- ✅ List uploaded files before submit

---

### Pattern 8: dependent-fields
**Category**: Advanced Validation
**Description**: Conditional validation based on other fields

```typescript
// lib/schemas/shipping-schema.ts
import { z } from 'zod';

export const shippingSchema = z
  .object({
    shippingMethod: z.enum(['standard', 'express', 'pickup']),
    shippingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      zipCode: z.string().optional(),
    }),
    pickupLocation: z.string().optional(),
  })
  .refine(
    (data) => {
      // If shipping method is not pickup, address is required
      if (data.shippingMethod !== 'pickup') {
        return (
          data.shippingAddress.street &&
          data.shippingAddress.city &&
          data.shippingAddress.zipCode
        );
      }
      return true;
    },
    {
      message: 'Shipping address is required for standard and express shipping',
      path: ['shippingAddress'],
    }
  )
  .refine(
    (data) => {
      // If shipping method is pickup, pickup location is required
      if (data.shippingMethod === 'pickup') {
        return !!data.pickupLocation;
      }
      return true;
    },
    {
      message: 'Pickup location is required',
      path: ['pickupLocation'],
    }
  );

export type ShippingFormData = z.infer<typeof shippingSchema>;
```

```typescript
// components/ShippingForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shippingSchema, ShippingFormData } from '@/lib/schemas/shipping-schema';

export function ShippingForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingMethod: 'standard',
    },
  });

  const shippingMethod = watch('shippingMethod');

  const onSubmit = async (data: ShippingFormData) => {
    console.log('Shipping data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="shippingMethod">Shipping Method</label>
        <select id="shippingMethod" {...register('shippingMethod')}>
          <option value="standard">Standard Shipping</option>
          <option value="express">Express Shipping</option>
          <option value="pickup">Store Pickup</option>
        </select>
      </div>

      {shippingMethod !== 'pickup' && (
        <fieldset>
          <legend>Shipping Address</legend>

          <div>
            <label htmlFor="shippingAddress.street">Street</label>
            <input id="shippingAddress.street" {...register('shippingAddress.street')} />
          </div>

          <div>
            <label htmlFor="shippingAddress.city">City</label>
            <input id="shippingAddress.city" {...register('shippingAddress.city')} />
          </div>

          <div>
            <label htmlFor="shippingAddress.zipCode">ZIP Code</label>
            <input id="shippingAddress.zipCode" {...register('shippingAddress.zipCode')} />
          </div>

          {errors.shippingAddress && (
            <span className="error">{errors.shippingAddress.message}</span>
          )}
        </fieldset>
      )}

      {shippingMethod === 'pickup' && (
        <div>
          <label htmlFor="pickupLocation">Pickup Location</label>
          <select id="pickupLocation" {...register('pickupLocation')}>
            <option value="">Select location</option>
            <option value="store-1">Store 1 - Downtown</option>
            <option value="store-2">Store 2 - Uptown</option>
          </select>
          {errors.pickupLocation && (
            <span className="error">{errors.pickupLocation.message}</span>
          )}
        </div>
      )}

      <button type="submit">Submit</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `watch()` monitors field changes
- ✅ Conditional rendering based on field values
- ✅ Zod `refine()` for cross-field validation

---

### Pattern 9: async-validation
**Category**: Advanced Validation
**Description**: Async validation (check email uniqueness)

```typescript
// lib/schemas/register-schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8),
  name: z.string().min(2),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
```

```typescript
// components/RegisterForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '@/lib/schemas/register-schema';

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const checkEmailUniqueness = async (email: string): Promise<boolean> => {
    const response = await fetch(`/api/users/check-email?email=${email}`);
    const data = await response.json();
    return data.isAvailable;
  };

  const onSubmit = async (data: RegisterFormData) => {
    // Check email uniqueness before submission
    const isEmailAvailable = await checkEmailUniqueness(data.email);

    if (!isEmailAvailable) {
      setError('email', {
        type: 'manual',
        message: 'This email is already registered',
      });
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('Registration successful');
      } else {
        const error = await response.json();
        setError('root', {
          type: 'manual',
          message: error.message || 'Registration failed',
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: 'Network error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {errors.name && <span className="error">{errors.name.message}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <span className="error">{errors.email.message}</span>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      {errors.root && <div className="error">{errors.root.message}</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

**C# Backend**:
```csharp
[HttpGet("check-email")]
public async Task<IActionResult> CheckEmail([FromQuery] string email)
{
    var exists = await _context.Users.AnyAsync(u => u.Email == email);
    return Ok(new { isAvailable = !exists });
}
```

**Why This Pattern**:
- ✅ `setError()` sets manual errors
- ✅ Check backend before final submission
- ✅ Server-side validation for data integrity

---

### Pattern 10: error-handling-display
**Category**: Error Handling
**Description**: Comprehensive error display patterns

```typescript
// components/ErrorDisplay.tsx
import { FieldError, FieldErrors, Merge } from 'react-hook-form';

interface ErrorDisplayProps {
  error?: FieldError | Merge<FieldError, FieldErrors<any>>;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <span role="alert" className="error" aria-live="polite">
      {error.message?.toString()}
    </span>
  );
}
```

```typescript
// components/FormWithErrors.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorDisplay } from './ErrorDisplay';
import { userSchema, UserFormData } from '@/lib/schemas/user-schema';

export function FormWithErrors() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
    clearErrors,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Server-side validation errors
        if (error.errors) {
          Object.entries(error.errors).forEach(([field, message]) => {
            setError(field as keyof UserFormData, {
              type: 'manual',
              message: message as string,
            });
          });
        } else {
          setError('root.serverError', {
            type: 'manual',
            message: error.message || 'An error occurred',
          });
        }
      }
    } catch (error) {
      setError('root.networkError', {
        type: 'manual',
        message: 'Network error. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Global errors */}
      {errors.root?.serverError && (
        <div className="alert alert-error" role="alert">
          {errors.root.serverError.message}
        </div>
      )}

      {errors.root?.networkError && (
        <div className="alert alert-error" role="alert">
          {errors.root.networkError.message}
        </div>
      )}

      {/* Success message */}
      {isSubmitSuccessful && (
        <div className="alert alert-success" role="status">
          Form submitted successfully!
        </div>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          {...register('name')}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        <ErrorDisplay error={errors.name} />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        <ErrorDisplay error={errors.email} />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Field-level errors
- ✅ Global errors (root.serverError, root.networkError)
- ✅ Success state with `isSubmitSuccessful`
- ✅ Accessibility (ARIA attributes)

---

### Pattern 11: controlled-components
**Category**: Advanced Control
**Description**: Controlled components with `watch()` and `setValue()`

```typescript
// components/ControlledForm.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';

interface PriceFormData {
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  discount: number;
}

export function PriceForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PriceFormData>({
    defaultValues: {
      quantity: 1,
      pricePerUnit: 10,
      totalPrice: 10,
      discount: 0,
    },
  });

  const quantity = watch('quantity');
  const pricePerUnit = watch('pricePerUnit');
  const discount = watch('discount');

  // Auto-calculate total price
  useEffect(() => {
    const subtotal = quantity * pricePerUnit;
    const total = subtotal - (subtotal * discount) / 100;
    setValue('totalPrice', parseFloat(total.toFixed(2)));
  }, [quantity, pricePerUnit, discount, setValue]);

  const onSubmit = (data: PriceFormData) => {
    console.log('Price data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="quantity">Quantity</label>
        <input
          id="quantity"
          type="number"
          {...register('quantity', { valueAsNumber: true })}
        />
      </div>

      <div>
        <label htmlFor="pricePerUnit">Price per Unit ($)</label>
        <input
          id="pricePerUnit"
          type="number"
          step="0.01"
          {...register('pricePerUnit', { valueAsNumber: true })}
        />
      </div>

      <div>
        <label htmlFor="discount">Discount (%)</label>
        <input
          id="discount"
          type="number"
          {...register('discount', { valueAsNumber: true })}
        />
      </div>

      <div>
        <label htmlFor="totalPrice">Total Price ($)</label>
        <input
          id="totalPrice"
          type="number"
          step="0.01"
          {...register('totalPrice', { valueAsNumber: true })}
          readOnly
          className="read-only"
        />
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `watch()` monitors field values in real-time
- ✅ `setValue()` programmatically updates fields
- ✅ Auto-calculate derived values
- ✅ `valueAsNumber` for numeric inputs

---

### Pattern 12: password-confirmation
**Category**: Advanced Validation
**Description**: Password confirmation matching validation

```typescript
// lib/schemas/password-schema.ts
import { z } from 'zod';

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
```

```typescript
// components/ChangePasswordForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  ChangePasswordFormData,
} from '@/lib/schemas/password-schema';

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (response.ok) {
        console.log('Password changed successfully');
        reset();
      }
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="currentPassword">Current Password</label>
        <input
          id="currentPassword"
          type="password"
          {...register('currentPassword')}
          autoComplete="current-password"
        />
        {errors.currentPassword && (
          <span className="error">{errors.currentPassword.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="newPassword">New Password</label>
        <input
          id="newPassword"
          type="password"
          {...register('newPassword')}
          autoComplete="new-password"
        />
        {errors.newPassword && (
          <span className="error">{errors.newPassword.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm New Password</label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <span className="error">{errors.confirmPassword.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Password matching with Zod `refine()`
- ✅ Ensure new password != current password
- ✅ Strong password validation
- ✅ Proper `autoComplete` attributes

---

### Pattern 13: reset-form
**Category**: Form State Management
**Description**: Reset form to default values

```typescript
// components/ResetForm.tsx
'use client';

import { useForm } from 'react-hook-form';

interface UserFormData {
  name: string;
  email: string;
  role: string;
}

export function ResetForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, dirtyFields },
  } = useForm<UserFormData>({
    defaultValues: {
      name: '',
      email: '',
      role: 'User',
    },
  });

  const onSubmit = async (data: UserFormData) => {
    console.log('Form data:', data);
    // After successful submission, reset form
    reset();
  };

  const handleReset = () => {
    // Reset to default values
    reset();
  };

  const handleResetWithValues = () => {
    // Reset to specific values
    reset({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
        {dirtyFields.name && <span className="badge">Modified</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {dirtyFields.email && <span className="badge">Modified</span>}
      </div>

      <div>
        <label htmlFor="role">Role</label>
        <select id="role" {...register('role')}>
          <option value="User">User</option>
          <option value="Admin">Admin</option>
        </select>
        {dirtyFields.role && <span className="badge">Modified</span>}
      </div>

      <button type="submit">Submit</button>
      <button type="button" onClick={handleReset} disabled={!isDirty}>
        Reset to Default
      </button>
      <button type="button" onClick={handleResetWithValues}>
        Load Sample Data
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `reset()` clears form to defaults
- ✅ `reset(values)` sets new defaults
- ✅ `isDirty` checks if form modified
- ✅ `dirtyFields` tracks modified fields

---

### Pattern 14: submit-handler-optimistic
**Category**: Form Submission
**Description**: Optimistic UI update before server confirmation

```typescript
// components/OptimisticForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserFormData {
  name: string;
  email: string;
}

export function OptimisticForm() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UserFormData>();

  const [optimisticUser, setOptimisticUser] = useState<UserFormData | null>(null);
  const router = useRouter();

  const onSubmit = async (data: UserFormData) => {
    // 1. Optimistically update UI
    setOptimisticUser(data);

    try {
      // 2. Send to server
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // 3. Server confirmed - navigate away
        router.push('/users');
      } else {
        // 4. Server rejected - rollback optimistic update
        setOptimisticUser(null);
        alert('Failed to create user');
      }
    } catch (error) {
      // 5. Network error - rollback
      setOptimisticUser(null);
      console.error('Network error:', error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" {...register('name', { required: true })} />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" {...register('email', { required: true })} />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {optimisticUser && (
        <div className="optimistic-preview">
          <h3>Creating user...</h3>
          <p>Name: {optimisticUser.name}</p>
          <p>Email: {optimisticUser.email}</p>
        </div>
      )}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Instant UI feedback
- ✅ Rollback on server error
- ✅ Better perceived performance

---

### Pattern 15: custom-input-component
**Category**: Reusable Components
**Description**: Reusable form input component with React Hook Form

```typescript
// components/FormInput.tsx
import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="form-input">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} role="alert" className="error">
            {error.message}
          </span>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
```

```typescript
// Usage
'use client';

import { useForm } from 'react-hook-form';
import { FormInput } from '@/components/FormInput';

interface UserFormData {
  name: string;
  email: string;
}

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>();

  const onSubmit = (data: UserFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        label="Name"
        {...register('name', { required: 'Name is required' })}
        error={errors.name}
      />

      <FormInput
        label="Email"
        type="email"
        {...register('email', { required: 'Email is required' })}
        error={errors.email}
      />

      <button type="submit">Submit</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ Reusable form input with consistent styling
- ✅ Automatic ARIA attributes
- ✅ `forwardRef` for ref forwarding
- ✅ Cleaner form code

---

### Pattern 16: controller-custom-components
**Category**: Advanced Control
**Description**: `Controller` for third-party component integration

```typescript
// components/DatePicker.tsx (Third-party component example)
import { Controller, useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface EventFormData {
  eventName: string;
  eventDate: Date;
}

export function EventForm() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormData>({
    defaultValues: {
      eventDate: new Date(),
    },
  });

  const onSubmit = (data: EventFormData) => {
    console.log('Event data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="eventName">Event Name</label>
        <input id="eventName" {...register('eventName', { required: true })} />
        {errors.eventName && <span className="error">Event name is required</span>}
      </div>

      <div>
        <label>Event Date</label>
        <Controller
          name="eventDate"
          control={control}
          rules={{ required: 'Event date is required' }}
          render={({ field }) => (
            <DatePicker
              selected={field.value}
              onChange={(date) => field.onChange(date)}
              dateFormat="yyyy-MM-dd"
              minDate={new Date()}
            />
          )}
        />
        {errors.eventDate && <span className="error">{errors.eventDate.message}</span>}
      </div>

      <button type="submit">Create Event</button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `Controller` wraps third-party components
- ✅ Works with react-datepicker, react-select, etc.
- ✅ Full validation support

---

### Pattern 17: dirty-state-warning
**Category**: UX Enhancements
**Description**: Warn user before leaving with unsaved changes

```typescript
// components/UnsavedChangesWarning.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

interface FormData {
  name: string;
  email: string;
}

export function UnsavedChangesWarning() {
  const {
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>();

  // Warn before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitSuccessful) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, isSubmitSuccessful]);

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {isDirty && (
        <div className="alert alert-warning">
          You have unsaved changes. Please save before leaving.
        </div>
      )}

      <div>
        <label htmlFor="name">Name</label>
        <input id="name" {...register('name')} />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `isDirty` detects unsaved changes
- ✅ Browser confirms before page unload
- ✅ Better UX for long forms

---

### Pattern 18: debounced-validation
**Category**: Performance
**Description**: Debounce validation for expensive operations

```typescript
// components/DebouncedSearchForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

interface SearchFormData {
  searchTerm: string;
}

export function DebouncedSearchForm() {
  const { register, watch } = useForm<SearchFormData>();
  const [results, setResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchTerm = watch('searchTerm');

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 3) {
      setResults([]);
      return;
    }

    const debouncedSearch = debounce(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/search?q=${searchTerm}`);
        const data = await response.json();
        setResults(data.results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    debouncedSearch();

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm]);

  return (
    <div>
      <form>
        <div>
          <label htmlFor="searchTerm">Search</label>
          <input
            id="searchTerm"
            {...register('searchTerm')}
            placeholder="Type to search..."
          />
          {isSearching && <span>Searching...</span>}
        </div>
      </form>

      {results.length > 0 && (
        <ul>
          {results.map((result, index) => (
            <li key={index}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Why This Pattern**:
- ✅ Debounce reduces API calls
- ✅ Better performance for search/autocomplete
- ✅ `watch()` monitors input changes

---

### Pattern 19: multi-step-form
**Category**: Complex Forms
**Description**: Multi-step wizard form

```typescript
// components/MultiStepForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';

interface MultiStepFormData {
  // Step 1
  name: string;
  email: string;
  // Step 2
  company: string;
  position: string;
  // Step 3
  bio: string;
  agreeToTerms: boolean;
}

export function MultiStepForm() {
  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<MultiStepFormData>({
    mode: 'onBlur',
  });

  const [step, setStep] = useState(1);

  const nextStep = async () => {
    let fieldsToValidate: (keyof MultiStepFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ['name', 'email'];
    } else if (step === 2) {
      fieldsToValidate = ['company', 'position'];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data: MultiStepFormData) => {
    console.log('Final form data:', data);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('Profile created successfully');
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="progress-bar">
        Step {step} of 3
      </div>

      {step === 1 && (
        <div className="step">
          <h2>Personal Information</h2>

          <div>
            <label htmlFor="name">Name</label>
            <input id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <span className="error">{errors.name.message}</span>}
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>

          <button type="button" onClick={nextStep}>
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step">
          <h2>Professional Information</h2>

          <div>
            <label htmlFor="company">Company</label>
            <input
              id="company"
              {...register('company', { required: 'Company is required' })}
            />
            {errors.company && <span className="error">{errors.company.message}</span>}
          </div>

          <div>
            <label htmlFor="position">Position</label>
            <input
              id="position"
              {...register('position', { required: 'Position is required' })}
            />
            {errors.position && <span className="error">{errors.position.message}</span>}
          </div>

          <button type="button" onClick={prevStep}>
            Back
          </button>
          <button type="button" onClick={nextStep}>
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="step">
          <h2>Additional Details</h2>

          <div>
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" {...register('bio')} />
          </div>

          <div>
            <label>
              <input
                type="checkbox"
                {...register('agreeToTerms', {
                  required: 'You must agree to the terms',
                })}
              />
              I agree to the terms and conditions
            </label>
            {errors.agreeToTerms && (
              <span className="error">{errors.agreeToTerms.message}</span>
            )}
          </div>

          <button type="button" onClick={prevStep}>
            Back
          </button>
          <button type="submit">Submit</button>
        </div>
      )}
    </form>
  );
}
```

**Why This Pattern**:
- ✅ `trigger()` validates specific fields
- ✅ Step-by-step validation
- ✅ Form state persists across steps

---

### Pattern 20: accessibility-aria
**Category**: Accessibility
**Description**: Full accessibility with ARIA attributes

```typescript
// components/AccessibleForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useId } from 'react';

interface AccessibleFormData {
  username: string;
  email: string;
  password: string;
}

export function AccessibleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessibleFormData>();

  const formId = useId();
  const usernameId = `${formId}-username`;
  const emailId = `${formId}-email`;
  const passwordId = `${formId}-password`;

  const onSubmit = async (data: AccessibleFormData) => {
    console.log('Form data:', data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      aria-labelledby={`${formId}-title`}
      noValidate
    >
      <h2 id={`${formId}-title`}>Create Account</h2>

      <div className="form-field">
        <label htmlFor={usernameId}>
          Username
          <span aria-label="required">*</span>
        </label>
        <input
          id={usernameId}
          {...register('username', {
            required: 'Username is required',
            minLength: {
              value: 3,
              message: 'Username must be at least 3 characters',
            },
          })}
          aria-required="true"
          aria-invalid={errors.username ? 'true' : 'false'}
          aria-describedby={errors.username ? `${usernameId}-error` : undefined}
        />
        {errors.username && (
          <span id={`${usernameId}-error`} role="alert" className="error">
            {errors.username.message}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor={emailId}>
          Email
          <span aria-label="required">*</span>
        </label>
        <input
          id={emailId}
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
          aria-required="true"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? `${emailId}-error` : `${emailId}-hint`}
        />
        <span id={`${emailId}-hint`} className="hint">
          We'll never share your email
        </span>
        {errors.email && (
          <span id={`${emailId}-error`} role="alert" className="error">
            {errors.email.message}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor={passwordId}>
          Password
          <span aria-label="required">*</span>
        </label>
        <input
          id={passwordId}
          type="password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          })}
          aria-required="true"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={
            errors.password ? `${passwordId}-error` : `${passwordId}-hint`
          }
          autoComplete="new-password"
        />
        <span id={`${passwordId}-hint`} className="hint">
          Must be at least 8 characters
        </span>
        {errors.password && (
          <span id={`${passwordId}-error`} role="alert" className="error">
            {errors.password.message}
          </span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
```

**ARIA Attributes Used**:
- `aria-required` - Required field
- `aria-invalid` - Validation state
- `aria-describedby` - Link to error/hint
- `aria-label` - Screen reader label
- `aria-labelledby` - Form title
- `aria-busy` - Loading state
- `role="alert"` - Error announcement

**Why This Pattern**:
- ✅ Screen reader friendly
- ✅ Keyboard navigation
- ✅ WCAG 2.1 AA compliant
- ✅ Semantic HTML

---

## 🚫 PROHIBITED PATTERNS

### ❌ NO Formik
```typescript
// ❌ DON'T - Use Formik
import { Formik, Form, Field } from 'formik';

// ✅ DO - Use React Hook Form
import { useForm } from 'react-hook-form';
```

### ❌ NO Manual useState for Forms
```typescript
// ❌ DON'T - Manual useState
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [errors, setErrors] = useState({});

// ✅ DO - React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm();
```

### ❌ NO Unvalidated File Uploads
```typescript
// ❌ DON'T - No validation
<input type="file" onChange={handleFileUpload} />

// ✅ DO - Zod validation
const fileSchema = z.instanceof(FileList)
  .refine((files) => files[0]?.size <= MAX_SIZE)
  .refine((files) => ACCEPTED_TYPES.includes(files[0]?.type));
```

### ❌ NO Missing ARIA Attributes
```typescript
// ❌ DON'T - No accessibility
<input {...register('email')} />
{errors.email && <span>{errors.email.message}</span>}

// ✅ DO - Full ARIA attributes
<input
  {...register('email')}
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" role="alert">{errors.email.message}</span>
)}
```

---

## ✅ BEST PRACTICES

### 1. Always Use Zod Schemas
- Define schemas in separate files (`lib/schemas/`)
- Use `z.infer` for TypeScript types
- Centralize validation logic

### 2. Accessibility First
- Always include `<label>` with `htmlFor`
- Use ARIA attributes (`aria-invalid`, `aria-describedby`)
- Mark required fields (`aria-required`)
- Use `role="alert"` for errors

### 3. Error Handling
- Display field-level errors immediately
- Use global errors for API failures
- Show success state after submission

### 4. Performance
- Debounce expensive validations
- Use `mode: 'onBlur'` for better UX
- Lazy validate on submit

### 5. File Uploads
- Validate file size and type
- Use FormData for multipart/form-data
- Preview files before upload

### 6. Form State
- Use `isDirty` for unsaved changes warning
- Reset form after successful submission
- Disable submit button during submission

### 7. TypeScript
- Strict typing with interfaces
- `valueAsNumber` for numeric inputs
- Type form data with `z.infer`

---

## 🔗 INTEGRATION WITH C# BACKEND

### React Hook Form → C# DTO
```typescript
// React (Frontend)
const onSubmit = async (data: CreateUserFormData) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};
```

```csharp
// C# (Backend)
public record CreateUserDto(
    string Name,
    string Email,
    string Role,
    string Password
);

[HttpPost]
public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
{
    // Validation with FluentValidation
    var validator = new CreateUserDtoValidator();
    var validationResult = await validator.ValidateAsync(dto);

    if (!validationResult.IsValid)
    {
        return BadRequest(new { errors = validationResult.Errors });
    }

    // Create user logic
}
```

---

## 📚 QUICK REFERENCE

### React Hook Form Hooks
- `useForm()` - Main form hook
- `useFieldArray()` - Dynamic arrays
- `useWatch()` - Watch field values
- `useFormState()` - Form state
- `Controller` - Third-party components

### Form State Properties
- `errors` - Validation errors
- `isSubmitting` - Submission state
- `isSubmitSuccessful` - Success state
- `isDirty` - Modified state
- `dirtyFields` - Modified fields

### Form Methods
- `register()` - Connect input to form
- `handleSubmit()` - Submit handler
- `reset()` - Reset form
- `setValue()` - Set field value
- `trigger()` - Trigger validation
- `setError()` - Set manual error
- `clearErrors()` - Clear errors

### Zod Schema Methods
- `z.string()` - String validation
- `z.number()` - Number validation
- `z.boolean()` - Boolean validation
- `z.object()` - Object validation
- `z.array()` - Array validation
- `z.enum()` - Enum validation
- `z.refine()` - Custom validation
- `z.infer` - Extract TypeScript type

---

**Integration**: Works with React Component Specialist, React Query Specialist, React Router Specialist
**Backend**: C# ASP.NET Core REST API
**Validation**: Zod 3.x + FluentValidation (C#)
**Accessibility**: WCAG 2.1 AA Compliant
**Version**: React Hook Form 7.x
