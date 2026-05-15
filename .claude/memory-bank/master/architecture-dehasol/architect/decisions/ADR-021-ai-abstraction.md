# ADR-021: AI Abstraction Layer

## Status
**DEFERRED** — Decision recorded; implementation triggers in Phase 3
**Last reviewed**: 2026-05-15

## Context

Phase 3 introduces AI features (5 features per Domain KB). Need abstraction layer between business modules and AI providers (Bedrock, embedding models, OCR).

Scope considerations:
- Small number of use cases (3-4 LLM use cases + OCR pipeline)
- Multi-LLM requirement (ADR-019 via Bedrock provides this within AWS)
- Future swap ability (Bedrock → direct API; or model swap within Bedrock)
- Vector retrieval abstraction (ADR-020 pgvector now, possibly OpenSearch later)

## Options

### Option A: Custom thin abstraction — Chosen
- ~500 LOC TypeScript service `AIGateway` with methods: `generate()`, `embed()`, `chat()`, `ocrExtract()`
- Maps to Bedrock SDK underneath
- Replace adapter to swap provider

### Option B: LangChain.js
- Rich ecosystem; chains, agents, prompt templates
- API breaking-change history
- Learning curve

### Option C: LlamaIndex.ts
- RAG-specialized
- Good for F7-05 chatbot, less fit for other use cases

### Option D: No abstraction (direct SDK calls)
- Simpler initially
- Coupling proliferates across business modules

## Decision (deferred, planned)

**Option A — Custom thin AI gateway**.

### Architecture

**Module location**: `src/modules/ai/`

**Interface (TypeScript)**:
```typescript
export interface AIGateway {
  // LLM text generation
  generate(opts: GenerateOpts): Promise<GenerateResult>;
  
  // Multi-turn chat
  chat(opts: ChatOpts): Promise<ChatResult>;
  chatStream(opts: ChatOpts): AsyncIterable<ChatChunk>;
  
  // Embedding (vector)
  embed(opts: EmbedOpts): Promise<EmbedResult>;
  
  // OCR (separate from LLM, uses Textract/Bedrock)
  extractFromDocument(opts: OCROpts): Promise<OCRResult>;
}

export interface GenerateOpts {
  useCase: 'quote-suggest' | 'chatbot' | 'forecast-summary';
  systemPrompt: string;
  userMessage: string;
  context?: string[];     // RAG context
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  costEstimateUSD: number;
}
```

**Implementation backing**: Bedrock SDK (`@aws-sdk/client-bedrock-runtime`)

**Per-useCase configuration**:
```typescript
// config/ai-models.ts
export const AI_MODEL_CONFIG = {
  'quote-suggest': { model: 'anthropic.claude-sonnet-4', maxTokens: 1024 },
  'chatbot':       { model: 'anthropic.claude-sonnet-4', maxTokens: 2048 },
  'embed':         { model: 'amazon.titan-embed-text-v2', dim: 1536 },
};
```

**Cross-cutting concerns**:
- Cost logging (every call) → `ai_call_logs` table
- Rate limiting (per-user, per-useCase)
- Prompt injection sanitization (utility function applied to user input before context insert)
- Retry on transient errors (Bedrock throttling)
- Circuit breaker if Bedrock unhealthy (return cached or graceful degradation)

**Vector retrieval interface**:
```typescript
export interface VectorStore {
  upsert(opts: { entity: 'project'|'quote'|'doc'; id: string; embedding: number[]; metadata: any }): Promise<void>;
  similaritySearch(opts: { entity: string; queryEmbedding: number[]; topK: number; filter?: any }): Promise<SimilarItem[]>;
}
```
Backing: pgvector (ADR-020); swap to OpenSearch by replacing adapter.

### Why not LangChain
- LangChain.js v0.1 → v0.2 had breaking changes within 6 months; trust low
- Our use cases simple (RAG retrieval + prompt → output); 500 LOC handles it
- LangChain overhead: huge dep tree, slower cold start, indirection

### When to revisit
- If Phase 3+ adds: tool calling agents, complex multi-step workflows, document chunking pipeline that justifies it
- If team has LangChain expertise and ROI clear

## Consequences

### Positive
- Full control over behavior, retries, logging
- Lean dependency tree (only AWS SDK)
- Easier to test (mock AIGateway interface)

### Negative
- Reinvent some primitives (prompt template helper, chunk splitter)
- No "community recipes" to copy/paste

### Phase 1 impact
- Module `ai/` exists as folder with placeholder `README.md` "Phase 3 implementation"
- No code, no infra in Phase 1
- Other modules MUST NOT import from `ai/` (architecture test enforces — ADR-001)

## References

- Assessment Q2.3
- Domain KB §7.3
- Related: ADR-019 (LLM Hosting), ADR-020 (Vector), ADR-001 (Module boundary)
