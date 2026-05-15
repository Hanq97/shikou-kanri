# INDEX: LLM-VLM-Voice Services Specialists

**Navigation**: FastAPI Backend AI/ML Services
**Total Specialists**: 2
**Pattern Range**: 2.1-2.15
**Location**: `specialists/code/fastapi-react/backend/`

---

## Specialists Overview

### 1. Language & Vision Models
**File**: `backend/llm-vlm-specialist.md`
**Lines**: 692
**Patterns**: 2.1-2.9

**Capabilities**:
- Pattern 2.1: Multi-provider LLM routing (OpenAI, Anthropic, Gemini)
- Pattern 2.2: Streaming responses với SSE (Server-Sent Events)
- Pattern 2.3: Context window management & truncation
- Pattern 2.4: Vision model integration (GPT-4V, Gemini Vision)
- Pattern 2.5: Image preprocessing & optimization
- Pattern 2.6: Multi-modal prompting strategies
- Pattern 2.7: Token usage tracking & cost optimization
- Pattern 2.8: Response caching cho identical queries
- Pattern 2.9: Fallback mechanisms khi primary provider fails

**Key Services**:
- LLMService: Unified interface cho multiple providers
- VLMService: Vision-language model operations
- StreamingService: Real-time response streaming
- ContextManagerService: Token limit management
- CostTrackerService: Usage & billing monitoring

---

### 2. Voice Processing
**File**: `backend/voice-services-specialist.md`
**Lines**: 465
**Patterns**: 2.10-2.15

**Capabilities**:
- Pattern 2.10: Speech-to-Text (STT) với Whisper API
- Pattern 2.11: Text-to-Speech (TTS) với multiple voices
- Pattern 2.12: Audio preprocessing & noise reduction
- Pattern 2.13: Language detection & auto-translation
- Pattern 2.14: Voice activity detection (VAD)
- Pattern 2.15: Real-time audio streaming

**Key Services**:
- STTService: Transcription với timestamp alignment
- TTSService: Speech synthesis với voice cloning
- AudioProcessorService: Noise reduction, normalization
- LanguageDetectorService: Auto-detect spoken language
- VADService: Silence detection & segmentation
- StreamingAudioService: WebSocket-based real-time processing

---

## Integration Patterns

### Multi-Modal Pipeline
```python
# Image + Text → Vision Model → Response
WORKFLOW:
1. User uploads image + text prompt
2. VLMService.preprocess_image(image) → Optimized format
3. LLMService.call_vision_model(provider="gpt-4v", image, prompt)
4. StreamingService.stream_response() → Chunk-by-chunk
5. CostTrackerService.log_usage(tokens, provider)
```

### Voice + LLM Pipeline
```python
# Audio → STT → LLM → TTS → Audio
WORKFLOW:
1. STTService.transcribe(audio) → Text transcript
2. LanguageDetectorService.detect(text) → Language code
3. LLMService.chat_completion(text, context) → AI response
4. TTSService.synthesize(response, voice="alloy") → Audio
5. Return audio file hoặc stream
```

---

## Vietnamese Domain Context

### LLM/VLM Operations
- **Mô hình ngôn ngữ lớn**: Large language models (GPT, Claude, Gemini)
- **Mô hình thị giác**: Vision models (GPT-4V, Gemini Vision)
- **Luồng trả lời**: Streaming responses in real-time
- **Quản lý ngữ cảnh**: Context window management
- **Tối ưu chi phí**: Cost optimization strategies

### Voice Processing
- **Chuyển giọng nói thành văn bản**: Speech-to-text transcription
- **Chuyển văn bản thành giọng nói**: Text-to-speech synthesis
- **Nhận diện ngôn ngữ**: Language detection
- **Phát hiện hoạt động giọng nói**: Voice activity detection
- **Xử lý âm thanh**: Audio preprocessing & enhancement

---

## Usage Examples

