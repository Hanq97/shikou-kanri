# API Contracts Generation

## Prerequisites (from detail.md router)
- DESIGN_SCOPE != "backend" (skip for backend-only)
- FDD document exists (API derived from FDD Section 5)
- needs_api_contracts flag from router Step 0.9.3

---

## Scope Guard

```pseudo
if DESIGN_SCOPE == "backend":
    display("API Contracts: Skipped (backend scope)")
    # Return to router
    STOP

if DESIGN_SCOPE == "frontend" and not needs_api_contracts:
    display("API Contracts: Skipped (no API indicators in BD)")
    # Return to router
    STOP
```

---

## Step 1: Load FDD Data Integration Section

```pseudo
fdd_file = find("documents/features/{feature_dir}/*-frontend-detail-design.md")
fdd_content = read_file(fdd_file)
api_section = extract_section(fdd_content, "## 5. Data Integration")

if api_section is None:
    display("Warning: FDD Section 5 (Data Integration) not found")
    display("API Contracts will be derived from full FDD content")
```

---

## Step 2: RAG - Load Existing API Patterns (non-blocking)

```pseudo
try:
    api_patterns = await rag.findByStereotype("Controller", { topK: 3 })
    api_arch = await rag.queryWithArchitecture(
        "api endpoints rest controller dto",
        { stereotype: "Controller", topK: 3 }
    )
except:
    api_patterns = []
    api_arch = []
    # Non-blocking: continue without RAG patterns
```

---

## Step 3: Derive API Contracts

From FDD Section 5 (Data Integration):
- **Screen data needs** -> GET endpoints
- **User actions** -> POST/PUT/DELETE endpoints
- **State mutations** -> Request/Response DTOs
- Use api_patterns for naming conventions + DTO structure consistency

**Derivation rules**:
- Every API endpoint in FDD Section 5.1 (API Endpoints Overview) -> complete contract
- Request/Response shapes from FDD Section 5.2 -> DTO definitions
- Error handling from FDD Section 5.4 -> Error response schemas
- React Query configuration from FDD Section 5.3 -> Cache/invalidation hints

---

## Step 4: Write API Contracts Document

```pseudo
api_file = f"documents/features/{feature_dir}/{feature}-BASE-api-contracts.md"
write_file(api_file, api_contracts_content)
display(f"Created: {api_file}")
```

**NO enforcement needed** - single-step derivation, not multi-agent process.

---

**NEXT**: Return to detail.md router for next micro-command.
- If DESIGN_SCOPE == "frontend": `detail/fdd-pseudo.md` is next
- If DESIGN_SCOPE == "fullstack": `detail/fdd-pseudo.md` is next

---
*detail/api-contract.md - API Contracts micro-command v1.0*
*Single-step derivation from FDD Section 5*
*No enforcement (not multi-agent)*
