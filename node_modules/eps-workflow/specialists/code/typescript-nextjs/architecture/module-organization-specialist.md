# Module Organization Specialist

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: App Router

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **npm Package** | N/A (project-specific) |
| **Variant** | Next.js 16 App Router + TypeScript |
| **Pattern Numbers** | 63.1–63.3 |
| **Source Paths** | `src/presentation/ui/modules/` |
| **File Count** | 26 module directories, 100+ submodules |
| **Naming Convention** | `{code}_{name}/` for modules, `{subcode}_{action}/` for submodules |
| **Barrel Export** | Per-module `index.ts` |
| **Imports From** | Core: DI containers; Domain: entities |
| **Imported By** | App: `[application]/page.tsx` mapApplication imports |
| **Cannot Import** | `infrastructure/*` direct (use DI containers) |

---

## Description

All 26 feature modules live under `src/presentation/ui/modules/`. Each module follows a strict naming and directory convention. Within each module, features are split by sub-feature code with Container/Presentational separation.

---

## Key Concepts

### 63.1 — Module Naming Convention

```
{prefix}{code}_{feature_name}/
```

Examples:
- `cmn001000_customer_management/`
- `sfa001000_sales_target/`
- `tnt001000_tenant_management/`
- `cmn015000_workflow_designer/`

### 63.2 — Module Codes

| Prefix | Codes | Domain |
|--------|-------|--------|
| `cmn` | 001–015 | Common / shared features |
| `sfa` | 001–006 | Sales Force Automation |
| `tnt` | 001–003 | Tenant management |
| `ctm` | 001 | Customization / page builder |

### 63.3 — Sub-Feature CRUD Split

Each module is divided into sub-features by operation type:

```
cmn001000_customer_management/
  cmn001001_create_update/     # Create & edit form
    containers/                # Data logic (fetching, dispatch)
    blocks/                    # Presentational components
    hooks/                     # Local UI hooks
    index.ts
  cmn001002_list/              # List / search screen
    containers/
    blocks/
    hooks/
    index.ts
  cmn001003_detail/            # Read-only detail screen
    containers/
    blocks/
    hooks/
    index.ts
  shared/                      # Shared within module only
  index.ts                     # Module public API
```

---

## Code Examples

### Container vs. Presentational (Pattern 63.3)

```typescript
// containers/CustomerListContainer.tsx — handles data
export function CustomerListContainer() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);

  useEffect(() => {
    getCustomersFactory({ tenantKey, page: 0, size: 20 })
      .then((data) => dispatch(setCustomers(data)));
  }, []);

  return <CustomerListBlock customers={customers} />;
}

// blocks/CustomerListBlock.tsx — pure presentation
interface Props {
  customers: ICustomer[];
}
export function CustomerListBlock({ customers }: Props) {
  return (
    <Table dataSource={customers} rowKey="customerId" columns={columns} />
  );
}
```

### Module Index Export (Pattern 63.3)

```typescript
// cmn001000_customer_management/index.ts
export { CustomerListContainer } from './cmn001002_list/containers/CustomerListContainer';
export { CustomerDetailContainer } from './cmn001003_detail/containers/CustomerDetailContainer';
export { CustomerCreateUpdateContainer } from './cmn001001_create_update/containers/CustomerCreateUpdateContainer';
```

---

## Module Directory Inventory (26 directories)

| Code | Name | Submodules | Description |
|------|------|-----------|-------------|
| `cmn000000` | Common shared | — | Shared components |
| `cmn001000` | Customer | cmn001001_list, cmn001002_edit, cmn001003_detail | Customer CRUD |
| `cmn002000` | Category | cmn002001_list, cmn002002_edit | Category management |
| `cmn003000` | Customer Person | cmn003001_list, cmn003002_detail | Contact persons |
| `cmn004000` | Organization | cmn004001_list, cmn004002_detail | Organization mgmt |
| `cmn005000` | User/Permission | multiple submodules | User management |
| `cmn006000` | Function Org | submodules | Function organization |
| `cmn007000` | Schedule | cmn007001_list, cmn007002_calendar | Schedule & TODO |
| `cmn008000` | Team Role | submodules | Team role management |
| `cmn009000` | Mail | submodules | Email management |
| `cmn012000` | Information | submodules | Information/announcements |
| `cmn013000` | Dashboard | — | Dashboard screen |
| `cmn014000` | Report | — | Reports |
| `cmn015000` | Workflow | cmn015001_list, cmn015002_edit, cmn015003_run | Workflow designer |
| `ctm001000` | Page Builder | submodules | Dynamic page builder |
| `sfa001000` | Opportunity | sfa001001_list, sfa001002_edit, sfa001003_detail | Sales opportunities |
| `sfa002000` | Activity | submodules | Sales activities |
| `sfa003000` | Quotation | submodules | Quotation management |
| `sfa004000` | Lead | submodules | Lead management |
| `sfa005000` | Sales Target | submodules | Sales target tracking |
| `sfa006000` | Sales Report | — | Sales reporting |
| `tnt001000` | Tenant Reg | submodules | Tenant registration |
| `tnt002000` | Tenant Admin | submodules | Tenant administration |
| `tnt003000` | Tenant Setup | submodules | Tenant setup |
| `clients` | Client info | — | Client information |
| `screen` | Screen renderer | — | Dynamic screen rendering |

**Submodule pattern**: `{parentCode}/{subcode}_{action}/`
- Example: `cmn001000/cmn001001_list/` → Customer list submodule
- Each submodule has: `containers/`, `blocks/`, optionally `components/`

---

## Anti-Patterns

- Placing business logic inside `blocks/` components
- Sharing containers across different module codes
- Omitting sub-feature index files (breaks tree-shaking)
- Importing a sub-feature container directly from another module (use module index)

---

## Related Specialists

- `nextjs-clean-architecture-specialist.md` — Layer structure
- `frontend-di-specialist.md` — DI factory location
- `block-screen-specialist.md` — Block rendering inside modules