### Example 1: Multi-Provider LLM Routing
```python
WORKFLOW:
1. User sends chat request
2. LLMService.select_provider(criteria):
   - IF priority == "cost" → Use Gemini
   - IF priority == "quality" → Use Claude
   - IF priority == "speed" → Use GPT-3.5
3. ContextManagerService.fit_to_window(context, max_tokens)
4. LLMService.chat_completion(provider, messages)
5. IF provider fails → Fallback to next provider
6. CostTrackerService.log(tokens, cost, provider)
7. CacheService.set(cache_key, response)
8. Return response
```

### Example 2: Vision Analysis Pipeline
```python
WORKFLOW:
1. User uploads product image
2. VLMService.preprocess_image(image):
   - Resize to max 2048px
   - Compress to <20MB
   - Convert to supported format
3. LLMService.call_vision_model(
     provider="gpt-4v",
     image=preprocessed,
     prompt="Phân tích sản phẩm này"
   )
4. StreamingService.stream_response() → Yield chunks
5. Return analysis results
```

### Example 3: Voice-to-Voice Conversation
```python
WORKFLOW:
1. User speaks into microphone
2. VADService.detect_speech(audio_stream) → Segments
3. STTService.transcribe(segment) → Text
4. LanguageDetectorService.detect(text) → "vi" (Vietnamese)
5. LLMService.chat_completion(text, context, lang="vi")
6. TTSService.synthesize(response, voice="vi-VN-male")
7. Return audio response
8. Log conversation to session
```

---

## Pattern Distribution

### LLM & VLM (2.1-2.9)
- Multi-provider routing & fallbacks
- Streaming response handling
- Context window optimization
- Vision model integration
- Image preprocessing pipelines
- Multi-modal prompting
- Token & cost tracking
- Response caching
- Error handling & retries

### Voice Services (2.10-2.15)
- Speech-to-text transcription
- Text-to-speech synthesis
- Audio preprocessing
- Language detection
- Voice activity detection
- Real-time streaming

---

## Related Specialists

**Core Services**:
- `core-services-specialist.md` - Metrics, monitoring
- `core-validation-specialist.md` - Input validation

**Embeddings**:
- `embeddings-providers-specialist.md` - Vector generation
- `embeddings-batch-specialist.md` - Batch processing

**Storage**:
- `backend/support-knowledge-storage-specialist.md` - Document storage
- `backend/support-session-cache-specialist.md` - Response caching

**Providers**:
- `llm-api-providers.md` - Provider-specific APIs
- `vlm-api-providers.md` - Vision provider APIs
- `llm-base-providers.md` - Base provider classes

---

## Provider Support Matrix

### LLM Providers
| Provider | Streaming | Vision | Max Context | Cost Tier |
|----------|-----------|--------|-------------|-----------|
| OpenAI GPT-4 | ✅ | ✅ | 128K | High |
| Anthropic Claude | ✅ | ✅ | 200K | High |
| Google Gemini | ✅ | ✅ | 1M | Medium |
| OpenAI GPT-3.5 | ✅ | ❌ | 16K | Low |

### Voice Providers
| Provider | STT | TTS | Languages | Real-time |
|----------|-----|-----|-----------|-----------|
| OpenAI Whisper | ✅ | ✅ | 50+ | ❌ |
| Google Cloud | ✅ | ✅ | 100+ | ✅ |
| Azure Speech | ✅ | ✅ | 75+ | ✅ |

---

## Migration Notes

**From**: `llm-vlm-voice-services-specialist.md` (1,080 lines)
**To**: 2 optimized specialists (1,157 lines total)
**Expansion**: +77 lines (+7.1%) - Added detailed examples
**Compliance**: 100% (all files ≤800 lines)

**Refactoring Date**: 2026-01-03
**Backup Location**: `.backups/group_5_batch2_20260103_002722/`

---

*Navigation Index for FastAPI AI/ML Services Specialists*
*EPS Framework v3.0 - Pseudo-code WORKFLOW format*
