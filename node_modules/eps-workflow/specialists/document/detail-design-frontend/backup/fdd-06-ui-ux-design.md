# UI/UX Design Micro-Agent / UI/UX設計マイクロエージェント / Micro-Agent Thiết kế UI/UX

**Responsibility / 責任 / Trách nhiệm**: Generate UI component specifications, styling patterns, and responsive design
**Output Lines / 出力行数 / Số dòng đầu ra**: ~120-150 lines
**Dependencies / 依存関係 / Phụ thuộc**: Evidence file, SRS (UI requirements), BD (design system)
**Checkpoint / チェックポイント / Điểm kiểm tra**: C6

---

## Input Requirements / 入力要件 / Yêu cầu đầu vào

### Required Inputs / 必須入力 / Đầu vào bắt buộc

1. **Evidence File Path** - UI/UX requirements and mockups
2. **SRS File Path** - UI specifications and accessibility requirements
3. **Basic Design File Path** - Design system and styling approach

---

## Processing Logic / 処理ロジック / Logic xử lý

### Step 1-4: [Standard processing steps]

---

## Output Template / 出力テンプレート / Mẫu đầu ra

```markdown
## 6. UI/UX設計 / Thiết kế UI/UX (UI/UX Design)

### 6.1 テーマインターフェース / Giao diện Theme (Theme Interface)

```typescript
// Traceability: SRS-3.14, BD-4.14
interface Theme {
  colors: ColorPalette;                 // カラーパレット / Bảng màu
  typography: Typography;               // タイポグラフィ / Typography
  spacing: Spacing;                     // スペーシング / Khoảng cách
  breakpoints: Breakpoints;             // ブレークポイント / Điểm ngắt
  shadows: Shadows;                     // シャドウ / Bóng đổ
  borderRadius: BorderRadius;           // 角丸 / Bo góc
}

interface ColorPalette {
  primary: ColorShades;                 // プライマリ色 / Màu chính
  secondary: ColorShades;               // セカンダリ色 / Màu phụ
  neutral: ColorShades;                 // ニュートラル色 / Màu trung tính
  semantic: SemanticColors;             // セマンティック色 / Màu ngữ nghĩa
}

interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;                          // ベース色 / Màu cơ sở
  600: string;
  700: string;
  800: string;
  900: string;
}

interface SemanticColors {
  success: string;                      // 成功 / Thành công
  error: string;                        // エラー / Lỗi
  warning: string;                      // 警告 / Cảnh báo
  info: string;                         // 情報 / Thông tin
}
```

### 6.2 レスポンシブデザイン / Thiết kế Responsive (Responsive Design)

```typescript
// Traceability: SRS-3.15, BD-4.15
interface Breakpoints {
  xs: string;                           // 0px~ モバイル / Mobile
  sm: string;                           // 640px~ タブレット小 / Tablet nhỏ
  md: string;                           // 768px~ タブレット / Tablet
  lg: string;                           // 1024px~ デスクトップ / Desktop
  xl: string;                           // 1280px~ ワイドデスクトップ / Desktop rộng
  '2xl': string;                        // 1536px~ 超ワイド / Siêu rộng
}

interface ResponsiveProps<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}
```

### 6.3 タイポグラフィ / Typography

```typescript
// Traceability: SRS-3.16, BD-4.16
interface Typography {
  fontFamily: {
    sans: string;                       // サンセリフ / Sans-serif
    serif: string;                      // セリフ / Serif
    mono: string;                       // モノスペース / Monospace
  };
  fontSize: {
    xs: string;                         // 12px
    sm: string;                         // 14px
    base: string;                       // 16px
    lg: string;                         // 18px
    xl: string;                         // 20px
    '2xl': string;                      // 24px
    '3xl': string;                      // 30px
    '4xl': string;                      // 36px
  };
  fontWeight: {
    normal: number;                     // 400
    medium: number;                     // 500
    semibold: number;                   // 600
    bold: number;                       // 700
  };
  lineHeight: {
    tight: number;                      // 1.25
    normal: number;                     // 1.5
    relaxed: number;                    // 1.75
  };
}
```

### 6.4 アクセシビリティ / Khả năng Tiếp cận (Accessibility)

```typescript
// Traceability: SRS-3.17, BD-4.17
interface AccessibilityProps {
  'aria-label'?: string;                // ARIAラベル / Nhãn ARIA
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean;
  role?: string;                        // ARIAロール / Vai trò ARIA
  tabIndex?: number;                    // タブインデックス / Chỉ số tab
}

interface FocusableProps extends AccessibilityProps {
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  autoFocus?: boolean;                  // 自動フォーカス / Tự động focus
}
```

---

**Checkpoint C6 Validation / チェックポイントC6検証 / Xác thực điểm kiểm tra C6**: ✓
```

---

## Quality Checklist / 品質チェックリスト / Danh sách kiểm tra chất lượng

**Before Output / 出力前 / Trước khi xuất**:

1. [ ] Design system matches BD specifications
2. [ ] Accessibility requirements from SRS included
3. [ ] Responsive breakpoints defined
4. [ ] Bilingual format (≥60%)
5. [ ] No implementation code
6. [ ] Checkpoint C6 marker present

---

*Micro-Agent v1.0 - Part of EPS Migration Week 4*
*Created: 2025-12-20 01:45:05*
*Single Responsibility: UI/UX Design Interface Generation*
