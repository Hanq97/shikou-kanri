# ADR-019: LLM Hosting

## Status
**DEFERRED** — Decision recorded; implementation triggers in Phase 3
**Last reviewed**: 2026-05-15

## Context

Doc requires AI features (Phase 3):
- F2-06 AI 見積補助 (RAG-based similar quote suggestion)
- F7-03 AI 類似案件検索 (semantic project search)
- F7-04 受注トレンドAI分析 (forecast — possibly classic ML)
- F7-05 AI チャットボット (RAG Q&A)
- F7-06 OCR 見積書取込 (OCR — separate from LLM; uses Bedrock or Textract)

**Contradiction in doc**: "AI機能で利用する社内データはプライベート環境内で完結。外部送信なし。" + "マルチLLM対応 (Claude/GPT/Gemini)". Direct API calls to LLM providers technically "send data externally" — needs reconciliation.

## Options

### Option A: AWS Bedrock — Chosen
- API endpoint within AWS infrastructure; VPC endpoint available
- Data does not leave AWS network
- DPA + no-training agreements built into AWS service contract
- Available models in ap-northeast-1 (verify before Phase 3):
  - Anthropic Claude family (3.5 Sonnet, 4 series likely)
  - Meta Llama 3+
  - Amazon Titan (own embeddings)
  - Cohere Command

### Option B: Direct API to Anthropic/OpenAI/Google with DPA
- Data leaves AWS but to vetted vendor with DPA
- More model flexibility (latest models often hit direct API first)
- "Private" interpretation looser

### Option C: Self-host LLM (Llama 3 / Qwen) on EC2 GPU
- Data 100% in VPC
- Quality lower than Claude/GPT-4
- Cost: g5.xlarge ~$1/hr 24/7 = ~$700/m for inference; multi-instance higher
- Maintenance overhead: model updates, scaling, GPU sourcing

### Option D: Hybrid (embedding self-host + LLM via Bedrock)
- Embedding model (small) in VPC; LLM via Bedrock
- Balance cost / privacy / quality

## Decision (deferred, recorded)

**Option A — AWS Bedrock primary path**, with revisit gate before Phase 3 start.

### Revisit checklist (do before Phase 3 commitment)
1. ✅ Verify Bedrock model availability in ap-northeast-1 (Anthropic Claude esp.)
2. ✅ Confirm VPC endpoint pricing within budget
3. ✅ Test latency from app servers (target <2s p50 for chat reply)
4. ✅ Towa legal review of AWS DPA terms (data residency, no-training clause)
5. ✅ Re-evaluate Option C (self-host) if model quality of available Bedrock models insufficient

### Planned implementation (Phase 3)

**Infrastructure**:
- VPC endpoint for `bedrock-runtime.ap-northeast-1.amazonaws.com`
- IAM role: app role can invoke specific Bedrock model ARNs
- Cost guardrail: AWS Budget alert at $X/month; daily anomaly detection

**Model selection per use case**:
- F2-06 AI quote suggestion: Claude Sonnet (balance cost/quality)
- F7-05 AI chatbot: Claude Sonnet
- F7-03 similar search: embedding model (Titan Text Embeddings v2 or Cohere Embed)
- F7-04 forecast: classic ML (XGBoost/Prophet); LLM optional for interpretation

**Prompt engineering**:
- System prompts in repo `prompts/` directory, versioned
- Variables sanitized (prompt injection guard)
- Output validation against expected schema (JSON mode + retry)

**Cost tracking**:
- Per-call cost logged with user, use case, prompt size, response size
- Monthly report per use case
- User-facing rate limit (10 AI calls/user/day for chatbot start; tune based on usage)

### Multi-LLM "ベンダーロックイン回避" requirement
- Bedrock provides multi-vendor under 1 SDK (Anthropic + Meta + Amazon + Cohere)
- Custom AI gateway (ADR-021) abstracts model switching → no app code change to swap

## Consequences

### Positive
- "AI private" requirement satisfied (data stays in AWS)
- DPA + no-training built-in
- Multi-model accessible without leaving AWS

### Negative
- Bedrock pricing 5-15% premium vs direct API (acceptable for compliance benefit)
- Model availability lag vs direct vendor (e.g., latest Claude in Bedrock may be N-1 version for short period)
- Vendor lock-in to AWS Bedrock SDK (mitigate: AI gateway abstraction layer)

### Cost estimate Phase 3 (rough, monthly)
- Embeddings: ~1M tokens/m × $0.10/M = ~$0.10 (negligible)
- LLM chat (chatbot): assume 50 users × 5 queries/day × 1.5K tokens × 22 days = ~8M tokens × $3/M = ~$24
- LLM quote suggestion: assume 100 quotes/m × 2K tokens × $3/M = ~$0.60
- **Total Phase 3 AI inference baseline: ~$25-50/m** (very tractable)

## References

- Doc §4.5, §5.2 (multi-LLM requirement)
- Assessment Q2.1
- Domain KB §7.3
- Related: ADR-005 (AWS), ADR-020 (Vector DB), ADR-021 (AI Gateway)
